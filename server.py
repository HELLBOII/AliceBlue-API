#!/usr/bin/env python3
"""
Alice Blue API Server
====================

A Flask API server that provides Alice Blue data to the Next.js frontend.
This server acts as a bridge between the frontend and the Alice Blue Python API.

Usage:
    python api-server.py

Requirements:
    pip install flask flask-cors flask-socketio requests
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests,json
import time
import threading
from datetime import datetime,timedelta
import sys
import os
from pya3 import Aliceblue, TransactionType, OrderType, ProductType

# -----------------------------
# Global Constants & Variables
# -----------------------------
TRACKED_ORDERS_FILE = 'tracked_orders.json'
TRACKED_LOCK = threading.Lock()

# Add the src directory to the path to import encryption utilities
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from utils.encryption import decrypt_alice_blue_accounts
    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False
    print("Warning: Encryption utilities not available. Running without decryption support.")

# Add the parent directory to the path to import pya3
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    ALICE_BLUE_AVAILABLE = True
except ImportError:
    ALICE_BLUE_AVAILABLE = False
    print("Warning: Alice Blue API not available. Running in mock mode.")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Create separate namespaces for different data types
market_data_namespace = '/market-data'
contracts_namespace = '/contracts'

# Configuration - Load from appsettings.json
def load_credentials():
    """Load USER_ID and API_KEY from appsettings.json Primary account"""
    try:
        with open('appsettings.json', 'r') as f:
            settings = json.load(f)
        
        # Check if settings are encrypted
        is_encrypted_settings = settings.get('IsEncrypted', False)
        alice_blue_accounts = settings.get('Settings', {}).get('AliceBlueAccounts', [])
        
        # Decrypt accounts if they are encrypted
        if is_encrypted_settings and ENCRYPTION_AVAILABLE and alice_blue_accounts:
            try:
                alice_blue_accounts = decrypt_alice_blue_accounts(alice_blue_accounts)
                print("Decrypted AliceBlue account credentials")
            except Exception as e:
                print(f"Error decrypting credentials: {e}")
                return None, None
        elif is_encrypted_settings and not ENCRYPTION_AVAILABLE:
            print("Warning: Settings are encrypted but decryption utilities are not available")
            return None, None
        
        # Find the Primary account
        primary_account = None
        for account in alice_blue_accounts:
            if account.get('Category') == 'Primary':
                primary_account = account
                break
        
        if primary_account:
            user_id = primary_account.get('UserId', '')
            api_key = primary_account.get('ApiKey', '')
            print(f"Loaded credentials from Primary account: {primary_account.get('Name', 'Unknown')}")
            return user_id, api_key
        else:
            print("No Primary account found in appsettings.json")
            return None, None
            
    except FileNotFoundError:
        print("appsettings.json not found, using default credentials")
        return None, None
    except Exception as e:
        print(f"Error loading credentials from appsettings.json: {e}")
        return None, None

# Load credentials from appsettings.json
USER_ID, API_KEY = load_credentials()

# Global variables
alice = None
session_id = None
is_connected = False
clients_connected = set()
websocket_running = False

# Store previous values for change calculation
previous_market_data = {
    'nifty50': {'price': 0, 'changePercent': 0},
    'niftyBank': {'price': 0, 'changePercent': 0}
}

# Global variables for contract data
contract_data = {}  # token -> {price, changePercent, previousPrice}
subscribed_contract_tokens = set()  # Set of subscribed contract tokens


def check_alice_blue_connection():
    """Check if Alice Blue is connected and try to reconnect if needed"""
    global is_connected
    
    if not ALICE_BLUE_AVAILABLE:
        return False
    
    if not is_connected:
        initialize_alice_blue()
    
    return is_connected

def handle_alice_blue_error():
    """Handle Alice Blue API errors consistently"""
    if not ALICE_BLUE_AVAILABLE:
        return jsonify({
            'error': 'Alice Blue API not available',
            'message': 'Please install pya3 library'
        }), 500
    
    if not is_connected:
        return jsonify({
            'error': 'Not connected to Alice Blue',
            'message': 'Please check your credentials and try again'
        }), 500
    
    return None

def reload_credentials():
    """Reload credentials from appsettings.json"""
    global USER_ID, API_KEY
    try:
        new_user_id, new_api_key = load_credentials()
        if new_user_id and new_api_key:
            USER_ID = new_user_id
            API_KEY = new_api_key
            print(f"Credentials reloaded: {USER_ID}")
            return True
        else:
            print("Failed to reload credentials")
            return False
    except Exception as e:
        print(f"Error reloading credentials: {e}")
        return False

def initialize_alice_blue():
    """Initialize Alice Blue connection"""
    global alice, session_id, is_connected
    
    if not ALICE_BLUE_AVAILABLE:
        print("Alice Blue API not available, using mock data")
        return
    
    try:
        alice = Aliceblue(user_id=USER_ID, api_key=API_KEY)
        session_response = alice.get_session_id()
        
        if session_response.get('stat') == 'Ok':
            session_id = session_response.get('sessionID')
            is_connected = True
            print(f"Connected to Alice Blue. Session ID: {session_id[:20]}...")
        else:
            print(f"Failed to connect to Alice Blue: {session_response}")
            is_connected = False
    except Exception as e:
        print(f"Error connecting to Alice Blue: {e}")
        is_connected = False

# Initialize connection on startup
initialize_alice_blue()


@app.route('/api/reload-credentials', methods=['POST'])
def reload_credentials_endpoint():
    """Reload credentials from appsettings.json and reconnect"""
    global alice, session_id, is_connected, websocket_running
    
    try:
        # Reload credentials
        if not reload_credentials():
            return jsonify({
                'success': False,
                'error': 'Failed to reload credentials',
                'message': 'Could not load credentials from appsettings.json'
            }), 400
        
        # Stop existing websocket if running
        if websocket_running:
            websocket_running = False
            print("Stopped existing WebSocket connection")
        
        # Reinitialize Alice Blue connection with new credentials
        initialize_alice_blue()
        
        if is_connected:
            # Restart websocket with new credentials
            start_aliceblue_websocket()
            
            return jsonify({
                'success': True,
                'message': 'Credentials reloaded and reconnected successfully',
                'user_id': USER_ID,
                'connected': is_connected
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to reconnect',
                'message': 'Credentials reloaded but failed to connect to Alice Blue'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to reload credentials',
            'message': str(e)
        }), 500



@app.route('/api/contracts/subscribe', methods=['POST'])
def subscribe_contracts():
    """Subscribe to contract tokens for real-time updates"""
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    
    try:
        data = request.get_json()
        contract_tokens = data.get('tokens', [])
        
        if not contract_tokens:
            return jsonify({'error': 'No tokens provided'}), 400
        
        # Convert to strings for consistency
        contract_tokens = [str(token) for token in contract_tokens]
        
        success = subscribe_to_contracts(contract_tokens)
        
        if success:
            return jsonify({
                'message': f'Successfully subscribed to {len(contract_tokens)} contracts',
                'subscribed_tokens': list(subscribed_contract_tokens)
            })
        else:
            return jsonify({
                'error': 'Failed to subscribe to contracts'
            }), 500
            
    except Exception as e:
        return jsonify({
            'error': 'Failed to subscribe to contracts',
            'message': str(e)
        }), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Fetch orders from AliceBlue"""
    # Early exit if AliceBlue has an error
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response

    try:
        orders = alice.order_data()
        return jsonify(orders)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch orders', 'message': str(e)}), 500


