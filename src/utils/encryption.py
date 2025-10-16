"""
Encryption utilities for Python server
Compatible with the JavaScript encryption utilities
"""

import base64
import json
from Cryptodome.Cipher import AES
from Cryptodome.Util.Padding import pad, unpad
import hashlib

# Salt for encryption - same as in the JavaScript utility file
ENCRYPTION_SALT = 'aliceblue-trading-salt-2024'

def encrypt_text(text):
    """Encrypts a string using AES encryption with a salt (compatible with crypto-js)"""
    if not text:
        return text
    
    try:
        # Create a key from the salt (simple approach like crypto-js)
        key = hashlib.sha256(ENCRYPTION_SALT.encode()).digest()
        
        # Create cipher
        cipher = AES.new(key, AES.MODE_CBC)
        
        # Pad the text using PKCS7 padding
        padded_text = pad(text.encode('utf-8'), AES.block_size)
        
        # Encrypt
        encrypted = cipher.encrypt(padded_text)
        
        # Combine IV and encrypted data
        encrypted_data = cipher.iv + encrypted
        
        # Encode to base64
        encrypted_text = base64.b64encode(encrypted_data).decode('utf-8')
        
        return encrypted_text
    except Exception as e:
        print(f"Encryption error: {e}")
        return text

def decrypt_text(encrypted_text):
    """Decrypts a string using AES decryption with a salt (compatible with crypto-js)"""
    if not encrypted_text:
        return encrypted_text
    
    try:
        # Decode from base64
        encrypted_data = base64.b64decode(encrypted_text.encode('utf-8'))
        
        # Check for "Salted__" prefix (crypto-js format)
        if encrypted_data.startswith(b'Salted__'):
            # Extract salt and encrypted data
            salt = encrypted_data[8:16]  # 8 bytes after "Salted__"
            encrypted = encrypted_data[16:]  # Rest is encrypted data
            
            # Create key and IV using EVP_BytesToKey (OpenSSL compatible)
            key, iv = _evp_bytes_to_key(ENCRYPTION_SALT.encode(), salt, 32, 16)
        else:
            # Fallback to simple approach
            key = hashlib.sha256(ENCRYPTION_SALT.encode()).digest()
            iv = encrypted_data[:AES.block_size]
            encrypted = encrypted_data[AES.block_size:]
        
        # Create cipher
        cipher = AES.new(key, AES.MODE_CBC, iv)
        
        # Decrypt
        decrypted_padded = cipher.decrypt(encrypted)
        
        # Unpad
        decrypted_text = unpad(decrypted_padded, AES.block_size).decode('utf-8')
        
        return decrypted_text
    except Exception as e:
        print(f"Decryption error: {e}")
        return encrypted_text

def _evp_bytes_to_key(password, salt, key_len, iv_len):
    """EVP_BytesToKey implementation compatible with OpenSSL/crypto-js"""
    d = d_i = b''
    while len(d) < key_len + iv_len:
        d_i = hashlib.md5(d_i + password + salt).digest()
        d += d_i
    return d[:key_len], d[key_len:key_len + iv_len]

def decrypt_alice_blue_accounts(accounts):
    """Decrypts AliceBlue account credentials"""
    if not accounts:
        return accounts
    
    decrypted_accounts = []
    for account in accounts:
        decrypted_account = {
            'Name': account.get('Name', ''),
            'Category': account.get('Category', ''),
            'UserId': decrypt_text(account.get('UserId', '')),
            'ApiKey': decrypt_text(account.get('ApiKey', ''))
        }
        decrypted_accounts.append(decrypted_account)
    
    return decrypted_accounts

def is_encrypted(text):
    """Checks if a string appears to be encrypted (base64-like format)"""
    if not text:
        return False
    
    try:
        # Check if it looks like base64 encoded data
        base64.b64decode(text)
        return len(text) > 20 and text.replace('+', '').replace('/', '').replace('=', '').isalnum()
    except:
        return False
