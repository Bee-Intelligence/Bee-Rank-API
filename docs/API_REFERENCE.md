# Bee Rank API Reference

## Base URL
```
http://localhost:5000/api
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Authentication

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+27123456789"
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## User Management

### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <access_token>
```

### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+27987654321"
}
```

### Get All Users (Admin)
```http
GET /api/users?page=1&limit=10&role=USER
Authorization: Bearer <admin_access_token>
```

## Taxi Ranks

### Get All Taxi Ranks
```http
GET /api/taxi-ranks?page=1&limit=10&city=Cape Town&latitude=-33.9249&longitude=18.4241&radius=5000
```

### Get Taxi Rank by ID
```http
GET /api/taxi-ranks/{id}
```

### Create Taxi Rank (Admin/Operator)
```http
POST /api/taxi-ranks
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "name": "New Taxi Rank",
  "description": "Description of the taxi rank",
  "latitude": -33.9249,
  "longitude": 18.4241,
  "address": "123 Main Street, City, 1234",
  "city": "Cape Town",
  "province": "Western Cape",
  "capacity": 30,
  "contact_number": "+27214441234",
  "facilities": {
    "restrooms": true,
    "food_vendors": true,
    "security": true
  },
  "operating_hours": {
    "monday": "06:00-22:00",
    "tuesday": "06:00-22:00",
    "wednesday": "06:00-22:00",
    "thursday": "06:00-22:00",
    "friday": "06:00-22:00",
    "saturday": "06:00-22:00",
    "sunday": "06:00-22:00"
  }
}
```

### Update Taxi Rank (Admin/Operator)
```http
PUT /api/taxi-ranks/{id}
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "name": "Updated Taxi Rank Name",
  "capacity": 40
}
```

### Delete Taxi Rank (Admin)
```http
DELETE /api/taxi-ranks/{id}
Authorization: Bearer <admin_access_token>
```

## Transit Routes

### Get All Routes
```http
GET /api/routes?page=1&limit=10&from_location=Cape Town CBD&to_location=Wynberg&route_type=taxi
```

### Get Route by ID
```http
GET /api/routes/{id}
```

### Create Route (Admin/Operator)
```http
POST /api/routes
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "from_location": "Cape Town CBD",
  "to_location": "Wynberg",
  "fare": 15.50,
  "duration_minutes": 45,
  "distance_km": 12.3,
  "route_type": "taxi",
  "origin_rank_id": "rank_id_1",
  "destination_rank_id": "rank_id_2",
  "is_direct": true,
  "frequency_minutes": 30,
  "operating_days": [1, 2, 3, 4, 5, 6, 7]
}
```

## Journeys

### Get User Journeys
```http
GET /api/journeys?page=1&limit=10&status=active
Authorization: Bearer <access_token>
```

### Get Journey by ID
```http
GET /api/journeys/{id}
Authorization: Bearer <access_token>
```

### Create Journey
```http
POST /api/journeys
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "origin_rank_id": "rank_id_1",
  "destination_rank_id": "rank_id_2",
  "journey_type": "direct"
}
```

### Update Journey Status
```http
PUT /api/journeys/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "completed"
}
```

## Entertainment Events

### Get All Events
```http
GET /api/entertainment-events?page=1&limit=10&event_type=musical&city=Cape Town&start_date=2024-03-01&end_date=2024-03-31&latitude=-33.9249&longitude=18.4241&radius=10000&is_featured=true
```

### Get Event by ID
```http
GET /api/entertainment-events/{id}
```

### Create Event (Admin/Operator)
```http
POST /api/entertainment-events
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "title": "Cape Town Jazz Festival",
  "description": "Annual international jazz festival featuring world-class artists",
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
  "age_restriction": "18+",
  "capacity": 5000,
  "organizer_name": "Cape Town Jazz Festival",
  "organizer_contact": "+27214441234",
  "website_url": "https://capetownjazzfest.com",
  "image_url": "https://example.com/events/jazz_festival.jpg",
  "tags": ["jazz", "music", "festival", "international"],
  "is_featured": true,
  "booking_url": "https://capetownjazzfest.com/tickets"
}
```

### Bookmark Event
```http
POST /api/entertainment-events/{id}/bookmark
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "is_attending": true,
  "reminder_set": true,
  "reminder_time": "2024-03-28T18:00:00Z",
  "notes": "Looking forward to this event!"
}
```

### Remove Event Bookmark
```http
DELETE /api/entertainment-events/{id}/bookmark
Authorization: Bearer <access_token>
```

### Get User's Bookmarked Events
```http
GET /api/entertainment-events/bookmarks?page=1&limit=10
Authorization: Bearer <access_token>
```

## Hiking Signs (Fare Boards)

### Get All Hiking Signs
```http
GET /api/hiking-signs?page=1&limit=10&latitude=-33.9249&longitude=18.4241&radius=5000
```

### Get Hiking Sign by ID
```http
GET /api/hiking-signs/{id}
```

### Create Hiking Sign
```http
POST /api/hiking-signs
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "image_url": "https://example.com/signs/sign1.jpg",
  "description": "Taxi fare board showing Cape Town CBD to Wynberg R15.50",
  "latitude": -33.9249,
  "longitude": 18.4241,
  "address": "Corner Strand & Adderley Street, Cape Town",
  "from_location": "Cape Town CBD",
  "to_location": "Wynberg",
  "fare_amount": 15.50,
  "sign_type": "fare_board"
}
```

## Reviews

### Get Reviews
```http
GET /api/reviews?entity_type=rank&entity_id=rank_123&page=1&limit=10
```

### Create Review
```http
POST /api/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "entity_type": "rank",
  "entity_id": "rank_123",
  "rating": 5,
  "title": "Excellent Service",
  "comment": "Very reliable and clean facilities",
  "is_anonymous": false
}
```

### Update Review
```http
PUT /api/reviews/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 4,
  "title": "Good Service",
  "comment": "Updated review comment"
}
```

### Delete Review
```http
DELETE /api/reviews/{id}
Authorization: Bearer <access_token>
```

## Health Checks

### Basic Health Check
```http
GET /health
```

### Detailed Health Check
```http
GET /health/detailed
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |
| 503 | Service Unavailable - Service temporarily down |