@app.route('/api/positions', methods=['GET'])
def get_positions():
    """Get positions"""
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    
    try:
        positions = alice.get_daywise_positions()
        return jsonify(positions)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch positions', 'message': str(e)}), 500

@app.route('/api/holdings', methods=['GET'])
def get_holdings():
    """Get holdings"""
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    
    try:
        holdings = alice.get_holding_positions()
        return jsonify(holdings)
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch holdings',
            'message': str(e)
        }), 500


@app.route('/api/funds', methods=['GET'])
def get_funds():
    """Get funds/balance"""
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    
    try:
        balance = alice.get_balance()        
        return jsonify(balance)
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch balance',
            'message': str(e)
        }), 500

@app.route('/api/profile', methods=['GET'])
def get_profile():
    """Get user profile (optimized and simplified)"""
    # Check for any initial error
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    try:
        profile = alice.get_profile()
        return jsonify(profile)
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch user profile',
            'message': str(e)
        }), 500

# Helper function to cancel all orders for a single account (with parallel processing)
def cancel_orders_for_account(alice, account_name):
    """Cancel all pending orders for a given account"""
    
    # Get pending orders
    try:
        orders = alice.order_data()
        pending_orders = [o for o in orders if o.get('Status') in {'pending', 'open', 'trigger pending'}]
    except:
        return {'success': False, 'message': 'Error fetching orders', 'successful': [], 'failed': []}
    
    if not pending_orders:
        return {'success': False, 'message': 'No pending orders', 'successful': [], 'failed': []}
    
    # Cancel orders
    successful, failed = [], []
    for order in pending_orders:
        order_id = order.get('Nstordno')
        symbol = order.get('Trsym', 'Unknown')
        
        if order_id and alice.cancel_order(order_id).get('stat') == 'Ok':
            successful.append({'account_name': account_name, 'order_id': order_id, 'symbol': symbol})
        else:
            failed.append({'account_name': account_name, 'order_id': order_id, 'symbol': symbol, 'error': 'Cancel failed'})
    
    success = len(successful) > 0
    message = f'Cancelled {len(successful)} order(s)'
    
    return {
        'success': success,
        'message': message,
        'successful': successful,
        'failed': failed
    }


# Helper function to square off positions for a single account (with parallel processing)
def square_off_positions_for_account(alice, account_name):
    """Square off all positions for a single account"""
    try:
        positions = alice.get_daywise_positions()
        
        if not positions:
            return {
                'success': True,
                'message': '0 positions to square off',
                'successful_square_offs': [],
                'failed_square_offs': []
            }

        # Filter positions to get only those with non-zero net quantity
        positions_data = []
        for pos in positions:
            try:
                bqty = float(pos.get('Bqty', 0))
                sqty = float(pos.get('Sqty', 0))
                net_qty = bqty - sqty
                if net_qty != 0:
                    positions_data.append(pos)
            except (ValueError, TypeError):
                # Skip positions with invalid quantity data
                continue
        
        # Check if there are any positions to square off after filtering
        if not positions_data:
            return {
                'success': True,
                'message': 'No positions to square off',
                'successful_square_offs': [],
                'failed_square_offs': []
            }
            
        
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def square_off_position(pos):
            """Square off a single position"""
            try:
                url = "https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/positionAndHoldings/sqrOofPosition"
                
                payload = [{
                    'exchSeg': pos.get('Exchangeseg'),
                    'pCode': pos.get('Pcode'),
                    'netQty': pos.get('Netqty'),
                    'tockenNo': pos.get('Token'),
                    'symbol': pos.get('Tsym')
                }]

                headers = {
                    "Authorization": f"Bearer {session_id}",
                    "Content-Type": "application/json"
                }

                response = requests.post(url, headers=headers, json=payload)

                if response.ok:
                    result_data = response.json()
                    return (True, {
                        'account_name': account_name,
                        'symbol': pos.get('Tsym'),
                        'quantity': pos.get('Netqty'),
                        'order_id': result_data.get('NOrdNo') if isinstance(result_data, dict) else 'Success'
                    })
                else:
                    return (False, {
                        'account_name': account_name,
                        'symbol': pos.get('Tsym'),
                        'error': f"HTTP {response.status_code}: {response.text}"
                    })
                
            except Exception as e:
                return (False, {
                    'account_name': account_name,
                    'symbol': pos.get('Tsym', 'Unknown'),
                    'error': str(e)
                })
        
        # Process positions in parallel
        successful, failed = [], []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(square_off_position, pos): pos for pos in positions_data}
            
            for future in as_completed(futures):
                is_success, data = future.result()
                (successful if is_success else failed).append(data)
        
        return {
            'success': len(successful) > 0,
            'message': f'Squared off {len(successful)} position(s)',
            'successful_square_offs': successful,
            'failed_square_offs': failed
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Squared off positions: 0',
            'successful_square_offs': [],
            'failed_square_offs': []
        }

