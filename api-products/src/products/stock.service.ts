import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { MessageBrokerClient } from '../message-broker/message-broker.client';
import { ProductServiceClient } from '../message-broker/product-service.client';
import { StockUpdateEvent, LowStockEvent, OutOfStockEvent } from '../message-broker/events';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);
  private messageBrokerClient: MessageBrokerClient;
  private productServiceClient: ProductServiceClient;

  // Stock thresholds
  private readonly LOW_STOCK_THRESHOLD = 10;
  private readonly OUT_OF_STOCK_THRESHOLD = 0;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {
    this.messageBrokerClient = new MessageBrokerClient();
    this.productServiceClient = new ProductServiceClient(this.messageBrokerClient);
  }

  async connectMessageBroker(): Promise<void> {
    try {
      await this.messageBrokerClient.connect();
      this.logger.log('Stock service connected to message broker');
    } catch (error) {
      this.logger.error('Failed to connect to message broker:', error);
    }
  }

  async updateStock(
    productId: number, 
    quantity: number, 
    reason: string, 
    orderId?: number
  ): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const oldStock = product.stock;
    const newStock = oldStock + quantity;

    // Prevent negative stock
    if (newStock < 0) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${oldStock}, Required: ${Math.abs(quantity)}`
      );
    }

    // Update stock
    product.stock = newStock;
    const updatedProduct = await this.productRepository.save(product);

    // Publish stock update event
    await this.publishStockUpdateEvent(
      productId,
      oldStock,
      newStock,
      quantity,
      reason,
      orderId
    );

    // Check for low stock or out of stock alerts
    await this.checkStockAlerts(updatedProduct, orderId);

    this.logger.log(
      `Stock updated for product ${productId}: ${oldStock} -> ${newStock} (${quantity >= 0 ? '+' : ''}${quantity})`
    );

    return updatedProduct;
  }

  async reserveStock(productId: number, quantity: number, orderId: number): Promise<void> {
    // For now, we'll reduce stock immediately when order is confirmed
    // In a more complex system, you might have separate reserved stock tracking
    await this.updateStock(productId, -quantity, 'order_confirmed', orderId);
  }

  async restoreStock(productId: number, quantity: number, orderId: number): Promise<void> {
    await this.updateStock(productId, quantity, 'order_cancelled', orderId);
  }

  async adjustStock(productId: number, quantity: number, reason: string): Promise<Product> {
    return this.updateStock(productId, quantity, reason);
  }

  async getStockLevel(productId: number): Promise<number> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return product.stock;
  }

  async getLowStockProducts(): Promise<Product[]> {
    return this.productRepository.createQueryBuilder('product')
      .where('product.stock <= :threshold', { threshold: this.LOW_STOCK_THRESHOLD })
      .andWhere('product.stock > :outOfStock', { outOfStock: this.OUT_OF_STOCK_THRESHOLD })
      .getMany();
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    return this.productRepository.createQueryBuilder('product')
      .where('product.stock <= :threshold', { threshold: this.OUT_OF_STOCK_THRESHOLD })
      .getMany();
  }

  private async publishStockUpdateEvent(
    productId: number,
    oldStock: number,
    newStock: number,
    quantity: number,
    reason: string,
    orderId?: number
  ): Promise<void> {
    try {
      const event: StockUpdateEvent = {
        messageId: `stock-update-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString(),
        type: 'product.stock.updated',
        source: 'products-service',
        version: '1.0',
        productId,
        oldStock,
        newStock,
        quantity,
        reason,
        orderId,
      };

      await this.productServiceClient.publishStockUpdate(event);
    } catch (error) {
      this.logger.error('Failed to publish stock update event:', error);
    }
  }

  private async checkStockAlerts(product: Product, orderId?: number): Promise<void> {
    try {
      if (product.stock <= this.OUT_OF_STOCK_THRESHOLD) {
        // Out of stock alert
        const event: OutOfStockEvent = {
          messageId: `out-of-stock-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          timestamp: new Date().toISOString(),
          type: 'product.stock.out',
          source: 'products-service',
          version: '1.0',
          productId: product.id,
          lastOrderId: orderId,
        };

        await this.productServiceClient.publishOutOfStock(event);
        this.logger.warn(`Product ${product.id} is out of stock!`);
        
      } else if (product.stock <= this.LOW_STOCK_THRESHOLD) {
        // Low stock alert
        const event: LowStockEvent = {
          messageId: `low-stock-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          timestamp: new Date().toISOString(),
          type: 'product.stock.low',
          source: 'products-service',
          version: '1.0',
          productId: product.id,
          currentStock: product.stock,
          threshold: this.LOW_STOCK_THRESHOLD,
        };

        await this.productServiceClient.publishLowStock(event);
        this.logger.warn(`Product ${product.id} has low stock: ${product.stock} units remaining`);
      }
    } catch (error) {
      this.logger.error('Failed to publish stock alerts:', error);
    }
  }
}