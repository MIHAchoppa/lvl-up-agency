# Bigo API Client

A Node.js client for the Bigo Live API with built-in retry logic and exponential backoff.

## Installation

The required dependencies are already included in the root `package.json`:

```bash
npm install
```

## Configuration

Set the following environment variables in your `.env` file:

```env
BIGO_API_BASE_URL=https://api.bigo.tv/v1
BIGO_API_TOKEN=your-bigo-api-token-here
```

## Usage

### Import the client

```javascript
const bigoClient = require('./src/services/bigoClient');
```

### List Live Rooms

```javascript
// List all live rooms with pagination
const rooms = await bigoClient.listLiveRooms({ 
  page: 1, 
  limit: 20,
  status: 'live'
});
console.log(rooms);
```

### Get Room Details

```javascript
// Get details for a specific room
const roomDetails = await bigoClient.getRoomDetails('room-id-123');
console.log(roomDetails);
```

### Get Moderation Events

```javascript
// Get moderation events for a room
const moderationEvents = await bigoClient.getModerationEvents('room-id-123', {
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z',
  eventType: 'ban'
});
console.log(moderationEvents);
```

### Get Analytics

```javascript
// Get analytics data
const analytics = await bigoClient.getAnalytics({
  roomId: 'room-id-123',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  metric: 'viewers'
});
console.log(analytics);

// Get platform-wide analytics (no roomId)
const platformAnalytics = await bigoClient.getAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Using the Generic Request Method

```javascript
// For custom API calls not covered by the convenience methods
const customData = await bigoClient.request('/custom/endpoint', {
  method: 'POST',
  data: {
    key: 'value'
  }
});
```

## Features

### Automatic Retry with Exponential Backoff

The client automatically retries failed requests up to 3 times with exponential backoff:
- 1st retry: 1 second delay
- 2nd retry: 2 seconds delay
- 3rd retry: 4 seconds delay

Retries are triggered for:
- Server errors (HTTP 5xx)
- Connection timeouts (ECONNABORTED)

### Bearer Token Authentication

All requests automatically include the Bearer token from your environment configuration:

```
Authorization: Bearer {BIGO_API_TOKEN}
```

### Error Handling

The client throws descriptive errors with the following structure:

```javascript
{
  message: 'Error message',
  status: 404,  // HTTP status code
  data: {},     // Response data if available
  code: 'ERR_CODE'  // Error code
}
```

### Example Error Handling

```javascript
try {
  const room = await bigoClient.getRoomDetails('invalid-id');
} catch (error) {
  console.error('Error:', error.message);
  console.error('Status:', error.status);
  console.error('Details:', error.data);
}
```

## Testing

Run the test suite:

```bash
node src/services/__tests__/bigoClient.test.js
```

All tests should pass:
- ✅ Module exports all required methods
- ✅ All methods are functions
- ✅ Error handling for missing required parameters
- ✅ Methods accept parameter objects

## API Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `request(endpoint, options, retryCount)` | Generic request with retry | Low-level API request method |
| `listLiveRooms(params)` | `{ page, limit, status }` | List live rooms with filtering |
| `getRoomDetails(roomId)` | `roomId` (required) | Get detailed information about a room |
| `getModerationEvents(roomId, params)` | `roomId` (required), `{ startTime, endTime, eventType }` | Get moderation history |
| `getAnalytics(params)` | `{ roomId, startDate, endDate, metric }` | Get analytics data |

## Integration with Express

Example integration in an Express route:

```javascript
const express = require('express');
const bigoClient = require('./src/services/bigoClient');

const app = express();

app.get('/api/bigo/rooms', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const rooms = await bigoClient.listLiveRooms({ page, limit });
    res.json(rooms);
  } catch (error) {
    res.status(error.status || 500).json({ 
      error: error.message 
    });
  }
});

app.get('/api/bigo/rooms/:roomId', async (req, res) => {
  try {
    const roomDetails = await bigoClient.getRoomDetails(req.params.roomId);
    res.json(roomDetails);
  } catch (error) {
    res.status(error.status || 500).json({ 
      error: error.message 
    });
  }
});
```

## Notes

- The client uses `process.env` for configuration, so make sure to load environment variables using `dotenv` or similar
- The default base URL is `https://api.bigo.tv/v1` but can be overridden via `BIGO_API_BASE_URL`
- All API requests require a valid `BIGO_API_TOKEN`
