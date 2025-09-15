# API Products - CRUD Operations

This NestJS application provides a complete CRUD API for managing products with PostgreSQL database.

## Features

- ✅ Complete CRUD operations (Create, Read, Update, Delete)
- ✅ Input validation with class-validator
- ✅ TypeORM integration with PostgreSQL
- ✅ Stock management
- ✅ Price range filtering
- ✅ Docker containerization
- ✅ Environment-based configuration

## API Endpoints

### Products

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/products` | Create a new product | `CreateProductDto` |
| `GET` | `/products` | Get all products | - |
| `GET` | `/products?minPrice=10&maxPrice=100` | Filter products by price range | - |
| `GET` | `/products/:id` | Get product by ID | - |
| `PATCH` | `/products/:id` | Update product | `UpdateProductDto` |
| `PATCH` | `/products/:id/stock` | Update product stock | `{ "quantity": number }` |
| `DELETE` | `/products/:id` | Delete product | - |

### DTOs

#### CreateProductDto
```json
{
  "label": "string (required)",
  "description": "string (optional)",
  "price": "number (required, positive)",
  "stock": "number (optional, min: 0)"
}
```

#### UpdateProductDto
All fields from CreateProductDto are optional.

## Database Schema

### Product Entity
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup & Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Start the database:**
```bash
docker-compose up db -d
```

4. **Run the application:**
```bash
npm run start:dev
```

### Docker Setup

1. **Start all services:**
```bash
docker-compose up -d
```

2. **View logs:**
```bash
docker-compose logs -f app
```

3. **Stop services:**
```bash
docker-compose down
```

## Environment Variables

```env
DB_USER=user
DB_PASSWORD=password
DB_NAME=api_products
DB_PORT=5432
DB_HOST=db  # or localhost for local development
```

## Example Usage

### Create a Product
```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Laptop Gaming",
    "description": "High-performance gaming laptop",
    "price": 1299.99,
    "stock": 10
  }'
```

### Get All Products
```bash
curl http://localhost:3001/products
```

### Filter by Price Range
```bash
curl "http://localhost:3001/products?minPrice=100&maxPrice=1000"
```

### Update Product Stock
```bash
curl -X PATCH http://localhost:3001/products/1/stock \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 5 }'
```

## Validation Rules

- **label**: Required, non-empty string
- **description**: Optional string
- **price**: Required, positive number with max 2 decimal places
- **stock**: Optional, non-negative integer (default: 0)

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `204`: No Content (for delete)
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Internal Server Error

## Development Tools

- **Build**: `npm run build`
- **Start**: `npm run start`
- **Dev mode**: `npm run start:dev`
- **Test**: `npm run test`
- **Lint**: `npm run lint`

## Port Configuration

- **Application**: 3002 (internal), 3001 (external via Docker)
- **Database**: 5432 (internal), 5434 (external via Docker)