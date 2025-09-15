import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MessageBrokerClient } from '../message-broker/message-broker.client';
import { ProductServiceClient } from '../message-broker/product-service.client';
import { OrderConfirmedEvent, OrderCancelledEvent } from '../message-broker/events';
import { StockService } from './stock.service';

@Injectable()
export class OrderEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventHandler.name);
  private messageBrokerClient: MessageBrokerClient;
  private productServiceClient: ProductServiceClient;

  constructor(private readonly stockService: StockService) {
    this.messageBrokerClient = new MessageBrokerClient();
    this.productServiceClient = new ProductServiceClient(this.messageBrokerClient);
  }

  async onModuleInit() {
    try {
      await this.messageBrokerClient.connect();
      await this.stockService.connectMessageBroker();
      
      // Subscribe to order events
      await this.subscribeToEvents();
      
      this.logger.log('Order event handler initialized and subscribed to events');
    } catch (error) {
      this.logger.error('Failed to initialize order event handler:', error);
    }
  }

  async onModuleDestroy() {
    await this.messageBrokerClient.disconnect();
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to order confirmed events
    await this.productServiceClient.subscribeToOrderConfirmed(
      this.handleOrderConfirmed.bind(this)
    );

    // Subscribe to order cancelled events
    await this.productServiceClient.subscribeToOrderCancelled(
      this.handleOrderCancelled.bind(this)
    );
  }

  private async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    this.logger.log(`Processing order confirmed event for order ${event.orderId}`);

    try {
      // Reduce stock for each item in the order
      for (const item of event.items) {
        await this.stockService.reserveStock(
          item.productId,
          item.quantity,
          event.orderId
        );
        
        this.logger.log(
          `Reserved ${item.quantity} units of product ${item.productId} for order ${event.orderId}`
        );
      }

      this.logger.log(`Successfully processed order confirmed event for order ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to process order confirmed event for order ${event.orderId}:`, error);
      
      // In a production system, you might want to:
      // 1. Send the message to a dead letter queue
      // 2. Notify administrators
      // 3. Attempt retry logic
      throw error;
    }
  }

  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    this.logger.log(`Processing order cancelled event for order ${event.orderId}`);

    try {
      // Restore stock for each item in the cancelled order
      for (const item of event.items) {
        await this.stockService.restoreStock(
          item.productId,
          item.quantity,
          event.orderId
        );
        
        this.logger.log(
          `Restored ${item.quantity} units of product ${item.productId} from cancelled order ${event.orderId}`
        );
      }

      this.logger.log(`Successfully processed order cancelled event for order ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to process order cancelled event for order ${event.orderId}:`, error);
      throw error;
    }
  }
}