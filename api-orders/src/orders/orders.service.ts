import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderItem, OrderStatus } from './entities';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { OrderServiceClient } from '../message-broker/order-service.client';
import { OrderCreatedEvent, OrderConfirmedEvent, OrderCancelledEvent, OrderEventType, OrderItemEvent, StockValidationRequestEvent } from '../message-broker/events';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    private readonly orderServiceClient: OrderServiceClient,
  ) {
    console.log('=== OrdersService CONSTRUCTOR CALLED ===');
  }

  async onModuleInit() {
    console.log('Orders service initializing...');
    try {
      await this.orderServiceClient.connect();
      
      // Subscribe to stock validation responses
      await this.orderServiceClient.subscribeToStockValidationResponse(
        this.handleStockValidationResponse.bind(this)
      );
      
      console.log('Orders service successfully connected to message broker');
    } catch (error) {
      console.error('Orders service failed to connect to message broker:', error);
    }
  }

  async onModuleDestroy() {
    await this.orderServiceClient.disconnect();
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate customer exists (in real app, this would call customer service)
      await this.validateCustomer(createOrderDto.customerId);

      // Create the order
      const order = new Order();
      order.customerId = createOrderDto.customerId;
      order.notes = createOrderDto.notes || null;
      order.shippingAddress = createOrderDto.shippingAddress || null;
      order.billingAddress = createOrderDto.billingAddress || null;
      order.status = createOrderDto.status || OrderStatus.PENDING;

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      const orderItems: OrderItem[] = [];
      let totalAmount = 0;

      for (const itemDto of createOrderDto.items) {
        // Validate product exists and get current price (in real app, this would call product service)
        await this.validateProduct(itemDto.productId);

        const orderItem = new OrderItem();
        orderItem.orderId = savedOrder.id;
        orderItem.productId = itemDto.productId;
        orderItem.quantity = itemDto.quantity;
        orderItem.unitPrice = itemDto.unitPrice;
        orderItem.productName = itemDto.productName || null;
        orderItem.productDescription = itemDto.productDescription || null;

        orderItems.push(orderItem);
        totalAmount += orderItem.getLineTotal();
      }

      await queryRunner.manager.save(orderItems);

      // Update order total
      savedOrder.totalAmount = totalAmount;
      await queryRunner.manager.save(savedOrder);

      await queryRunner.commitTransaction();
      console.log('=== TRANSACTION COMMITTED, GETTING COMPLETE ORDER ===');

      // Get the complete order with items 
      const completeOrder = await this.findOne(savedOrder.id);
      console.log('=== GOT COMPLETE ORDER ===', completeOrder?.id);
      
      // Publish OrderCreatedEvent and trigger automatic stock validation
      console.log('=== PUBLISHING ORDER CREATED EVENT ===');
      await this.publishOrderCreatedEvent(completeOrder);
      console.log('=== ORDER CREATED EVENT SENT ===');
      
      // Automatically request stock validation
      console.log('=== REQUESTING STOCK VALIDATION ===');
      await this.requestStockValidation(completeOrder);
      console.log('=== STOCK VALIDATION REQUEST SENT ===');

      return completeOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(customerId?: number): Promise<Order[]> {
    const query = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (customerId) {
      query.where('order.customerId = :customerId', { customerId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    // Validate status transition
    if (updateOrderDto.status) {
      this.validateStatusTransition(order.status, updateOrderDto.status);
    }

    // Update order properties
    Object.assign(order, updateOrderDto);

    // If items are provided, update them
    if (updateOrderDto.items) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Remove existing items
        await queryRunner.manager.delete(OrderItem, { orderId: id });

        // Create new items
        const orderItems: OrderItem[] = [];
        let totalAmount = 0;

        for (const itemDto of updateOrderDto.items) {
          await this.validateProduct(itemDto.productId);

          const orderItem = new OrderItem();
          orderItem.orderId = id;
          orderItem.productId = itemDto.productId;
          orderItem.quantity = itemDto.quantity;
          orderItem.unitPrice = itemDto.unitPrice;
          orderItem.productName = itemDto.productName || null;
          orderItem.productDescription = itemDto.productDescription || null;

          orderItems.push(orderItem);
          totalAmount += orderItem.getLineTotal();
        }

        await queryRunner.manager.save(orderItems);
        order.totalAmount = totalAmount;
        await queryRunner.manager.save(order);

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      await this.orderRepository.save(order);
    }

    return this.findOne(id);
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    const previousStatus = order.status;
    this.validateStatusTransition(order.status, status);

    order.status = status;
    const updatedOrder = await this.orderRepository.save(order);

    // Publish appropriate events based on status change
    if (status === OrderStatus.CONFIRMED && previousStatus !== OrderStatus.CONFIRMED) {
      await this.publishOrderConfirmedEvent(updatedOrder);
    } else if (status === OrderStatus.CANCELLED && previousStatus !== OrderStatus.CANCELLED) {
      await this.publishOrderCancelledEvent(updatedOrder, 'Status updated to cancelled');
    }

    return updatedOrder;
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);

    // Only allow deletion of pending or cancelled orders
    if (![OrderStatus.PENDING, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`Cannot delete order in ${order.status} status`);
    }

    await this.orderRepository.remove(order);
  }

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrdersByCustomer(customerId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async calculateOrderTotal(orderId: number): Promise<number> {
    const order = await this.findOne(orderId);
    return order.calculateTotal();
  }

  // Business Logic Helpers
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // Final state
      [OrderStatus.CANCELLED]: [], // Final state
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private async validateCustomer(customerId: number): Promise<void> {
    // In a real microservices architecture, this would make an HTTP call to the customer service
    // For now, we'll just validate that the customerId is a positive number
    if (!customerId || customerId <= 0) {
      throw new BadRequestException('Invalid customer ID');
    }

    // TODO: Implement actual customer service validation
    // const customer = await this.customerService.findById(customerId);
    // if (!customer) {
    //   throw new NotFoundException(`Customer with ID ${customerId} not found`);
    // }
  }

  private async validateProduct(productId: number): Promise<void> {
    if (!productId || productId <= 0) {
      throw new BadRequestException('Invalid product ID');
    }
  }

  private async publishOrderCreatedEvent(order: Order): Promise<void> {
    console.log('=== ATTEMPTING TO PUBLISH ORDER CREATED EVENT ===', order.id);
    try {
      const event: OrderCreatedEvent = {
        messageId: `order-created-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString(),
        type: OrderEventType.ORDER_CREATED,
        source: 'orders-service',
        version: '1.0',
        orderId: order.id,
        customerId: order.customerId,
        status: order.status,
        totalAmount: order.totalAmount,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          lineTotal: item.getLineTotal(),
        })),
        shippingAddress: order.shippingAddress || undefined,
        notes: order.notes || undefined,
      };

      await this.orderServiceClient.publishOrderCreated(event);
      console.log(`Published order created event for order ${order.id}`);
    } catch (error) {
      console.error('Failed to publish order created event:', error);
    }
  }

  async testMessageBrokerConnection(): Promise<any> {
    try {
      console.log('Testing message broker connection...');
      const event = {
        messageId: 'test-123',
        timestamp: new Date().toISOString(),
        type: 'test.event',
        source: 'orders-service-debug',
        version: '1.0',
        data: { test: 'connection' }
      };
      await this.orderServiceClient.publishOrderCreated(event as any);
      console.log('Message broker test successful');
      return { status: 'success', message: 'Connection test successful' };
    } catch (error) {
      console.error('Message broker test failed:', error);
      return { status: 'error', message: error.message, error: error.stack };
    }
  }

  private async publishOrderConfirmedEvent(order: Order): Promise<void> {
    try {
      const event: OrderConfirmedEvent = {
        messageId: `order-confirmed-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString(),
        type: OrderEventType.ORDER_CONFIRMED,
        source: 'orders-service',
        version: '1.0',
        orderId: order.id,
        customerId: order.customerId,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          lineTotal: item.getLineTotal(),
        })),
      };

      await this.orderServiceClient.publishOrderConfirmed(event);
      console.log(`Published order confirmed event for order ${order.id}`);
    } catch (error) {
      console.error('Failed to publish order confirmed event:', error);
    }
  }

  private async publishOrderCancelledEvent(order: Order, reason?: string): Promise<void> {
    try {
      const event: OrderCancelledEvent = {
        messageId: `order-cancelled-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString(),
        type: OrderEventType.ORDER_CANCELLED,
        source: 'orders-service',
        version: '1.0',
        orderId: order.id,
        customerId: order.customerId,
        reason,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          lineTotal: item.getLineTotal(),
        })),
      };

      await this.orderServiceClient.publishOrderCancelled(event);
      console.log(`Published order cancelled event for order ${order.id}`);
    } catch (error) {
      console.error('Failed to publish order cancelled event:', error);
    }
  }

  private async requestStockValidation(order: Order): Promise<void> {
    try {
      const event: StockValidationRequestEvent = {
        messageId: `stock-validation-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timestamp: new Date().toISOString(),
        type: OrderEventType.STOCK_VALIDATION_REQUEST,
        source: 'orders-service',
        version: '1.0',
        orderId: order.id,
        customerId: order.customerId,
        totalAmount: order.totalAmount,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
          lineTotal: item.getLineTotal(),
        })),
      };

      await this.orderServiceClient.publishStockValidationRequest(event);
      console.log(`Requested stock validation for order ${order.id}`);
    } catch (error) {
      console.error('Failed to request stock validation:', error);
    }
  }

  private async handleStockValidationResponse(event: any): Promise<void> {
    console.log('=== STOCK VALIDATION RESPONSE RECEIVED ===');
    console.log('Full event object:', JSON.stringify(event, null, 2));
    console.log('Event data:', event);

    if (!event) {
      console.error('ERROR: No data property in stock validation response');
      return;
    }

    console.log(`Received stock validation response for order ${event.orderId}`);

    try {
      const order = await this.findOne(event.orderId);

      if (event.isValid) {
        // Stock is available, automatically confirm the order
        console.log(`Stock validated successfully for order ${event.orderId}, confirming order`);
        await this.updateStatus(event.orderId, OrderStatus.CONFIRMED);

        // Publish order created event (for audit/notification purposes)
        await this.publishOrderCreatedEvent(order);
      } else {
        // Stock is not available, cancel the order
        console.log(`Stock validation failed for order ${event.orderId}:`, event.reason);
        await this.updateStatus(event.orderId, OrderStatus.CANCELLED);

        // Publish order cancelled event with stock reason
        const updatedOrder = await this.findOne(event.orderId);
        await this.publishOrderCancelledEvent(updatedOrder, event.reason);
      }
    } catch (error) {
      console.error(`Failed to handle stock validation response for order ${event.orderId}:`, error);
    }
  }
}