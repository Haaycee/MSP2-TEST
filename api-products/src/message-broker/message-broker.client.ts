import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class MessageBrokerClient {
  private readonly logger = new Logger(MessageBrokerClient.name);
  private connection: any;
  private channel: any;
  private readonly rabbitmqUrl: string;

  constructor(rabbitmqUrl?: string) {
    this.rabbitmqUrl = rabbitmqUrl || process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq-service:5672';
  }

  async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  async publishEvent(exchange: string, routingKey: string, event: any): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const messageBuffer = Buffer.from(JSON.stringify({
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
        messageId: event.messageId || this.generateMessageId(),
      }));

      const result = this.channel.publish(
        exchange,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
        }
      );

      this.logger.log(`Published event to ${exchange}/${routingKey}:`, {
        messageId: event.messageId,
        type: event.type,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  async subscribeToEvents(
    exchange: string, 
    routingKey: string, 
    handler: (event: any) => Promise<void>,
    queueName?: string
  ): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      // Assert exchange exists
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Create or assert the queue
      const queue = queueName || `${exchange}.${routingKey}.${Date.now()}`;
      const queueInfo = await this.channel.assertQueue(queue, {
        durable: true,
        autoDelete: !queueName,
      });

      // Bind queue to exchange
      await this.channel.bindQueue(queueInfo.queue, exchange, routingKey);

      // Setup consumer
      await this.channel.consume(queueInfo.queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            this.logger.log(`Received event from ${exchange}/${routingKey}:`, {
              messageId: event.messageId,
              type: event.type,
            });

            await handler(event);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing event:', error);
            this.channel.nack(msg, false, false);
          }
        }
      });

      this.logger.log(`Subscribed to ${exchange}/${routingKey} -> ${queueInfo.queue}`);
    } catch (error) {
      this.logger.error('Failed to subscribe to events:', error);
      throw error;
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  isConnected(): boolean {
    return this.connection && this.connection.connection && !this.connection.connection.closed;
  }
}