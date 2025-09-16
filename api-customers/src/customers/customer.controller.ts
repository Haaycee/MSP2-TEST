import { Controller, Get, Param, Post, Patch, Put, Delete } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { MetricsService } from './metrics/metrics.service';

@Controller("customers")
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  findAll(): string[] {
    return this.customerService.getAll();
  }

  @Get(":id")
  findOneById(@Param() params: any): string {
    return this.customerService.findOneById(params.id);
  }

  @Post()
  create() {
    return this.customerService.create();
  }

  @Put(":id")
  update(@Param() params: any) {
    return this.customerService.update(params.id);
  }

  @Delete(":id")
  delete(@Param() params: any) {
    return this.customerService.delete(params.id);
  }
}
