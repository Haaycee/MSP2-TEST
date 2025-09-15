// Event interfaces for products service
export interface StockUpdateEvent {
  messageId: string;
  timestamp: string;
  type: 'product.stock.updated';
  source: string;
  version: string;
  productId: number;
  oldStock: number;
  newStock: number;
  quantity: number; // Positive for addition, negative for reduction
  reason: string; // 'order_confirmed', 'order_cancelled', 'manual_adjustment', etc.
  orderId?: number;
}

export interface LowStockEvent {
  messageId: string;
  timestamp: string;
  type: 'product.stock.low';
  source: string;
  version: string;
  productId: number;
  currentStock: number;
  threshold: number;
}

export interface OutOfStockEvent {
  messageId: string;
  timestamp: string;
  type: 'product.stock.out';
  source: string;
  version: string;
  productId: number;
  lastOrderId?: number;
}

// Order events that products service listens to
export interface OrderItemEvent {
  productId: number;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface OrderConfirmedEvent {
  messageId: string;
  timestamp: string;
  type: 'order.confirmed';
  source: string;
  version: string;
  orderId: number;
  customerId: number;
  items: OrderItemEvent[];
}

export interface OrderCancelledEvent {
  messageId: string;
  timestamp: string;
  type: 'order.cancelled';
  source: string;
  version: string;
  orderId: number;
  customerId: number;
  reason?: string;
  items: OrderItemEvent[];
}