/**
 * Bigo API Client
 * Axios-based client with retry logic for Bigo Live API integration
 */

const axios = require('axios');

// Configuration from environment variables
const BIGO_API_BASE_URL = process.env.BIGO_API_BASE_URL || 'https://api.bigo.tv/v1';
const BIGO_API_TOKEN = process.env.BIGO_API_TOKEN;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Delay helper for retry logic
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic request method with retry logic
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Axios request options
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<object>} API response data
 */
async function request(endpoint, options = {}, retryCount = 0) {
  try {
    const url = `${BIGO_API_BASE_URL}${endpoint}`;
    
    const config = {
      ...options,
      url,
      headers: {
        'Authorization': `Bearer ${BIGO_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    // Check if we should retry
    const shouldRetry = retryCount < MAX_RETRIES && 
                       (error.response?.status >= 500 || error.code === 'ECONNABORTED');
    
    if (shouldRetry) {
      const delayMs = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      await delay(delayMs);
      return request(endpoint, options, retryCount + 1);
    }
    
    // If we've exhausted retries or error is not retryable, throw the error
    throw {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
    };
  }
}

/**
 * List live rooms
 * @param {object} params - Query parameters for filtering rooms
 * @param {number} params.page - Page number for pagination
 * @param {number} params.limit - Number of rooms per page
 * @param {string} params.status - Filter by room status (e.g., 'live', 'offline')
 * @returns {Promise<object>} List of live rooms
 */
async function listLiveRooms(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/rooms${queryParams ? `?${queryParams}` : ''}`;
  
  return request(endpoint, {
    method: 'GET',
  });
}

/**
 * Get room details by room ID
 * @param {string} roomId - The room identifier
 * @returns {Promise<object>} Room details
 */
async function getRoomDetails(roomId) {
  if (!roomId) {
    throw new Error('Room ID is required');
  }
  
  return request(`/rooms/${roomId}`, {
    method: 'GET',
  });
}

/**
 * Get moderation events for a room
 * @param {string} roomId - The room identifier
 * @param {object} params - Query parameters
 * @param {string} params.startTime - ISO timestamp for start of range
 * @param {string} params.endTime - ISO timestamp for end of range
 * @param {string} params.eventType - Filter by event type (e.g., 'ban', 'mute', 'warning')
 * @returns {Promise<object>} Moderation events
 */
async function getModerationEvents(roomId, params = {}) {
  if (!roomId) {
    throw new Error('Room ID is required');
  }
  
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/rooms/${roomId}/moderation${queryParams ? `?${queryParams}` : ''}`;
  
  return request(endpoint, {
    method: 'GET',
  });
}

/**
 * Get analytics data
 * @param {object} params - Query parameters
 * @param {string} params.roomId - Room identifier (optional, for room-specific analytics)
 * @param {string} params.startDate - Start date for analytics range (ISO format)
 * @param {string} params.endDate - End date for analytics range (ISO format)
 * @param {string} params.metric - Specific metric to retrieve (e.g., 'viewers', 'revenue', 'engagement')
 * @returns {Promise<object>} Analytics data
 */
async function getAnalytics(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/analytics${queryParams ? `?${queryParams}` : ''}`;
  
  return request(endpoint, {
    method: 'GET',
  });
}

// Export all methods
module.exports = {
  request,
  listLiveRooms,
  getRoomDetails,
  getModerationEvents,
  getAnalytics,
};
