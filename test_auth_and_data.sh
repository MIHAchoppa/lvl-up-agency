#!/bin/bash

# Comprehensive test for auth and data endpoints
BASE_URL="http://localhost:8001/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Testing Auth & Data Endpoints${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# Test 1: Signup
echo -e "${YELLOW}[1] Testing Signup...${NC}"
SIGNUP_RESULT=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "bigo_id": "TestUser'$RANDOM'",
    "password": "test123",
    "email": "test'$RANDOM'@example.com",
    "name": "Test User",
    "timezone": "UTC"
  }')

if echo "$SIGNUP_RESULT" | grep -q "access_token"; then
  echo -e "${GREEN}✓ Signup works${NC}"
  TEST_TOKEN=$(echo "$SIGNUP_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
else
  echo -e "${RED}✗ Signup failed${NC}"
  echo "$SIGNUP_RESULT"
  exit 1
fi

# Test 2: Login
echo -e "${YELLOW}[2] Testing Login...${NC}"
LOGIN_RESULT=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"bigo_id": "Admin", "password": "admin333"}')

if echo "$LOGIN_RESULT" | grep -q "access_token"; then
  echo -e "${GREEN}✓ Login works${NC}"
  ADMIN_TOKEN=$(echo "$LOGIN_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "$LOGIN_RESULT"
  exit 1
fi

# Test 3: Auth Check
echo -e "${YELLOW}[3] Testing Auth Verification...${NC}"
AUTH_CHECK=$(curl -s $BASE_URL/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$AUTH_CHECK" | grep -q "bigo_id"; then
  echo -e "${GREEN}✓ Auth verification works${NC}"
else
  echo -e "${RED}✗ Auth verification failed${NC}"
  echo "$AUTH_CHECK"
fi

# Test 4: AI Chat History
echo -e "${YELLOW}[4] Testing AI Chat History...${NC}"
CHAT_HISTORY=$(curl -s $BASE_URL/ai/chat/history \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$CHAT_HISTORY" | grep -q "\["; then
  echo -e "${GREEN}✓ AI Chat History endpoint works${NC}"
else
  echo -e "${RED}✗ AI Chat History failed${NC}"
fi

# Test 5: Events List
echo -e "${YELLOW}[5] Testing Events List...${NC}"
EVENTS=$(curl -s $BASE_URL/events \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$EVENTS" | grep -q "\["; then
  echo -e "${GREEN}✓ Events List endpoint works${NC}"
else
  echo -e "${RED}✗ Events List failed${NC}"
fi

# Test 6: Admin Users List
echo -e "${YELLOW}[6] Testing Admin Users List...${NC}"
USERS=$(curl -s $BASE_URL/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$USERS" | grep -q "\["; then
  USER_COUNT=$(echo "$USERS" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
  echo -e "${GREEN}✓ Admin Users List works ($USER_COUNT users)${NC}"
else
  echo -e "${RED}✗ Admin Users List failed${NC}"
fi

# Test 7: Admin Settings
echo -e "${YELLOW}[7] Testing Admin Settings...${NC}"
SETTINGS=$(curl -s $BASE_URL/admin/settings \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$SETTINGS" | grep -q "settings"; then
  echo -e "${GREEN}✓ Admin Settings endpoint works${NC}"
else
  echo -e "${RED}✗ Admin Settings failed${NC}"
fi

# Test 8: Channels List
echo -e "${YELLOW}[8] Testing Channels List...${NC}"
CHANNELS=$(curl -s $BASE_URL/channels \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$CHANNELS" | grep -q "\["; then
  echo -e "${GREEN}✓ Channels List endpoint works${NC}"
else
  echo -e "${RED}✗ Channels List failed${NC}"
fi

# Test 9: Create Event
echo -e "${YELLOW}[9] Testing Create Event...${NC}"
CREATE_EVENT=$(curl -s -X POST $BASE_URL/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Test Event",
    "description": "Test Description",
    "event_type": "training",
    "start_time": "2025-12-01T10:00:00Z"
  }')

if echo "$CREATE_EVENT" | grep -q "id"; then
  EVENT_ID=$(echo "$CREATE_EVENT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")
  echo -e "${GREEN}✓ Create Event works (ID: $EVENT_ID)${NC}"
else
  echo -e "${RED}✗ Create Event failed${NC}"
  echo "$CREATE_EVENT"
fi

# Test 10: AI Chat with Memory
echo -e "${YELLOW}[10] Testing AI Chat with Memory...${NC}"
AI_CHAT=$(curl -s -X POST $BASE_URL/ai/chat/with-memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "message": "Hello, test message",
    "session_id": "test_session_'$RANDOM'"
  }')

if echo "$AI_CHAT" | grep -q "response"; then
  echo -e "${GREEN}✓ AI Chat with Memory works${NC}"
else
  # Check if it's just missing API key
  if echo "$AI_CHAT" | grep -q "Invalid API Key\|API error"; then
    echo -e "${YELLOW}⚠ AI Chat endpoint works (API key not configured)${NC}"
  else
    echo -e "${RED}✗ AI Chat with Memory failed${NC}"
    echo "$AI_CHAT"
  fi
fi

# Test 11: Unauthenticated Access (should fail)
echo -e "${YELLOW}[11] Testing Unauthenticated Access (should fail)...${NC}"
UNAUTH=$(curl -s $BASE_URL/auth/me)

if echo "$UNAUTH" | grep -q "Not authenticated"; then
  echo -e "${GREEN}✓ Auth protection works${NC}"
else
  echo -e "${RED}✗ Auth protection failed - unauthenticated access allowed!${NC}"
fi

echo ""
echo -e "${YELLOW}================================${NC}"
echo -e "${GREEN}All Tests Completed!${NC}"
echo -e "${YELLOW}================================${NC}"
