import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { OrderStatus } from './entities';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll(@Query('customerId') customerId?: string) {
    const customerIdNum = customerId ? parseInt(customerId, 10) : undefined;
    return this.ordersService.findAll(customerIdNum);
  }

  @Get('status/:status')
  findByStatus(@Param('status') status: OrderStatus) {
    return this.ordersService.getOrdersByStatus(status);
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.ordersService.getOrdersByCustomer(customerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/total')
  getOrderTotal(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.calculateOrderTotal(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }

    @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    await this.ordersService.remove(id);
  }

  @Get('debug-broker')
  async testMessageBroker(): Promise<any> {
    return await this.ordersService.testMessageBrokerConnection();
  }
}