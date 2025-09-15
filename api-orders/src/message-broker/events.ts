// Base Event Interface
export interface BaseEvent {
  messageId: string;
  timestamp: string;
  type: string;
  source: string;
  version: string;
}

// Order Events
export enum OrderEventType {
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_UPDATED = 'order.updated',
  STOCK_VALIDATION_REQUEST = 'stock.validation.request',
  STOCK_VALIDATION_RESPONSE = 'stock.validation.response',
}

export class OrderItemEvent {
  productId: number;
  quantity: number;
  price: number;
  lineTotal: number;
}

export class OrderCreatedEvent implements BaseEvent {
  messageId: string;
  timestamp: string;
  type: OrderEventType.ORDER_CREATED = OrderEventType.ORDER_CREATED;
  source: string = 'orders-service';
  version: string = '1.0';

  // Order specific data
  orderId: number;
  customerId: number;
  status: string;
  totalAmount: number;
  items: OrderItemEvent[];
  shippingAddress?: string;
  notes?: string;
}

export class OrderConfirmedEvent implements BaseEvent {
  messageId: string;
  timestamp: string;
  type: OrderEventType.ORDER_CONFIRMED = OrderEventType.ORDER_CONFIRMED;
  source: string = 'orders-service';
  version: string = '1.0';

  orderId: number;
  customerId: number;
  items: OrderItemEvent[];
}

export class OrderCancelledEvent implements BaseEvent {
  messageId: string;
  timestamp: string;
  type: OrderEventType.ORDER_CANCELLED = OrderEventType.ORDER_CANCELLED;
  source: string = 'orders-service';
  version: string = '1.0';

  orderId: number;
  customerId: number;
  reason?: string;
  items: OrderItemEvent[];
}

// Stock Validation Events
export class StockValidationRequestEvent implements BaseEvent {
  messageId: string;
  timestamp: string;
  type: OrderEventType.STOCK_VALIDATION_REQUEST = OrderEventType.STOCK_VALIDATION_REQUEST;
  source: string = 'orders-service';
  version: string = '1.0';

  orderId: number;
  customerId: number;
  items: OrderItemEvent[];
  totalAmount: number;
}

export class StockValidationResponseEvent implements BaseEvent {
  messageId: string;
  timestamp: string;
  type: OrderEventType.STOCK_VALIDATION_RESPONSE = OrderEventType.STOCK_VALIDATION_RESPONSE;
  source: string = 'products-service';
  version: string = '1.0';

  orderId: number;
  isValid: boolean;
  reason?: string;
  unavailableItems?: {
    productId: number;
    requested: number;
    available: number;
  }[];
}