import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255 })
  address: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 10 })
  postalCode: string;

  @Column({ length: 100 })
  country: string;

  @Column({
    type: 'enum',
    enum: ['individual', 'professional'],
    default: 'individual',
  })
  type: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
