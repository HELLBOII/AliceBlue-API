export interface MarketData {
  nifty50: {
    price: number
    changePercent: number
  }
  niftyBank: {
    price: number
    changePercent: number
  }
}

export interface Contract {
  id: string
  symbol: string
  price: number
  changePercent: number
  exchange: string
  type: 'CE' | 'PE' | 'FUT'
  strike?: number
  expiry: string
  // NFO API fields
  exch?: string
  exchange_segment?: string
  expiry_date?: number
  formatted_ins_name?: string
  instrument_type?: string
  lot_size?: string
  option_type?: string
  pdc?: any
  strike_price?: string
  tick_size?: string
  token?: string
  trading_symbol?: string
}

export interface Order {
  id: string
  symbol: string
  exchange: string
  quantity: number
  price: number
  token: string
  order_type: 'Regular' | 'Cover' | 'Bracket Order' | 'AMO'
  product_type: 'Intraday MIS' | 'Delivery NRML'
  executionType: 'Limit' | 'Market' | 'SL'
  product: 'MIS' | 'NRML',
  transaction_type: 'B' | 'S',
  type?: 'BUY' | 'SELL'
  Status?: string // AliceBlue API uses 'Status' field
  timestamp?: string
  trigger_price?: number
  stop_loss?: number
  square_off?: number
  trailing_sl?: number
}

export interface Position {
  id: string
  Tsym: string
  Pcode: string
  Netqty: number
  Buyavgprc: number
  Sellavgprc: number
  LTP: number
  realisedprofitloss: number
  unrealisedprofitloss: number
}
export interface Holdings {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  totalValue: number
  dayChange: number
  dayChangePercent: number
}

export interface Fund {
  cashmarginavailable: number
  cncMarginUsed: number
  net: number
}

export interface Profile {
  accountName: string
  accountId: string
  emailAddr: string
  cellAddr: string
  accountStatus: string
}

export interface OrderForm {
  symbol: string
  exchange: string
  quantity: number
  price: number
  trigger_price: number
  stop_loss: number
  square_off: number
  trailing_sl: number
  token: string
  order_type: 'Regular' | 'Cover' | 'Bracket Order' | 'AMO'
  product_type: 'Intraday MIS' | 'Delivery NRML'
  executionType: 'Limit' | 'Market' | 'SL'
  charges: number
  requiredMargin: number
  availableMargin: number
  product: 'MIS' | 'NRML'
  transaction_type: 'B' | 'S',
}

export interface OrderValidation {
  isValid: boolean
  errors: {
    quantity?: string
    price?: string
    margin?: string
    trigger_price?: string
    stop_loss?: string
    square_off?: string
    trailing_sl?: string
  }
}

export interface TradeBook {
  Filltime: string
  Trantype: string
  Tsym: string
  Pcode: string
  Prctype: string
  Qty: number
  Filledqty: number
  Price: number
}



// Chart and OHLC data types
export interface OHLCData {
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface HistoricalDataRequest {
  token: string
  exchange: string
  resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'
  from?: number
  to?: number
}

export interface HistoricalDataResponse {
  data: OHLCData[]
  symbol: string
  exchange: string
  resolution: string
  from: number
  to: number
}

export interface ChartConfig {
  symbol: string
  token: string
  exchange: string
  resolution: string
  theme: 'light' | 'dark'
  height?: number
  width?: number
}
