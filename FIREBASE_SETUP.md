# Firebase Database Setup and Seeding

This document explains how to set up and use Firebase as an alternative database for the Bee Rank application, similar to the existing NeonServerless PostgreSQL setup.

## Overview

The Firebase integration provides:
- **Firestore Database**: NoSQL document database for storing application data
- **Automatic Seeding**: Populates the database with sample data similar to PostgreSQL seeding
- **Service Layer**: Firebase service with CRUD operations and business logic
- **Health Monitoring**: Connection testing and health checks
- **Development Tools**: Scripts for testing and database management

## Prerequisites

1. **Firebase Project**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Firestore Database**: Enable Firestore in your Firebase project
3. **Configuration**: Get your Firebase configuration from Project Settings

## Environment Configuration

Add the following variables to your `.env` file:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id_optional

# Firebase Emulator (for development)
USE_FIREBASE_EMULATOR=false
FIREBASE_EMULATOR_HOST=localhost
FIREBASE_EMULATOR_PORT=8080
```

## Database Structure

The Firebase database mirrors the PostgreSQL structure using Firestore collections:

### Collections
- `users` - User accounts and profiles
- `taxi_ranks` - Taxi rank locations and information
- `transit_routes` - Route information between ranks
- `journeys` - User journey records
- `route_connections` - Journey route segments
- `taxis_nearby` - Real-time taxi location data
- `hiking_signs` - User-uploaded fare signs
- `user_activities` - User activity tracking
- `analytics_events` - Application analytics
- `location_history` - User location tracking
- `user_devices` - Device registration for push notifications
- `notifications` - User notifications
- `files` - File upload metadata
- `reviews` - User reviews and ratings
- `review_votes` - Review voting system
- `api_rate_limits` - API rate limiting data
- `system_settings` - Application configuration

## Setup and Initialization

### 1. Install Dependencies
Firebase is already included in the project dependencies.

### 2. Initialize Database
```bash
# Initialize Firebase database and create collections
npm run firebase:init
```

### 3. Seed Database
```bash
# Populate database with sample data
npm run firebase:seed
```

### 4. Test Connection
```bash
# Test Firebase connection and operations
npm run firebase:test
```

## Usage

### Firebase Service

The `FirebaseService` class provides a comprehensive interface for database operations:

```typescript
import { FirebaseService } from '../services/FirebaseService';

const firebaseService = new FirebaseService();
await firebaseService.initialize();

// CRUD Operations
const userId = await firebaseService.create('users', userData);
const user = await firebaseService.getById('users', userId);
await firebaseService.update('users', userId, updateData);
await firebaseService.delete('users', userId);

// Query Operations
const users = await firebaseService.getAll('users');
const adminUsers = await firebaseService.findByField('users', 'role', 'ADMIN');

// Business Logic
const userByEmail = await firebaseService.getUserByEmail('user@example.com');
const cityRanks = await firebaseService.getTaxiRanksByCity('Cape Town');
const activeRoutes = await firebaseService.getActiveRoutes();
```

### Direct Firebase Usage

You can also use Firebase directly:

```typescript
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

// Create document
await setDoc(doc(db, 'users', 'user123'), userData);

// Read document
const userDoc = await getDoc(doc(db, 'users', 'user123'));
const userData = userDoc.data();
```

## Data Migration

### From PostgreSQL to Firebase

To migrate existing PostgreSQL data to Firebase:

1. **Export PostgreSQL Data**:
   ```bash
   npm run dbtest  # Test PostgreSQL connection
   ```

2. **Transform and Import**:
   ```typescript
   // Custom migration script (create as needed)
   import { sql } from '../config/db';
   import { FirebaseService } from '../services/FirebaseService';
   
   const firebaseService = new FirebaseService();
   
   // Export from PostgreSQL
   const users = await sql`SELECT * FROM users`;
   
   // Import to Firebase
   for (const user of users) {
     await firebaseService.create('users', user);
   }
   ```

### From Firebase to PostgreSQL

To migrate Firebase data back to PostgreSQL:

```typescript
import { FirebaseService } from '../services/FirebaseService';
import { sql } from '../config/db';

const firebaseService = new FirebaseService();

// Export from Firebase
const users = await firebaseService.getAll('users');

// Import to PostgreSQL
for (const user of users) {
  await sql`INSERT INTO users (email, first_name, last_name, ...) VALUES (${user.email}, ${user.first_name}, ${user.last_name}, ...)`;
}
```

## Development with Emulator

For local development, you can use the Firebase Emulator:

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Emulator**:
   ```bash
   firebase init emulators
   ```

3. **Start Emulator**:
   ```bash
   firebase emulators:start
   ```

4. **Configure Environment**:
   ```env
   USE_FIREBASE_EMULATOR=true
   FIREBASE_EMULATOR_HOST=localhost
   FIREBASE_EMULATOR_PORT=8080
   ```

## Monitoring and Health Checks

### Health Check Endpoint

The Firebase service includes health monitoring:

```typescript
const healthStatus = await firebaseService.healthCheck();
console.log(healthStatus);
// Output: { status: 'healthy', details: { timestamp: ..., info: ... } }
```

### Connection Testing

Test Firebase connectivity:

```bash
npm run firebase:test
```

This script will:
- Test Firebase configuration
- Initialize the database
- Perform CRUD operations
- Run health checks
- Display database statistics

## Error Handling

The Firebase service includes comprehensive error handling:

```typescript
try {
  const user = await firebaseService.getById('users', 'invalid-id');
} catch (error) {
  console.error('Firebase operation failed:', error);
  // Error is logged and re-thrown for handling
}
```

## Performance Considerations

### Indexing
Firestore automatically indexes single fields. For complex queries, create composite indexes:

```typescript
// Query that may need composite index
const results = await firebaseService.getAll('journeys', [
  where('user_id', '==', userId),
  where('status', '==', 'active'),
  orderBy('created_at', 'desc')
]);
```

### Batch Operations
For bulk operations, use batch writes:

```typescript
const userIds = await firebaseService.batchCreate('users', usersArray);
```

### Pagination
Use pagination for large datasets:

```typescript
const { data, lastDoc } = await firebaseService.findWithPagination('users', 10);
// Get next page
const { data: nextPage } = await firebaseService.findWithPagination('users', 10, lastDoc);
```

## Security Rules

Configure Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for taxi ranks
    match /taxi_ranks/{rankId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Add more rules as needed
  }
}
```

## Troubleshooting

### Common Issues

1. **Configuration Errors**:
   - Verify all Firebase environment variables are set
   - Check Firebase project settings match your configuration

2. **Permission Errors**:
   - Ensure Firestore is enabled in your Firebase project
   - Check security rules allow your operations

3. **Connection Issues**:
   - Verify internet connectivity
   - Check Firebase project status

4. **Emulator Issues**:
   - Ensure Firebase CLI is installed
   - Check emulator is running on correct port

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run firebase:init` | Initialize Firebase database |
| `npm run firebase:seed` | Seed database with sample data |
| `npm run firebase:test` | Test Firebase connection and operations |

## Integration with Existing Code

The Firebase setup is designed to work alongside your existing PostgreSQL setup:

1. **Dual Database Support**: Both databases can run simultaneously
2. **Service Layer**: Use `FirebaseService` for Firebase operations, existing services for PostgreSQL
3. **Configuration**: Environment variables control which database to use
4. **Migration**: Easy data transfer between databases

This allows for gradual migration or using Firebase as a backup/alternative database solution.