# Helper function to place stop loss order
def place_sl_tl_orders(alice_instance, instrument, main_order_result, transaction_type, quantity, account_name, settings, data):
    """Place both stop loss and target orders after main order execution"""
    try:
        stop_loss_margin = settings.get('StopLossMargin', 1.0)  # Default 1% stop loss
        target_margin = settings.get('ProfitMargin', 2.0)        # Default 2% profit target
        main_price = data.get("price")
        sp_price = 0.50

        # For market orders, fetch LTP if price not provided
        if not main_price or main_price <= 0:
            try:
                scrip_info = alice_instance.get_scrip_info(instrument)
                main_price = float(scrip_info.get('LTP', 0))
                if main_price <= 0:
                    return {
                        'account_name': account_name,
                        'error': 'Unable to fetch valid LTP for order calculations',
                        'main_order_id': main_order_result.get('NOrdNo')
                    }
            except Exception as e:
                return {
                    'account_name': account_name,
                    'error': f'Failed to get LTP: {str(e)}',
                    'main_order_id': main_order_result.get('NOrdNo')
                }

        # Validate price
        if main_price <= 0:
            return {
                'account_name': account_name,
                'error': 'Main order price must be greater than 0',
                'main_order_id': main_order_result.get('NOrdNo')
            }

        # Calculate stop loss and target prices
        if transaction_type == 'B':  # Buy order
            stop_loss_price = main_price * (1 - stop_loss_margin / 100)
            target_price = main_price * (1 + target_margin / 100)
            sl_transaction_type = TransactionType.Sell
            target_transaction_type = TransactionType.Sell
        else:  # Sell order
            stop_loss_price = (main_price * (1 + stop_loss_margin / 100))
            target_price = main_price * (1 - target_margin / 100)
            sl_transaction_type = TransactionType.Buy
            target_transaction_type = TransactionType.Buy

        # --- Place Stop Loss Order ---
        stop_loss_result = alice_instance.place_order(
            transaction_type=sl_transaction_type,
            instrument=instrument,
            quantity=quantity,
            order_type=OrderType.StopLossLimit,
            product_type=ProductType.Intraday,
            price=stop_loss_price-sp_price,
            trigger_price=stop_loss_price
        )

        # --- Place Target Order ---
        target_result = alice_instance.place_order(
            transaction_type=target_transaction_type,
            instrument=instrument,
            quantity=quantity,
            order_type=OrderType.Limit,
            product_type=ProductType.Intraday,
            price=target_price
        )

        # --- Prepare combined response ---
        response = {
            'account_name': account_name,
            'main_order_id': main_order_result.get('NOrdNo'),
            'stop_loss_order': {
                'status': 'success' if stop_loss_result and stop_loss_result.get('stat') == 'Ok' else 'failed',
                'order_id': stop_loss_result.get('NOrdNo') if stop_loss_result else None,
                'price': stop_loss_price,
                'error': stop_loss_result.get('emsg') if stop_loss_result and stop_loss_result.get('stat') != 'Ok' else None
            },
            'target_order': {
                'status': 'success' if target_result and target_result.get('stat') == 'Ok' else 'failed',
                'order_id': target_result.get('NOrdNo') if target_result else None,
                'price': target_price,
                'error': target_result.get('emsg') if target_result and target_result.get('stat') != 'Ok' else None
            }
        }

        return response

    except Exception as e:
        return {
            'account_name': account_name,
            'error': str(e),
            'main_order_id': main_order_result.get('NOrdNo')
        }


@app.route('/api/place-order-primary', methods=['POST'])
def place_order_primary():
    """Place order on primary account only"""
    data = request.get_json() or {}

    # --- Load settings ---
    settings = json.load(open('appsettings.json'))['Settings']

    # --- Prepare order parameters ---
    exchange = data['exchange']
    symbol = data['trading_symbol']
    qty = int(data['quantity'])
    price = float(data.get('price', 0.0))
    transaction_type = TransactionType.Buy if data['transaction_type'] == 'B' else TransactionType.Sell
    is_market = data.get('executionType') == 'Market'
    order_type = OrderType.Market if is_market else OrderType.Limit

    # --- Get instrument ---
    instrument = alice.get_instrument_by_symbol(exchange, symbol)


    # --- Place main order (with error handling) ---
    try:    
        result = alice.place_order(
            transaction_type=transaction_type,
            instrument=instrument,
            quantity=qty,
            order_type=order_type,
            product_type=ProductType.Intraday,
            price=price
        )

        if result and result.get('stat') == 'Ok':
            # --- Success response base ---
            response = {
                'success': True,
                'order_id': result.get('NOrdNo'),
                'account_name': 'Primary Account',
                'message': 'Order placed successfully on Primary Account'
            }

            # --- Handle stop loss / target logic ---
            if is_market:
                sl_tl_result = place_sl_tl_orders(
                    alice, instrument, result, data['transaction_type'], qty,
                    'Primary Account', settings, data
                )
                if 'error' in sl_tl_result:
                    response['stop_loss_error'] = sl_tl_result['error']
                else:
                    response['stop_loss_orders'] = sl_tl_result
                    response['message'] += ' with Stop Loss & Target orders'

            return jsonify(response), 200
        else:
            return jsonify({'success': False, 'error': result.get('emsg')}), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/place-order-all', methods=['POST'])
