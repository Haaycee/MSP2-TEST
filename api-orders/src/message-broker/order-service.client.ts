import { MessageBrokerClient } from './message-broker.client';
import { OrderCreatedEvent, OrderConfirmedEvent, OrderCancelledEvent, StockValidationRequestEvent } from './events';

import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderServiceClient {
  constructor(private readonly messageBroker: MessageBrokerClient) {}

  async connect(): Promise<void> {
    await this.messageBroker.connect();
  }

  async disconnect(): Promise<void> {
    await this.messageBroker.disconnect();
  }

  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'orders.events',
      'order.created',
      event
    );
  }

  async publishOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'orders.events',
      'order.confirmed',
      event
    );
  }

  async publishOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'orders.events',
      'order.cancelled',
      event
    );
  }

  async subscribeToStockUpdates(handler: (event: any) => Promise<void>): Promise<void> {
    await this.messageBroker.subscribeToEvents(
      'products.events',
      'product.stock.updated',
      handler,
      'orders.stock.updated'
    );
  }

  async subscribeToOutOfStock(handler: (event: any) => Promise<void>): Promise<void> {
    await this.messageBroker.subscribeToEvents(
      'products.events',
      'product.stock.out',
      handler,
      'orders.stock.out'
    );
  }

  async publishStockValidationRequest(event: StockValidationRequestEvent): Promise<void> {
    await this.messageBroker.publishEvent(
      'products.events',
      'stock.validation.request',
      event
    );
  }

  async subscribeToStockValidationResponse(handler: (event: any) => Promise<void>): Promise<void> {
    await this.messageBroker.subscribeToEvents(
      'products.events',
      'stock.validation.response',
      handler,
      'orders.stock.validation'
    );
  }
}