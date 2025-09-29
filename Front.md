# Forkast Trading Platform - Frontend

## Overview
A modern, responsive cryptocurrency trading platform frontend built with Next.js 15, featuring real-time trading interface, order management, and portfolio tracking.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **HTTP Client**: Axios
- **TypeScript**: Full type safety

## Core Features

### 1. Authentication System
- Secure login/logout functionality
- Protected route management
- User session persistence
- Automatic redirect to dashboard after login

### 2. Trading Dashboard
- Main trading interface with tabbed navigation
- Real-time order book visualization
- Order placement forms
- Trade history display
- Portfolio overview

### 3. Order Management
- Create buy/sell orders (limit and market)
- View active orders with status tracking
- Order history with pagination
- Order cancellation functionality
- Order details and execution tracking

### 4. Market Data Visualization
- Real-time order book with bid/ask levels
- Market depth charts
- Price movement indicators
- Volume and spread information

### 5. Portfolio Tracking
- Balance overview across all cryptocurrencies
- Trade history with execution details
- P&L tracking and performance metrics
- Asset allocation visualization

## Page Structure

### Main Pages
- **`/`** - Landing/Login page
- **`/dashboard`** - Main trading dashboard
- **`/orders`** - Order management and history
- **`/orders/new`** - Create new orders
- **`/orders/[id]`** - Individual order details
- **`/trades`** - Trade history and portfolio
- **`/orderbook`** - Market depth view

### Key Components

#### TradingDashboard
- Main interface with tabbed navigation
- Integrates all trading components
- Responsive grid layout
- User profile management

#### OrderForm
- Buy/sell order creation
- Price and quantity inputs
- Order type selection (limit/market)
- Real-time validation

#### OrderBook
- Market depth visualization
- Bid/ask price levels
- Volume indicators
- Real-time updates

#### TradeHistory
- Executed trades display
- Portfolio performance
- Trade execution details
- Historical data

#### OrderManagement
- Active orders list
- Order status tracking
- Cancellation controls
- Order modification

#### Navbar
- Main navigation menu
- User profile dropdown
- Quick action buttons
- Responsive mobile menu

## UI/UX Features

### Design System
- **Color Scheme**: Professional trading interface with blue/green/red accents
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent padding and margins using Tailwind
- **Icons**: Lucide React icons for consistent visual language

### Responsive Design
- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interface elements
- Collapsible navigation for mobile

### User Experience
- Intuitive navigation with clear visual hierarchy
- Real-time data updates without page refresh
- Form validation with helpful error messages
- Loading states and progress indicators
- Confirmation dialogs for critical actions

## State Management

### AuthContext
- User authentication state
- Login/logout functionality
- Protected route management
- Token management

### API Integration
- Centralized API client with Axios
- Error handling and retry logic
- Request/response interceptors
- Type-safe API calls

## Development

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Key Scripts
- `npm run dev` - Development server with Turbopack
- `npm run build` - Production build with Turbopack
- `npm run start` - Production server
- `npm run lint` - ESLint code checking

## Features in Detail

### Order Creation
- Symbol selection with search
- Price and quantity inputs
- Order type selection
- Real-time price validation
- Order preview before submission

### Order Book
- Real-time market depth
- Bid/ask price levels
- Volume visualization
- Price movement indicators
- Market spread display

### Portfolio Management
- Multi-asset balance tracking
- Trade history with filters
- Performance metrics
- Asset allocation charts

### Responsive Features
- Mobile-optimized trading interface
- Touch-friendly order placement
- Collapsible sidebar navigation
- Adaptive grid layouts

## Security
- JWT token management
- Secure API communication
- Input validation and sanitization
- Protected route authentication
- Automatic token refresh

## Performance
- Next.js 15 optimizations
- Turbopack for faster builds
- Code splitting and lazy loading
- Optimized bundle sizes
- Real-time data updates

## Screenshots

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 52 AM" src="https://github.com/user-attachments/assets/4c529840-064c-4350-a165-2592437758fe" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 45 AM" src="https://github.com/user-attachments/assets/e98fdadf-eaa0-4ce1-885e-5810bd350958" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 41 AM" src="https://github.com/user-attachments/assets/e423c8e0-5a60-4283-bbc0-d891d0a702bd" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 37 AM" src="https://github.com/user-attachments/assets/012d943e-1161-4799-8afa-ac518dd6bce5" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 34 AM" src="https://github.com/user-attachments/assets/ab2b4591-1f98-4797-a0f9-30cc79e31c66" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 31 AM" src="https://github.com/user-attachments/assets/8e3d9b04-e63e-4a13-9fbb-5df9ea1c6061" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 22 AM" src="https://github.com/user-attachments/assets/891380d9-e989-4fc0-b6ec-0fec0fce506d" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 16 AM" src="https://github.com/user-attachments/assets/a3ca43a8-c3c9-4517-9d8a-95c580b9c7bb" />

<img width="1470" height="710" alt="Screenshot 2025-09-29 at 11 16 25 AM" src="https://github.com/user-attachments/assets/6c7e8652-ef44-4bae-9138-bf9efa1aca4c" />