def place_order_all():
    """Optimized: Place order on all connected accounts"""
    try:
        data = request.get_json() or {}
        exchange = data['exchange']
        symbol = data['trading_symbol']
        quantity = int(data['quantity'])
        price = float(data.get('price', 0.0))
        transaction_type = TransactionType.Buy if data['transaction_type'] == 'B' else TransactionType.Sell
        is_market = data.get('executionType') == 'Market'
        order_type = OrderType.Market if is_market else OrderType.Limit

        instrument = alice.get_instrument_by_symbol(exchange, symbol)
    except (KeyError, ValueError) as e:
        return jsonify({'success': False, 'error': f'Invalid input: {e}'}), 400

    with open('appsettings.json', 'r') as f:
        GLOBAL_SETTINGS = json.load(f)['Settings']

    # Decrypt accounts once
    GLOBAL_ACCOUNTS = decrypt_alice_blue_accounts(GLOBAL_SETTINGS['AliceBlueAccounts'])


    # -------------------------------
    # Internal function for one account
    # -------------------------------
    def place_order(account):
        name = account.get('Name', 'Unknown')
        try:
            ab = Aliceblue(user_id=account['UserId'], api_key=account['ApiKey'])

            # Reuse cached session if possible
            try:
                sess = ab.get_session_id()
                if sess.get('stat') != 'Ok':
                    return {'account_name': name, 'success': False, 'error': 'Session failed'}
            except Exception as e:
                return {'account_name': name, 'success': False, 'error': f'Session error: {e}'}

            # Place the main order
            result = ab.place_order(
                transaction_type=transaction_type,
                instrument=instrument,
                quantity=quantity,
                order_type=order_type,
                product_type=ProductType.Intraday,
                price=price
            )

            # -------------------
            # Process result
            # -------------------
            if result and result.get('stat') == 'Ok':
                response = {
                    'success': True,
                    'order_id': result.get('NOrdNo'),
                    'account_name': name,
                    'message': f'Order placed successfully on {name}'
                }

                # Optional stop loss & target logic
                if is_market:
                    try:
                        sl_tl_result = place_sl_tl_orders(
                            ab, instrument, result, data['transaction_type'], quantity,
                            name, GLOBAL_SETTINGS, data
                        )
                        if 'error' in sl_tl_result:
                            response['stop_loss_error'] = sl_tl_result['error']
                        else:
                            response['stop_loss_orders'] = sl_tl_result
                            response['message'] += ' with Stop Loss & Target orders'
                    except Exception as e:
                        response['stop_loss_error'] = str(e)

                return response
            else:
                return {
                    'account_name': name,
                    'success': False,
                    'error': result.get('emsg', 'Order failed')
                }

        except Exception as e:
            return {'account_name': name, 'success': False, 'error': str(e)}

    # -------------------------------
    # Execute orders in parallel
    # -------------------------------
    from concurrent.futures import ThreadPoolExecutor, as_completed
    successful_orders, failed_orders = [], []
    with ThreadPoolExecutor(max_workers=min(8, len(GLOBAL_ACCOUNTS))) as executor:
        futures = {executor.submit(place_order, acc): acc for acc in GLOBAL_ACCOUNTS}
        for future in as_completed(futures):
            result = future.result()
            (successful_orders if result.get('success', False) else failed_orders).append(result)

    # -------------------------------
    # Final API response
    # -------------------------------
    if successful_orders:
        return jsonify({
            'success': True,
            'message': f"Orders placed on {len(successful_orders)}/{len(GLOBAL_ACCOUNTS)} account(s)",
            'successful_orders': successful_orders,
            'failed_orders': failed_orders
        })
    else:
        return jsonify({
            'success': False,
            'error': 'All orders failed',
            'failed_orders': failed_orders
        }), 400

@app.route('/api/cancel-order', methods=['POST'])
def cancel_order():
    """Cancel an order"""
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Invalid request data',
                'message': 'Order data is required'
            }), 400
        
        order_id = data.get('orderId')
        if not order_id:
            return jsonify({
                'error': 'Order ID required',
                'message': 'Order ID is required to cancel an order'
            }), 400
        
        # Cancel order using Alice Blue API
        result = alice.cancel_order(order_id)
        
        if result.get('stat') == 'Ok':
            return jsonify({
                'success': True,
                'message': 'Order cancelled successfully'
            })
        else:
            return jsonify({
                'error': 'Order cancellation failed',
                'message': result.get('emsg', 'Unknown error')
            }), 400
    except Exception as e:
        return jsonify({
            'error': 'Failed to cancel order',
            'message': str(e)
        }), 500



