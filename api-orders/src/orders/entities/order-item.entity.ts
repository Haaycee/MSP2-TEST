import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
@Index(['orderId', 'productId'], { unique: true })
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: false })
  @Index()
  orderId: number;

  @Column({ type: 'integer', nullable: false })
  @Index()
  productId: number;

  @Column({ type: 'integer', nullable: false })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  unitPrice: number;

  @Column({ type: 'text', nullable: true })
  productName: string | null;

  @Column({ type: 'text', nullable: true })
  productDescription: string | null;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // Calculate line total
  getLineTotal(): number {
    return this.quantity * this.unitPrice;
  }
}