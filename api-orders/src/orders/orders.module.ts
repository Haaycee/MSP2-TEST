import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderItem } from './entities';
import { OrderServiceClient } from '../message-broker/order-service.client';
import { MessageBrokerClient } from '../message-broker/message-broker.client';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: MessageBrokerClient,
      useFactory: () => {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq-service:5672';
        return new MessageBrokerClient(rabbitmqUrl);
      },
    },
    OrderServiceClient,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}