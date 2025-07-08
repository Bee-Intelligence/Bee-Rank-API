# Bee Rank Backend API Documentation

## Overview

Bee Rank is a comprehensive taxi rank management system backend built with Node.js, TypeScript, Express, and PostgreSQL. It provides real-time taxi tracking, route management, entertainment events, and user management capabilities with Firebase backup integration.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Database Configuration](#database-configuration)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Services Architecture](#services-architecture)
- [Development](#development)
- [Deployment](#deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon serverless recommended)
- Firebase project (for backup)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run seed

# Start development server
npm run dev
```

## Environment Setup

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

# Database Configuration
DB_URL=postgresql://username:password@host:port/database?sslmode=require

# External APIs
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase Configuration (Backup Database)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Firebase Emulator (for local testing)
USE_FIREBASE_EMULATOR=false
FIREBASE_EMULATOR_HOST=localhost
FIREBASE_EMULATOR_PORT=8080
```

## Database Configuration

### PostgreSQL (Primary Database)

The system uses Neon serverless PostgreSQL as the primary database with the following tables:

- **Core Tables**: users, taxi_ranks, transit_routes, journeys
- **Business Tables**: entertainment_events, user_event_bookmarks, reviews
- **Infrastructure Tables**: auth_sessions, cache_entries, websocket_sessions
- **System Tables**: email_templates, email_queue, feature_flags

### Firebase (Backup Database)

Firebase Firestore is used as a backup database with collections mirroring the PostgreSQL schema.

### Database Commands

```bash
# Initialize and seed database
npm run seed

# Seed Firebase backup
npm run seed:firebase

# Test database connection
npm run dbtest
```

## API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+27123456789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### POST `/auth/login`
Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

#### POST `/auth/logout`
Logout user and invalidate tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

### User Management Endpoints

#### GET `/users/profile`
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+27123456789",
    "role": "USER",
    "is_email_verified": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT `/users/profile`
Update user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+27987654321"
}
```

#### GET `/users`
Get all users (Admin only).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `role`: Filter by role (USER, ADMIN, OPERATOR)

### Taxi Rank Endpoints

#### GET `/taxi-ranks`
Get all taxi ranks with optional filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `city`: Filter by city
- `province`: Filter by province
- `latitude`: User latitude for distance calculation
- `longitude`: User longitude for distance calculation
- `radius`: Search radius in meters (default: 5000)

**Response:**
```json
{
  "success": true,
  "data": {
    "ranks": [
      {
        "id": "rank_id",
        "name": "Cape Town CBD Taxi Rank",
        "description": "Main taxi rank serving Cape Town CBD area",
        "latitude": -33.9249,
        "longitude": 18.4241,
        "address": "Corner of Strand & Adderley Street, Cape Town, 8001",
        "city": "Cape Town",
        "province": "Western Cape",
        "capacity": 50,
        "contact_number": "+27214441234",
        "distance": 1200.5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### GET `/taxi-ranks/:id`
Get specific taxi rank details.

#### POST `/taxi-ranks`
Create new taxi rank (Admin/Operator only).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "name": "New Taxi Rank",
  "description": "Description of the taxi rank",
  "latitude": -33.9249,
  "longitude": 18.4241,
  "address": "123 Main Street, City, 1234",
  "city": "Cape Town",
  "province": "Western Cape",
  "capacity": 30,
  "contact_number": "+27214441234"
}
```

#### PUT `/taxi-ranks/:id`
Update taxi rank (Admin/Operator only).

#### DELETE `/taxi-ranks/:id`
Delete taxi rank (Admin only).

### Transit Route Endpoints

#### GET `/routes`
Get all transit routes.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `from_location`: Filter by origin
- `to_location`: Filter by destination
- `route_type`: Filter by type (taxi, bus, train)

#### GET `/routes/:id`
Get specific route details.

#### POST `/routes`
Create new route (Admin/Operator only).

#### PUT `/routes/:id`
Update route (Admin/Operator only).

#### DELETE `/routes/:id`
Delete route (Admin only).

### Journey Endpoints

#### GET `/journeys`
Get user's journeys.

**Headers:**
```
Authorization: Bearer <access_token>
```

#### GET `/journeys/:id`
Get specific journey details.

#### POST `/journeys`
Create new journey.

**Request Body:**
```json
{
  "origin_rank_id": "rank_id_1",
  "destination_rank_id": "rank_id_2",
  "journey_type": "direct"
}
```

#### PUT `/journeys/:id`
Update journey status.

#### DELETE `/journeys/:id`
Cancel journey.

### Entertainment Events Endpoints

#### GET `/entertainment-events`
Get all entertainment events.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `event_type`: Filter by type (theatre, musical, dj, concert, comedy)
- `city`: Filter by city
- `start_date`: Filter by start date (YYYY-MM-DD)
- `end_date`: Filter by end date (YYYY-MM-DD)
- `latitude`: User latitude for distance calculation
- `longitude`: User longitude for distance calculation
- `radius`: Search radius in meters
- `is_featured`: Filter featured events (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event_id",
        "title": "Cape Town Jazz Festival",
        "description": "Annual international jazz festival",
        "event_type": "musical",
        "venue_name": "Cape Town International Convention Centre",
        "venue_address": "1 Lower Long Street, Cape Town, 8001",
        "latitude": -33.9150,
        "longitude": 18.4240,
        "start_date": "2024-03-29",
        "end_date": "2024-03-30",
        "start_time": "18:00",
        "end_time": "23:00",
        "ticket_price_min": 250.00,
        "ticket_price_max": 1500.00,
        "currency": "ZAR",
        "is_featured": true,
        "distance": 2300.5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}
```

#### GET `/entertainment-events/:id`
Get specific event details.

#### POST `/entertainment-events`
Create new event (Admin/Operator only).

#### PUT `/entertainment-events/:id`
Update event (Admin/Operator only).

#### DELETE `/entertainment-events/:id`
Delete event (Admin only).

#### POST `/entertainment-events/:id/bookmark`
Bookmark an event.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "is_attending": true,
  "reminder_set": true,
  "reminder_time": "2024-03-28T18:00:00Z",
  "notes": "Looking forward to this event!"
}
```

#### DELETE `/entertainment-events/:id/bookmark`
Remove event bookmark.

#### GET `/entertainment-events/bookmarks`
Get user's bookmarked events.

### Hiking Signs Endpoints

#### GET `/hiking-signs`
Get all hiking signs (fare boards).

#### POST `/hiking-signs`
Create new hiking sign.

**Headers:**
```
Authorization: Bearer <access_token>
```

#### PUT `/hiking-signs/:id`
Update hiking sign.

#### DELETE `/hiking-signs/:id`
Delete hiking sign.

### Review Endpoints

#### GET `/reviews`
Get reviews for entities.

**Query Parameters:**
- `entity_type`: Type of entity (rank, route, journey, taxi)
- `entity_id`: ID of the entity

#### POST `/reviews`
Create new review.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "entity_type": "rank",
  "entity_id": "rank_id",
  "rating": 5,
  "title": "Excellent Service",
  "comment": "Very reliable and clean facilities"
}
```

#### PUT `/reviews/:id`
Update review.

#### DELETE `/reviews/:id`
Delete review.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Access Token**: Short-lived token (1 hour) for API access
2. **Refresh Token**: Long-lived token (7 days) for getting new access tokens

### Headers

Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### User Roles

- **USER**: Regular user with basic permissions
- **OPERATOR**: Can manage taxi ranks and routes
- **ADMIN**: Full system access

## Services Architecture

### Core Services

- **UserService**: User management and authentication
- **TaxiRankService**: Taxi rank operations
- **JourneyService**: Journey planning and tracking
- **EntertainmentEventService**: Entertainment events management
- **TransitRouteService**: Route management
- **HikingSignService**: Fare board management
- **ReviewService**: Review and rating system

### Infrastructure Services

- **AuthService**: JWT token management
- **CacheService**: Redis-based caching
- **EventService**: Pub/sub event system
- **WebSocketService**: Real-time communication
- **FileStorageService**: File upload and management
- **FeatureFlagService**: Feature toggle management

### Service Manager

The ServiceManager handles:
- Service initialization and dependency injection
- Health monitoring
- Graceful shutdown
- Service lifecycle management

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run watch        # Start with nodemon

# Building
npm run build        # Compile TypeScript to JavaScript
npm start           # Start production server

# Database
npm run seed        # Initialize and seed PostgreSQL database
npm run seed:firebase # Seed Firebase backup database
npm run dbtest      # Test database connection

# Code Quality
npm run check       # Run Biome linter and formatter
npm run format      # Format code
npm run lint:check  # Check linting
```

### Project Structure

```
backend/
├── src/
│   ├── controllers/         # Request handlers
│   ├── routes/             # Route definitions
│   ├── services/           # Business logic
│   │   ├── business/       # Domain services
│   │   └── infrastructure/ # System services
│   ├── middleware/         # Express middleware
│   ├── database/           # Database configuration
│   │   ├── initializers/   # Database setup
│   │   └── seeds/          # Sample data
│   ├── config/            # Configuration files
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── dist/                  # Compiled JavaScript
└── docs/                  # Documentation
```

### Adding New Endpoints

1. **Create Controller**: Add controller in `src/controllers/`
2. **Define Routes**: Add routes in `src/routes/`
3. **Register Routes**: Import in `src/server.ts`
4. **Add Service**: Create service in `src/services/`
5. **Register Service**: Add to ServiceManager
6. **Update Documentation**: Update this README

### Database Migrations

When adding new tables or columns:

1. Update `src/database/initializers/tables/schema.ts`
2. Add indexes in `src/database/initializers/indexes/indexes.ts`
3. Update seed data in `src/database/seeds/seedData.ts`
4. Update Firebase schema in `src/database/seeds/firebaseSeedData.ts`

## Deployment

### Environment Variables

Ensure all required environment variables are set:

```bash
# Check required variables
node -e "console.log(Object.keys(process.env).filter(k => k.startsWith('DB_') || k.startsWith('FIREBASE_')))"
```

### Production Build

```bash
# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start production server
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Health Checks

The server provides health check endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service status

## Maintenance

### Monitoring

Monitor these key metrics:

- **Response Times**: API endpoint performance
- **Error Rates**: 4xx and 5xx response rates
- **Database Performance**: Query execution times
- **Cache Hit Rates**: Redis cache effectiveness
- **Active Connections**: WebSocket connections

### Logging

Logs are structured and include:

- Request/Response logging (Morgan)
- Service operation logs
- Error tracking with stack traces
- Performance metrics

### Database Maintenance

#### Regular Tasks

```bash
# Backup database
pg_dump $DB_URL > backup_$(date +%Y%m%d).sql

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM taxi_ranks WHERE city = 'Cape Town';

# Update table statistics
ANALYZE;
```

#### Cache Management

```bash
# Clear all cache
redis-cli FLUSHALL

# Clear specific pattern
redis-cli --scan --pattern "taxi_ranks:*" | xargs redis-cli DEL
```

### Performance Optimization

1. **Database Indexes**: Ensure proper indexing on frequently queried columns
2. **Query Optimization**: Use EXPLAIN ANALYZE to optimize slow queries
3. **Caching Strategy**: Implement appropriate cache TTL values
4. **Connection Pooling**: Monitor database connection usage
5. **Rate Limiting**: Adjust rate limits based on usage patterns

### Security Updates

1. **Dependencies**: Regularly update npm packages
2. **Environment Variables**: Rotate API keys and secrets
3. **Database Access**: Review and update database permissions
4. **CORS Configuration**: Ensure proper CORS settings for production

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Test database connection
npm run dbtest

# Check environment variables
echo $DB_URL
```

#### Firebase Connection Issues

```bash
# Verify Firebase configuration
node -e "console.log(require('./src/config/firebase'))"

# Check emulator settings
echo $USE_FIREBASE_EMULATOR
```

#### Service Startup Failures

```bash
# Check service health
curl http://localhost:5000/health/detailed

# View service logs
npm run dev 2>&1 | grep "ERROR"
```

#### Performance Issues

```bash
# Monitor active connections
netstat -an | grep :5000

# Check memory usage
node -e "console.log(process.memoryUsage())"
```

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development DEBUG=* npm run dev
```

### Error Codes

- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Missing or invalid authentication
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server-side error

## API Testing

### Using cURL

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","first_name":"Test","last_name":"User","phone":"+27123456789"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get taxi ranks
curl -X GET "http://localhost:5000/api/taxi-ranks?city=Cape Town" \
  -H "Authorization: Bearer <access_token>"
```

### Using Postman

Import the API collection from `/docs/postman/` directory for comprehensive testing.

## Support

For issues and questions:

1. Check this documentation
2. Review error logs
3. Check service health endpoints
4. Contact the development team

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Maintainer**: Bee Rank Development Team