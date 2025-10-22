# BIGO-Focused Repository Updates

## Overview
This update makes BeanGenie strictly BIGO Live-focused with citation support, adds a BIGO knowledge base, updates frontend components for better mobile experience, and improves Admin Assistant calendar operations.

---

## Backend Changes

### 1. BIGO Knowledge Base (`server.py`)

#### New Model
- **`BigoKnowledge`**: Stores BIGO-specific knowledge with URL, title, content, and tags

#### Startup Enhancement
- Creates text index on `bigo_knowledge` collection for efficient search
- Index on `content` and `title` fields for full-text search

#### New Endpoints

**POST `/api/beangenie/knowledge/upsert`** (Admin/Owner only)
- Upserts knowledge entries from official bigo.tv sources
- Validates domain is bigo.tv
- Caps content at 20k characters
- Request body:
  ```json
  {
    "url": "https://www.bigo.tv/...",
    "title": "Title",
    "content": "Content text",
    "tags": ["tag1", "tag2"]
  }
  ```

**GET `/api/beangenie/knowledge/search?q=query`** (Authenticated)
- Searches knowledge base using MongoDB text search
- Returns top 10 matching results with snippets

#### Updated Endpoint: POST `/api/beangenie/chat`
- **New behavior**: Searches BIGO knowledge base before responding
- **Strict BIGO-only**: Refuses to answer if no relevant BIGO sources found
- **Sources**: Returns sources array with citations [1], [2], etc.
- **Response format**:
  ```json
  {
    "response": "Answer with [1] citations...\n\nSources:\n[1] Title",
    "sources": [
      {"label": "[1] Title", "url": "https://..."}
    ],
    "session_id": "..."
  }
  ```

### 2. Admin Assistant Enhancement (`server.py`)

#### Updated Endpoint: POST `/api/admin-assistant/chat`
- **New feature**: Extracts structured calendar actions from natural language
- **Action types**: `create_event`, `update_event`, `delete_event`
- **Response format**:
  ```json
  {
    "response": "Natural language response",
    "action": "create_event",
    "payload": {
      "title": "Event Title",
      "description": "...",
      "start_time": "2025-10-25T19:00:00Z",
      "event_type": "pk",
      ...
    }
  }
  ```

### 3. Calendar Event Management (`server.py`)

**PUT `/api/events/{event_id}`** (Admin/Owner only)
- Updates existing event
- Allowed fields: title, description, event_type, start_time, end_time, timezone_display, flyer_url, bigo_live_link, signup_form_link, location, max_participants, category

**DELETE `/api/events/{event_id}`** (Admin/Owner only)
- Soft deletes event (sets `active=False`)

### 4. Seed Script (`scripts/seed_bigo_knowledge.py`)

- Seeds BIGO knowledge base from curated bigo.tv URLs
- Fetches HTML, extracts clean text with BeautifulSoup4
- Validates bigo.tv domain only
- Caps content at 20k characters
- Usage: `python3 scripts/seed_bigo_knowledge.py`

---

## Frontend Changes

### 1. BeanGeniePanel.jsx

#### Sources Display
- Captures `sources` array from API response
- Renders sources section below assistant messages
- Sources displayed as links opening in new tabs
- Format: `[1] Title` with clickable URL

#### Mobile Responsiveness
- Chat panel: `w-full md:w-1/3` (full width on mobile, 1/3 on desktop)
- Flex layout: `flex-col md:flex-row` (stack on mobile, side-by-side on desktop)

### 2. VoiceRecruiter.jsx

#### Logo Update
- Changed from BeanGenie logo to Level Up Agency logo
- URL: `https://customer-assets.emergentagent.com/job_admin-key-updater/artifacts/15cfdrzj_IMG_6004.webp`
- Added `rounded-full object-cover` for circular display

#### Action Buttons (3 primary)
1. **"I want to audition"**
   - Sends message to recruiter
   - Navigates to `/audition` after 2 seconds
   
2. **"Register"**
   - Sends message to recruiter
   - Navigates to `/login` after 2 seconds
   
3. **"I'm already a host"**
   - Sends message to recruiter
   - Drives conversation flow for existing hosts

### 3. EnhancedAdminAssistantPanel.jsx

#### Calendar Actions Handler
- New function: `handleCalendarAction(action, payload)`
- Handles `create_event`, `update_event`, `delete_event` actions
- Calls appropriate API endpoints (POST/PUT/DELETE `/api/events`)
- Shows toast notifications for success/failure
- Adds system messages to chat showing action results
- Refreshes analytics after successful actions

---

## Testing

### Backend Testing
```bash
# Check syntax
cd backend
python3 -m py_compile server.py

# Run basic tests
cd ..
python3 tests/test_bigo_updates.py

# Seed knowledge base
python3 scripts/seed_bigo_knowledge.py

# Start server
cd backend
uvicorn server:app --reload
```

### Frontend Testing
```bash
cd frontend
npm start
```

### Manual Testing Checklist
- [ ] BeanGenie shows sources with BIGO-only responses
- [ ] BeanGenie refuses non-BIGO queries appropriately
- [ ] Sources links open in new tabs
- [ ] BeanGenie is mobile responsive
- [ ] VoiceRecruiter shows Level Up logo
- [ ] VoiceRecruiter buttons work and navigate correctly
- [ ] Admin Assistant creates events from natural language
- [ ] Admin Assistant updates events
- [ ] Admin Assistant deletes events
- [ ] Calendar actions show toast notifications
- [ ] Calendar actions add system messages to chat

---

## Dependencies Added

- **Backend**: `beautifulsoup4==4.12.3` (for HTML parsing in seed script)
- **Frontend**: No new dependencies

---

## Security Notes

- BIGO knowledge upsert endpoint restricted to admin/owner roles
- Domain validation ensures only bigo.tv sources
- Calendar event management restricted to admin/owner roles
- Soft delete preserves event history

---

## Mobile Responsiveness

All components tested for mobile compatibility:
- BeanGenie chat panel full-width on mobile
- VoiceRecruiter buttons wrap on small screens
- Admin Assistant responsive layout maintained
- Viewport meta tag already present in index.html

---

## Future Enhancements

Potential improvements for consideration:
1. Add more official BIGO sources to seed script
2. Implement admin UI for knowledge base management
3. Add knowledge base search UI for debugging
4. Enhance action extraction with more event types
5. Add confirmation dialogs for destructive calendar actions
6. Implement source caching to reduce API calls
7. Add analytics tracking for source citations
