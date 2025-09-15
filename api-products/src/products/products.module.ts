import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { SeedModule } from '../seeds/seed.module';
import { StockService } from './stock.service';
import { OrderEventHandler } from './order-event.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    SeedModule,
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    StockService,
    OrderEventHandler,
  ],
  exports: [ProductsService, StockService],
})
export class ProductsModule {}
