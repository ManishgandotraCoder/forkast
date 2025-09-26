# Forkast Trading Platform - Backend

## Overview
A comprehensive cryptocurrency trading platform backend built with NestJS, featuring real-time order matching, user management, and portfolio tracking.

## Tech Stack
- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston logger
- **External APIs**: Yahoo Finance for crypto prices

## Core Features

### 1. User Management
- User registration and authentication
- JWT-based session management
- Profile management with protected routes
- Password hashing with bcrypt

### 2. Order Management
- Place buy/sell orders (limit and market orders)
- Order status tracking (open, filled, cancelled)
- Order history with pagination
- Real-time order matching engine

### 3. Trading Engine
- Real-time order matching algorithm
- Trade execution and settlement
- Order book management
- Market depth calculation

### 4. Portfolio Management
- Balance tracking per cryptocurrency
- Locked vs available balance management
- Trade history and execution records
- Portfolio performance tracking

### 5. Market Data
- Real-time cryptocurrency prices
- Market cap and volume data
- Price history and trends
- Symbol management

## Database Schema

### Users Table
```sql
- id: Primary key
- email: Unique user email
- password: Hashed password
- name: User display name
- createdAt: Account creation timestamp
```

### Orders Table
```sql
- id: Primary key
- userId: Foreign key to Users
- type: 'buy' or 'sell'
- symbol: Cryptocurrency pair (e.g., 'BTC-USD')
- price: Order price
- quantity: Order quantity
- filledQuantity: Amount already filled
- status: 'open', 'filled', 'cancelled'
- market: Boolean for market orders
- createdAt/updatedAt: Timestamps
```

### Trades Table
```sql
- id: Primary key
- buyOrderId/sellOrderId: Foreign keys to Orders
- buyerUserId/sellerUserId: User references
- price: Execution price
- quantity: Trade quantity
- executedAt: Trade timestamp
```

### Balances Table
```sql
- id: Primary key
- userId: Foreign key to Users
- symbol: Cryptocurrency symbol
- amount: Available balance
- locked: Locked balance (in open orders)
- createdAt/updatedAt: Timestamps
```

## API Endpoints

### Authentication (`/user`)
- `POST /user/register` - User registration
- `POST /user/login` - User authentication
- `GET /user/profile` - Get user profile (protected)

### Order Management (`/orderbook`)
- `POST /orderbook/place-order` - Place new order (protected)
- `GET /orderbook/orders` - Get user orders (protected)
- `GET /orderbook/orderbook` - Get market order book
- `GET /orderbook/trades` - Get trade history

### Market Data (`/crypto`)
- `GET /crypto/symbols` - Get available trading symbols
- `GET /crypto/quote/:symbol` - Get price quote for symbol
- `GET /crypto/quotes` - Get multiple price quotes

### Portfolio (`/balance`)
- `GET /balance` - Get user balances (protected)
- `GET /balance/:symbol` - Get balance for specific symbol (protected)

## Configuration
- Environment variables for database connection
- JWT secret and expiration settings
- CORS configuration for frontend integration
- Logging configuration with file rotation

## Development
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Run tests
npm run test
npm run test:e2e

# Database operations
npx prisma migrate dev
npx prisma db seed
```

## API Documentation
- **Swagger UI**: [http://localhost:3001/api](http://localhost:3001/api)
- Interactive API documentation with request/response examples
- Test endpoints directly from the browser
- Authentication token input for protected endpoints

<img width="1445" height="698" alt="Screenshot 2025-09-25 at 6 11 04 AM" src="https://github.com/user-attachments/assets/0d82ae69-f9ce-4c5e-ae46-307999f0afec" />


## Production
- Built with TypeScript compilation
- Winston logging with error tracking
- Swagger documentation available at `/api`
- Health check endpoint at root `/`



1. npx prisma db push
2. npx prisma migrate dev