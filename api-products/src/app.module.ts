import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { SeedModule } from './seeds/seed.module';
import { Product } from './products/entities/product.entity';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'db-service-products') || 'db-service-products',
        port: configService.get('DB_PORT', 5432) || 5432,
        username: configService.get('DB_USER', 'user') || 'user',
        password: configService.get('DB_PASSWORD', 'password') || 'password',
        database: configService.get('DB_NAME', 'api_products') || 'api_products',
        entities: [Product],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ProductsModule,
    SeedModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
