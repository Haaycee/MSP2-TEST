import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Customer } from './customers/entities/customer.entity';
import { CustomerModule } from './customers/customer.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'db-service-customers',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'api_customers',
      entities: [Customer],
      autoLoadEntities: true,
      logging: true, // Pour débugger les requêtes SQL
    }),
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
