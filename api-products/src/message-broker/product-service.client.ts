import { MessageBrokerClient } from './message-broker.client';
import { StockUpdateEvent, LowStockEvent, OutOfStockEvent, OrderConfirmedEvent, OrderCancelledEvent } from './events';

export class ProductServiceClient {
  constructor(private readonly messageBroker: MessageBrokerClient) {}

  async publishStockUpdate(event: StockUpdateEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'products.events',
      'product.stock.updated',
      event
    );
  }

  async publishLowStock(event: LowStockEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'products.events',
      'product.stock.low',
      event
    );
  }

  async publishOutOfStock(event: OutOfStockEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'products.events',
      'product.stock.out',
      event
    );
  }

  async subscribeToOrderConfirmed(handler: (event: OrderConfirmedEvent) => Promise<void>): Promise<void> {
    await this.messageBroker.subscribeToEvents(
      'orders.events',
      'order.confirmed',
      handler,
      'inventory.order.confirmed'
    );
  }

  async subscribeToOrderCancelled(handler: (event: OrderCancelledEvent) => Promise<void>): Promise<void> {
    await this.messageBroker.subscribeToEvents(
      'orders.events',
      'order.cancelled',
      handler,
      'inventory.order.cancelled'
    );
  }
}