## Rate Limiting

- **Default**: 60 requests per minute per IP
- **Authentication endpoints**: 5 requests per minute per IP
- **Admin endpoints**: 100 requests per minute per user

## Data Types

### User Roles
- `USER`: Regular user
- `OPERATOR`: Can manage taxi ranks and routes
- `ADMIN`: Full system access

### Event Types
- `theatre`: Theatre performances
- `musical`: Musical shows and concerts
- `dj`: DJ performances and electronic music events
- `concert`: Live music concerts
- `comedy`: Stand-up comedy and comedy shows

### Journey Status
- `planned`: Journey is planned but not started
- `active`: Journey is currently in progress
- `completed`: Journey has been completed
- `cancelled`: Journey was cancelled

### Route Types
- `taxi`: Taxi/minibus routes
- `bus`: Bus routes
- `train`: Train routes

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_access_token'
  }
});
```

### Events
- `journey_update`: Real-time journey status updates
- `rank_status`: Taxi rank capacity and status updates
- `notification`: User notifications
- `event_reminder`: Entertainment event reminders

## File Upload

### Upload File
```http
POST /api/files/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <binary_file_data>
category: "user_upload"
```

### Get File
```http
GET /api/files/{file_id}
Authorization: Bearer <access_token>
```

## Search

### Global Search
```http
GET /api/search?q=cape town&type=ranks,events&latitude=-33.9249&longitude=18.4241&radius=10000
Authorization: Bearer <access_token>
```

## Analytics

### Track Event
```http
POST /api/analytics/events
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "event_type": "page_view",
  "event_category": "navigation",
  "event_action": "view_home",
  "event_label": "home_page",
  "event_value": 1.0
}
```

---

**Note**: Replace `{id}` with actual resource IDs and `<access_token>` with valid JWT tokens.