@app.route('/api/comprehensive-square-off', methods=['POST'])
def comprehensive_square_off():
    """Comprehensive square off: Cancel orders -> Square off positions"""
    try:
        data = request.get_json() or {}
        account_mode = data.get('account_mode', 'primary')
        
        # Load accounts
        try:
            with open('appsettings.json', 'r') as f:
                settings_data = json.load(f)
                accounts = settings_data['Settings']['AliceBlueAccounts']
                
                # Decrypt accounts if they are encrypted
                is_encrypted_settings = settings_data.get('IsEncrypted', False)
                if is_encrypted_settings and ENCRYPTION_AVAILABLE and accounts:
                    try:
                        accounts = decrypt_alice_blue_accounts(accounts)
                        print("Decrypted AliceBlue account credentials for comprehensive square off")
                    except Exception as e:
                        print(f"Error decrypting credentials for comprehensive square off: {e}")
                        return jsonify({'success': False, 'error': 'Failed to decrypt account credentials'}), 500
                elif is_encrypted_settings and not ENCRYPTION_AVAILABLE:
                    return jsonify({'success': False, 'error': 'Settings are encrypted but decryption utilities are not available'}), 500
        except:
            return jsonify({'success': False, 'error': 'Failed to load account settings'}), 500

        # Select accounts based on mode
        accounts_to_use = [acc for acc in accounts if acc.get('Category') == 'Primary'] if account_mode == 'primary' else accounts
        if not accounts_to_use:
            return jsonify({'success': False, 'error': 'No accounts available'}), 400

        # Initialize results
        results = {
            'step1_cancel_orders': {'success': False, 'message': '', 'details': []},
            'step2_auto_square_off': {'success': False, 'message': '', 'details': []}
        }

        # STEP 1: Cancel orders
        if account_mode == 'primary':
            cancel_result = cancel_orders_for_account(alice, 'Primary Account')
            results['step1_cancel_orders'] = {
                'success': cancel_result['success'],
                'message': cancel_result['message'],
                'details': cancel_result['successful_cancellations'] + cancel_result['failed_cancellations']
            }
        else:
            # Process all accounts in parallel
            import concurrent.futures
            
            def process_account_cancel(account):
                try:
                    account_alice = Aliceblue(user_id=account.get('UserId'), api_key=account.get('ApiKey'))
                    if account_alice.get_session_id().get('stat') == 'Ok':
                        return cancel_orders_for_account(account_alice, account.get('Name', 'Unknown'))
                    else:
                        return {'success': False, 'message': 'Session failed', 'successful_cancellations': [], 'failed_cancellations': []}
                except Exception as e:
                    return {'success': False, 'message': str(e), 'successful_cancellations': [], 'failed_cancellations': []}
            
            successful_cancellations = []
            failed_cancellations = []
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(process_account_cancel, account) for account in accounts_to_use]
                
                for future in concurrent.futures.as_completed(futures):
                    result = future.result()
                    successful_cancellations.extend(result['successful_cancellations'])
                    failed_cancellations.extend(result['failed_cancellations'])
            
            results['step1_cancel_orders'] = {
                'success': len(successful_cancellations) > 0 or len(failed_cancellations) == 0,
                'message': f'Cancelled {len(successful_cancellations)} order(s)' if successful_cancellations else 'No orders to cancel',
                'details': successful_cancellations + failed_cancellations
            }
        
        # STEP 2: Square off positions
        if account_mode == 'primary':
            square_off_result = square_off_positions_for_account(alice, 'Primary Account')
            results['step2_auto_square_off'] = {
                'success': square_off_result['success'],
                'message': square_off_result['message'],
                'details': square_off_result['successful_square_offs'] + square_off_result['failed_square_offs']
            }
        else:
            # Process all accounts in parallel
            def process_account_square_off(account):
                try:
                    account_alice = Aliceblue(user_id=account.get('UserId'), api_key=account.get('ApiKey'))
                    if account_alice.get_session_id().get('stat') == 'Ok':
                        return square_off_positions_for_account(account_alice, account.get('Name', 'Unknown'))
                    else:
                        return {'success': False, 'message': 'Session failed', 'successful_square_offs': [], 'failed_square_offs': []}
                except Exception as e:
                    return {'success': False, 'message': str(e), 'successful_square_offs': [], 'failed_square_offs': []}
            
            successful_square_offs = []
            failed_square_offs = []
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(process_account_square_off, account) for account in accounts_to_use]
                
                for future in concurrent.futures.as_completed(futures):
                    result = future.result()
                    successful_square_offs.extend(result['successful_square_offs'])
                    failed_square_offs.extend(result['failed_square_offs'])
            
            results['step2_auto_square_off'] = {
                'success': len(successful_square_offs) > 0,
                'message': f'Squared off {len(successful_square_offs)} position(s)' if successful_square_offs else 'No positions to square off',
                'details': successful_square_offs + failed_square_offs
            }

        # Return results
        overall_success = results['step1_cancel_orders']['success'] and results['step2_auto_square_off']['success']
        
        return jsonify({
            'success': overall_success,
            'message': 'Comprehensive square off completed',
            'steps': results,
            'summary': {
                'orders_cancelled': len(results['step1_cancel_orders']['details']),
                'positions_squared_off': len(results['step2_auto_square_off']['details'])
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/trade-book', methods=['GET'])
def get_trade_book():
    """Get trade book (trade history)"""
    error_response = handle_alice_blue_error()
    if error_response:
        return error_response
    
    try:
        # Get trade book from Alice Blue API
        result = alice.get_trade_book()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch trade book',
            'message': str(e)
        }), 500


# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    try:
        clients_connected.add(request.sid)
        
        emit('connected', {
            'message': 'Connected to real-time data stream',
            'timestamp': int(time.time() * 1000),
            'server_time': datetime.now().isoformat()
        })
        
        # Send initial market data if available
        if previous_market_data['nifty50']['price'] > 0:
            initial_data = {
                'type': 'market_data',
                'data': previous_market_data,
                'timestamp': int(time.time() * 1000)
            }
            emit('market_data_update', initial_data)
            
    except Exception as e:
        emit('error', {
            'type': 'connection_error',
            'message': 'Failed to establish connection',
            'timestamp': int(time.time() * 1000)
        })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    try:
        clients_connected.discard(request.sid)
    except Exception as e:
        pass

@socketio.on('ping')
def handle_ping():
    """Handle ping from client"""
    try:
        emit('pong', {'timestamp': int(time.time() * 1000)})
    except Exception as e:
        pass

@socketio.on('pong')
def handle_pong():
    """Handle pong from client"""
    try:
        # Client is alive, no action needed
        pass
    except Exception as e:
        pass

@socketio.on('subscribe_market_data')
def handle_subscribe_market_data():
    """Handle market data subscription"""
    try:
        emit('subscribed', {
            'type': 'market_data', 
            'message': 'Subscribed to market data updates',
            'timestamp': int(time.time() * 1000)
        })
    
    # Send current market data immediately
        current_data = {
            'type': 'market_data',
            'data': {
                'nifty50': {
                    'price': previous_market_data['nifty50']['price'],
                    'change': previous_market_data['nifty50']['change'],
                    'changePercent': previous_market_data['nifty50']['changePercent']
                },
                'niftyBank': {
                    'price': previous_market_data['niftyBank']['price'],
                    'change': previous_market_data['niftyBank']['change'],
                    'changePercent': previous_market_data['niftyBank']['changePercent']
                }
            },
            'timestamp': int(time.time() * 1000)
        }
        emit('market_data_update', current_data)
    except Exception as e:
        emit('error', {
            'type': 'subscription_error',
            'message': 'Failed to subscribe to market data',
            'timestamp': int(time.time() * 1000)
        })

@socketio.on('unsubscribe_market_data')
def handle_unsubscribe_market_data():
    """Handle market data unsubscription"""
    try:
        emit('unsubscribed', {
            'type': 'market_data',
            'message': 'Unsubscribed from market data updates',
            'timestamp': int(time.time() * 1000)
        })
    except Exception as e:
        pass

@socketio.on('subscribe_contracts')
def handle_subscribe_contracts():
    """Handle contract data subscription"""
    try:
        emit('subscribed', {
            'type': 'contracts', 
            'message': 'Subscribed to contract updates',
            'timestamp': int(time.time() * 1000)
        })
        
        # Send current contract data immediately if available
        try:
            if contract_data:
                contract_updates = {}
                for token, data in contract_data.items():
                    if data['price'] > 0:  # Only send contracts with valid prices
                        contract_updates[token] = {
                            'price': data['price'],
                            'change': data['change'],
                            'changePercent': data['changePercent']
                        }
                
                if contract_updates:
                    update_data = {
                        'type': 'contract_updates',
                        'data': contract_updates,
                        'timestamp': int(time.time() * 1000)
                    }
                    emit('contract_updates', update_data)
        except Exception as e:
            pass
            
    except Exception as e:
        emit('error', {
            'type': 'subscription_error',
            'message': 'Failed to subscribe to contract data',
            'timestamp': int(time.time() * 1000)
        })

@socketio.on('unsubscribe_contracts')
def handle_unsubscribe_contracts():
    """Handle contract data unsubscription"""
    try:
        emit('unsubscribed', {
            'type': 'contracts',
            'message': 'Unsubscribed from contract updates',
            'timestamp': int(time.time() * 1000)
        })
    except Exception as e:
        pass

# =============================================================================
# SEPARATE WEBSOCKET NAMESPACES FOR BETTER PERFORMANCE
# =============================================================================

# Market Data Namespace
@socketio.on('connect', namespace=market_data_namespace)
def handle_market_data_connect():
    """Handle market data WebSocket connection"""
    clients_connected.add(request.sid)
    emit('connected', {'message': 'Connected to market data stream'})

@socketio.on('disconnect', namespace=market_data_namespace)
def handle_market_data_disconnect():
    """Handle market data WebSocket disconnection"""
    clients_connected.discard(request.sid)

@socketio.on('ping', namespace=market_data_namespace)
def handle_market_data_ping():
    """Handle ping from client"""
    try:
        emit('pong', {'timestamp': int(time.time() * 1000)})
    except Exception as e:
        pass

@socketio.on('subscribe_market_data', namespace=market_data_namespace)
def handle_market_data_subscription():
    """Handle market data subscription"""
    try:
        emit('subscribed', {
            'type': 'market_data',
            'message': 'Subscribed to market data updates',
            'timestamp': int(time.time() * 1000)
        })
        
        # Send current market data immediately
        current_data = {
            'type': 'market_data',
            'data': {
                'nifty50': {
                    'price': previous_market_data['nifty50']['price'],
                    'changePercent': previous_market_data['nifty50']['changePercent']
                },
                'niftyBank': {
                    'price': previous_market_data['niftyBank']['price'],
                    'changePercent': previous_market_data['niftyBank']['changePercent']
                }
            },
            'timestamp': int(time.time() * 1000)
        }
        emit('market_data_update', current_data)
        
    except Exception as e:
        emit('error', {
            'type': 'subscription_error',
            'message': 'Failed to subscribe to market data',
            'timestamp': int(time.time() * 1000)
        })

# Portfolio data is now handled via API endpoints only
# No WebSocket namespace needed for portfolio data

# Contracts Namespace
@socketio.on('connect', namespace=contracts_namespace)
def handle_contracts_connect():
    """Handle contracts WebSocket connection"""
    clients_connected.add(request.sid)
    emit('connected', {'message': 'Connected to contracts stream'})

@socketio.on('disconnect', namespace=contracts_namespace)
def handle_contracts_disconnect():
    """Handle contracts WebSocket disconnection"""
    clients_connected.discard(request.sid)

@socketio.on('ping', namespace=contracts_namespace)
def handle_contracts_ping():
    """Handle ping from client"""
    try:
        emit('pong', {'timestamp': int(time.time() * 1000)})
    except Exception as e:
        pass

@socketio.on('subscribe_contracts', namespace=contracts_namespace)
def handle_contracts_subscription():
    """Handle contracts subscription"""
    try:
        emit('subscribed', {
            'type': 'contracts',
            'message': 'Subscribed to contract updates',
            'timestamp': int(time.time() * 1000)
        })
        
        # Send current contract data immediately if available
        if contract_data:
            contract_updates = {}
            for token, data in contract_data.items():
                if data['price'] > 0:  # Only send contracts with valid prices
                    contract_updates[token] = {
                        'price': data['price'],
                        'changePercent': data['changePercent']
                    }
            
            if contract_updates:
                update_data = {
                    'type': 'contract_updates',
                    'data': contract_updates,
                    'timestamp': int(time.time() * 1000)
                }
                emit('contract_updates', update_data)
    except Exception as e:
        pass

@socketio.on('subscribe_specific_contract', namespace=contracts_namespace)
def handle_specific_contract_subscription(data):
    """Handle specific contract subscription"""
    try:
        token = data.get('token')
        if not token:
            emit('error', {
                'type': 'subscription_error',
                'message': 'Token is required for specific contract subscription',
                'timestamp': int(time.time() * 1000)
            })
            return
        
        # Subscribe to specific contract
        success = subscribe_to_contracts([token])
        
        if success:
            emit('subscribed', {
                'type': 'specific_contract',
                'token': token,
                'message': f'Subscribed to specific contract {token}',
                'timestamp': int(time.time() * 1000)
            })
        else:
            emit('error', {
                'type': 'subscription_error',
                'message': f'Failed to subscribe to contract {token}',
                'timestamp': int(time.time() * 1000)
            })
            
    except Exception as e:
        emit('error', {
            'type': 'subscription_error',
            'message': 'Failed to subscribe to specific contract',
            'timestamp': int(time.time() * 1000)
        })

@socketio.on('unsubscribe_specific_contract', namespace=contracts_namespace)
def handle_specific_contract_unsubscription(data):
    """Handle specific contract unsubscription"""
    try:
        token = data.get('token')
        if not token:
            emit('error', {
                'type': 'subscription_error',
                'message': 'Token is required for specific contract unsubscription',
                'timestamp': int(time.time() * 1000)
            })
            return
        
        # Remove from subscribed tokens
        if token in subscribed_contract_tokens:
            subscribed_contract_tokens.discard(token)
            
            emit('unsubscribed', {
                'type': 'specific_contract',
                'token': token,
                'message': f'Unsubscribed from specific contract {token}',
                'timestamp': int(time.time() * 1000)
            })
        else:
            emit('error', {
                'type': 'subscription_error',
                'message': f'Contract {token} was not subscribed',
                'timestamp': int(time.time() * 1000)
            })
            
    except Exception as e:
        emit('error', {
            'type': 'subscription_error',
            'message': 'Failed to unsubscribe from specific contract',
            'timestamp': int(time.time() * 1000)
        })



# Global settings variable
app_settings = None

def load_app_settings():
    """Load app settings from file and store in global variable"""
    global app_settings
    try:
        with open('appsettings.json', 'r') as f:
            app_settings = json.load(f)
        return True
    except Exception as e:
        print(f"Error loading app settings: {e}")
        return False

def reload_app_settings():
    """Reload app settings from file"""
    return load_app_settings()

@app.route('/api/reload-settings', methods=['POST'])
def reload_settings():
    """Reload app settings from file"""
    try:
        if reload_app_settings():
            return jsonify({'success': True, 'message': 'Settings reloaded successfully'})
        else:
            return jsonify({'success': False, 'error': 'Failed to reload settings'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def initialize_market_data():
    """Initialize market data with current values"""
    global previous_market_data
    
    if not ALICE_BLUE_AVAILABLE or not is_connected:
        return
    
    try:
        # Get initial market data
        nifty50_instrument = alice.get_instrument_by_token('INDICES', 26000)
        nifty50_data = alice.get_scrip_info(nifty50_instrument)
        
        niftyBank_instrument = alice.get_instrument_by_token('INDICES', 26009)
        niftyBank_data = alice.get_scrip_info(niftyBank_instrument)
        
        # Set initial values
        previous_market_data['nifty50']['price'] = float(nifty50_data.get('LTP', 0))
        previous_market_data['nifty50']['changePercent'] = float(nifty50_data.get('pc', 0))
        
        previous_market_data['niftyBank']['price'] = float(niftyBank_data.get('LTP', 0))
        previous_market_data['niftyBank']['changePercent'] = float(niftyBank_data.get('pc', 0))
        
        print("Initialized market data with current values")
        
    except Exception as e:
        pass

def subscribe_to_contracts(contract_tokens):
    """Subscribe to contract tokens for real-time updates"""
    global subscribed_contract_tokens, contract_data
    
    if not ALICE_BLUE_AVAILABLE or not is_connected:
        return False
    
    if not websocket_running:
        return False
    
    try:
        # Convert tokens to instruments and subscribe
        instruments = []
        valid_tokens = []
        
        for token in contract_tokens:
            try:
                # Try to get instrument by token (assuming NFO exchange)
                instrument = alice.get_instrument_by_token('NFO', int(token))
                instruments.append(instrument)
                valid_tokens.append(token)
                subscribed_contract_tokens.add(token)
                
                # Initialize contract data
                if token not in contract_data:
                    contract_data[token] = {
                        'price': 0,
                        'changePercent': 0,
                        'previousPrice': 0
                    }
                    
            except Exception as e:
                continue
        
        if instruments:
            # Subscribe to instruments
            alice.subscribe(instruments)
            
            # Broadcast initial contract data
            broadcast_contract_updates()
            
            return True
        else:
            return False
            
    except Exception as e:
        return False

def update_contract_data(token, ltp, pc):
    """Update contract data with real-time price information"""
    global contract_data
    
    if token not in contract_data:
        contract_data[token] = {
            'price': 0,
            'changePercent': 0,
            'previousPrice': 0
        }
    
    # Store previous price for change calculation
    previous_price = contract_data[token]['price']
    
    # Update contract data
    contract_data[token]['price'] = ltp
    contract_data[token]['changePercent'] = pc
    contract_data[token]['previousPrice'] = previous_price

def broadcast_contract_updates():
    """Broadcast contract updates to all connected clients"""
    global contract_data, clients_connected
    
    if not clients_connected or not contract_data:
        return
    
    try:
        # Prepare contract updates
        contract_updates = {}
        for token, data in contract_data.items():
            if data['price'] > 0:  # Only send contracts with valid prices
                contract_updates[token] = {
                    'price': data['price'],
                    'changePercent': data['changePercent']
                }
        
        if contract_updates:
            update_data = {
                'type': 'contract_updates',
                'data': contract_updates,
                'timestamp': int(time.time() * 1000)
            }
            
            # Emit to contracts namespace
            socketio.emit('contract_updates', update_data, namespace=contracts_namespace)
            
    except Exception as e:
        pass

def start_aliceblue_websocket():
    """Start AliceBlue websocket for real-time data"""
    global websocket_running
    
    if not ALICE_BLUE_AVAILABLE or not is_connected or websocket_running:
        return
    
    try:
        # Initialize market data first
        initialize_market_data()
        
        # Get NIFTY 50 and NIFTY BANK instruments
        nifty50_instrument = alice.get_instrument_by_token('INDICES', 26000)
        niftyBank_instrument = alice.get_instrument_by_token('INDICES', 26009)
        
        def socket_open_callback():
            # Wait a bit for connection to stabilize
            time.sleep(1)
            # Subscribe to market data
            alice.subscribe([nifty50_instrument, niftyBank_instrument])
        
        def socket_close_callback():
            global websocket_running
            websocket_running = False
        
        def socket_error_callback(error):
            global websocket_running
            websocket_running = False
        
        def subscription_callback(message):
            try:
                data = json.loads(message)

                if data.get("t") == "ck":
                    return

                # Tick feed (real-time updates)
                if 'lp' in data and 'tk' in data and data.get('t') in ['tk', 'tf']:
                    token = str(data['tk'])
                    try:
                        ltp = float(data['lp'])
                        pc = float(data['pc'])
                        if ltp <= 0:
                            return
                    except (ValueError, TypeError) as e:
                        return

                    updated = False

                    if token == '26000':  # NIFTY 50
                        previous_market_data['nifty50']['price'] = ltp
                        previous_market_data['nifty50']['changePercent'] = pc
                        updated = True

                    elif token == '26009':  # NIFTY BANK
                        previous_market_data['niftyBank']['price'] = ltp
                        previous_market_data['niftyBank']['changePercent'] = pc
                        updated = True

                    # Check if this is a contract token
                    elif token in subscribed_contract_tokens:
                        update_contract_data(token, ltp, pc)
                        # Broadcast contract updates
                        broadcast_contract_updates()

                    # Broadcast only if updated
                    if updated and clients_connected:
                        market_data = {
                            'type': 'market_data',
                            'data': {
                                'nifty50': {
                                    'price': previous_market_data['nifty50']['price'],
                                    'changePercent': previous_market_data['nifty50']['changePercent']
                                },
                                'niftyBank': {
                                    'price': previous_market_data['niftyBank']['price'],
                                    'changePercent': previous_market_data['niftyBank']['changePercent']
                                }
                            },
                            'timestamp': int(time.time() * 1000)
                        }

                        # Broadcast to all connected clients
                        socketio.emit('market_data_update', market_data, namespace=market_data_namespace)
                        
                        # Also broadcast to main namespace for backward compatibility
                        socketio.emit('market_data_update', market_data)
                else:
                    pass
                
            except Exception as e:
                pass
        
        # Start the websocket
        alice.start_websocket(
            socket_open_callback=socket_open_callback,
            socket_close_callback=socket_close_callback,
            socket_error_callback=socket_error_callback,
            subscription_callback=subscription_callback,
            run_in_background=True,
            market_depth=False
        )
        
        websocket_running = True
        
    except Exception as e:
        websocket_running = False



if __name__ == '__main__':
    print("Starting Alice Blue API Server...")
    print(f"Alice Blue API Available: {ALICE_BLUE_AVAILABLE}")
    
    # Initialize Alice Blue connection
    initialize_alice_blue()
    print(f"Connected: {is_connected}")
    
    # Start AliceBlue websocket for real-time market data
    if is_connected:
        start_aliceblue_websocket()
    
    # Real-time data is handled by WebSocket subscription_callback
    # No need for separate broadcast thread
    
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)
