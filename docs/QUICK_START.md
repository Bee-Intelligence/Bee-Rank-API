# Bee Rank Backend - Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon serverless)
- Firebase project (optional, for backup)
- Git

## 1. Clone and Install

```bash
git clone <repository-url>
cd backend
npm install
```

## 2. Environment Setup

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/bee_rank
NEON_DATABASE_URL=your_neon_connection_string

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Server
PORT=5000
NODE_ENV=development

# Firebase (Optional)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Firebase private key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
USE_FIREBASE_EMULATOR=false

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

## 3. Database Setup

### Option A: Local PostgreSQL
```bash
# Create database
createdb bee_rank

# Run migrations and seed
npm run db:setup
```

### Option B: Neon Serverless
```bash
# Just run setup (uses DATABASE_URL)
npm run db:setup
```

## 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## 5. Test the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 6. Available Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build for production
npm start           # Start production server

# Database
npm run db:setup     # Initialize database
npm run db:seed      # Seed with sample data
npm run db:reset     # Reset and reseed database

# Firebase
npm run seed:firebase # Seed Firebase database

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode

# Linting
npm run lint        # Check code style
npm run lint:fix    # Fix code style issues
```

## 7. Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── database/        # Database setup and migrations
│   ├── config/          # Configuration files
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── docs/               # Documentation
├── uploads/            # File uploads (created automatically)
└── tests/              # Test files
```

## 8. Key Features

- ✅ **Authentication**: JWT with refresh tokens
- ✅ **Database**: PostgreSQL with Firebase backup
- ✅ **Real-time**: WebSocket support
- ✅ **File Upload**: Secure file handling
- ✅ **Caching**: Advanced caching system
- ✅ **Rate Limiting**: API protection
- ✅ **Validation**: Request/response validation
- ✅ **Logging**: Comprehensive logging
- ✅ **Health Checks**: System monitoring

## 9. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/taxi-ranks` | Get taxi ranks |
| GET | `/api/entertainment-events` | Get events |
| GET | `/api/journeys` | Get user journeys |

See [API_REFERENCE.md](./API_REFERENCE.md) for complete documentation.

## 10. Common Issues

### Database Connection
```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Firebase Issues
```bash
# Test Firebase connection
npm run seed:firebase
```

## 11. Development Tips

### Hot Reload
The server automatically restarts when you make changes to TypeScript files.

### Database Changes
After modifying database schema:
```bash
npm run db:reset
```

### Adding New Service
1. Create service in `src/services/`
2. Add to `ServiceManager`
3. Create controller in `src/controllers/`
4. Add routes in `src/routes/`
5. Register routes in `server.ts`

### Environment Variables
- Development: `.env`
- Production: Set in deployment platform
- Never commit `.env` to version control

## 12. Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables for Production
Set these in your deployment platform:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NODE_ENV=production`

## 13. Monitoring

### Health Checks
- Basic: `GET /health`
- Detailed: `GET /health/detailed`

### Logs
Logs are written to console and can be configured for file output.

### Performance
Monitor these endpoints for performance:
- Database queries
- Cache hit rates
- API response times

## Need Help?

1. Check [README.md](../README.md) for detailed documentation
2. Review [API_REFERENCE.md](./API_REFERENCE.md) for API details
3. Check the logs for error messages
4. Ensure all environment variables are set correctly

---

**Happy coding! 🚀**