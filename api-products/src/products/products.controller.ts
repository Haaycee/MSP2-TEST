import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  ParseIntPipe, 
  Query, 
  HttpCode, 
  HttpStatus,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SeedService } from '../seeds/seed.service';
import { StockService } from './stock.service';
import { MetricsService } from 'src/metrics/metrics.service';

@Controller('products')
@UsePipes(new ValidationPipe({ transform: true }))
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly seedService: SeedService,
    private readonly stockService: StockService,
    private readonly metricsService: MetricsService,

  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    if (minPrice && maxPrice) {
      return this.productsService.findByPriceRange(+minPrice, +maxPrice);
    }
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.productsService.updateStock(id, quantity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedDatabase() {
    await this.seedService.seedProducts();
    return { message: 'Database seeded successfully with coffee products!' };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearDatabase() {
    await this.seedService.clearProducts();
    return { message: 'All products cleared from database!' };
  }

  // Stock Management Endpoints

  @Get(':id/stock')
  async getStock(@Param('id', ParseIntPipe) id: number) {
    const stockLevel = await this.stockService.getStockLevel(id);
    return { productId: id, stock: stockLevel };
  }

  @Post(':id/stock/adjust')
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() adjustmentDto: { quantity: number; reason: string }
  ) {
    const product = await this.stockService.adjustStock(
      id, 
      adjustmentDto.quantity, 
      adjustmentDto.reason
    );
    return {
      message: 'Stock adjusted successfully',
      product: {
        id: product.id,
        label: product.label,
        stock: product.stock,
      },
    };
  }

  @Get('stock/low')
  async getLowStockProducts() {
    const products = await this.stockService.getLowStockProducts();
    return {
      message: 'Low stock products retrieved',
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        label: p.label,
        stock: p.stock,
        price: p.price,
      })),
    };
  }

  @Get('stock/out')
  async getOutOfStockProducts() {
    const products = await this.stockService.getOutOfStockProducts();
    return {
      message: 'Out of stock products retrieved',
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        label: p.label,
        stock: p.stock,
        price: p.price,
      })),
    };
  }
}
