# Blog Generator System Documentation

## Overview

The Level Up Agency platform now includes a comprehensive AI-powered blog generation system with automatic daily publishing, link pyramid building, and full admin control.

## Features

### 🤖 AI-Powered Content Generation
- **On-Demand Generation**: Admins can generate blog posts instantly using AI
- **Automatic Daily Posts**: System generates and publishes one blog per day at a random time between 8am-12pm
- **Smart Content**: AI creates SEO-optimized content with proper H1/H2 headings
- **Topic Variety**: Pre-defined topics covering BIGO Live hosting tips, strategies, and guides

### 🔗 Link Pyramid System
- **Automatic Internal Linking**: Blogs automatically link to related articles
- **BIGO Profile Links**: Auto-generates links to BIGO profiles (bigo.tv/bigoid format)
- **Site Page Links**: Contextual links to other platform pages
- **SEO Optimization**: Built-in keyword targeting and meta descriptions

### 📊 Admin Dashboard
- **Full CRUD Operations**: Create, Read, Update, Delete blogs
- **Status Management**: Draft, Published, Scheduled, Archived statuses
- **Statistics Dashboard**: View counts, published count, drafts, etc.
- **Manual Generation**: Trigger blog generation anytime
- **Scheduler Status**: Monitor automatic generation system

### 📝 Blog Editor
- **Markdown Support**: Write content in Markdown format
- **AI Assistant**: Generate content with AI based on prompts
- **Category Management**: Organize by Getting Started, Monetization, Strategy, etc.
- **Tag System**: Add multiple tags for better discoverability
- **Image URLs**: Add featured images to blog posts
- **Scheduling**: Schedule posts for future publication

## Backend API

### Endpoints

#### Public Endpoints
```
GET  /api/blogs/                    # Get published blogs
GET  /api/blogs/{slug}              # Get single blog by slug
```

#### Admin Endpoints (Requires Authentication)
```
GET    /api/blogs/admin             # Get all blogs (including drafts)
POST   /api/blogs/                  # Create new blog
PUT    /api/blogs/{id}              # Update blog
DELETE /api/blogs/{id}              # Delete blog
POST   /api/blogs/generate          # Generate blog with AI
GET    /api/blogs/stats/overview    # Get blog statistics

POST   /api/admin/blogs/generate-now        # Manually trigger generation
GET    /api/admin/blogs/scheduler-status    # Get scheduler status
```

### Blog Model
```python
{
  "id": "uuid",
  "title": "string",
  "slug": "url-friendly-string",
  "excerpt": "string",
  "content": "markdown string",
  "author": "string",
  "author_id": "string",
  "author_bigo_id": "string",
  "status": "draft|published|scheduled|archived",
  "category": "string",
  "tags": ["array of strings"],
  "image": "url string",
  "read_time": "5 min read",
  "scheduled_time": "datetime",
  "published_at": "datetime",
  "created_at": "datetime",
  "updated_at": "datetime",
  "generated_by_ai": "boolean",
  "auto_generated": "boolean",
  "seo_keywords": ["array of strings"],
  "meta_description": "string",
  "internal_links": [{"text": "string", "url": "string"}],
  "bigo_profile_links": ["array of bigo_ids"],
  "view_count": "integer"
}
```

## Frontend Components

### BlogPage.jsx
Public-facing blog listing page with:
- Grid layout for articles
- Category badges
- Read time and date display
- Responsive design

### BlogPostPage.jsx
Individual blog post view with:
- Markdown rendering
- SEO meta tags
- Share functionality
- Related articles
- View count tracking

### BlogsPanel.jsx (Admin Dashboard)
Full admin control panel with:
- Blog list with filters (All, Published, Drafts, Scheduled, Archived)
- Statistics cards
- Blog editor with AI generation
- Status management
- Manual generation trigger
- Scheduler status monitor

## Auto-Generation System

### How It Works
1. **Scheduler Service** (`blog_scheduler_service.py`):
   - Runs continuously in the background
   - Calculates next run time (random between 8am-12pm daily)
   - Automatically generates and publishes blog post
   - Uses predefined topic list or database topics

2. **Content Generation**:
   - Selects random topic from curated list
   - Generates content using AI (Groq API)
   - Builds link pyramid with internal links
   - Extracts BIGO profile links
   - Publishes automatically

3. **Topics**: Pre-defined topics include:
   - How to Increase BIGO Live Earnings
   - PK Battle Strategies
   - Building a Loyal Fanbase
   - Essential Streaming Equipment
   - Creative Content Ideas
   - And more...

### Manual Control
Admins can:
- Trigger generation immediately via "Generate Now" button
- View scheduler status and next scheduled time
- Pause/resume automatic generation (via backend settings)

## Link Building Features

### Internal Links
- Automatically finds related blog posts by category
- Adds "Related Articles" section
- Links to relevant platform pages based on content keywords

### BIGO Profile Links
- Detects BIGO IDs in content
- Formats as: `https://bigo.tv/{bigo_id}`
- Tracks all BIGO profile links in blog metadata

### Link Pyramid
The system builds a link pyramid by:
1. Linking new posts to related existing posts
2. Adding contextual links to site pages
3. Creating a web of interconnected content for SEO

## SEO Optimization

### Automatic Features
- **H1 Headings**: All blogs start with H1 for main title
- **H2 Sections**: Proper heading hierarchy
- **Meta Descriptions**: AI-generated, 150-160 characters
- **Keywords**: Automatic keyword extraction and targeting
- **Read Time**: Calculated based on word count
- **Slug Generation**: URL-friendly slugs from titles
- **View Tracking**: Monitors engagement

### Manual SEO Control
Admins can:
- Edit meta descriptions
- Add custom keywords
- Optimize titles
- Set featured images
- Control internal linking

## Usage Guide

### For Admins

#### Creating a Blog Manually
1. Navigate to Dashboard → Blogs tab
2. Click "Create New Blog"
3. Fill in title, content, category, tags
4. Choose status (Draft/Published/Scheduled)
5. Click "Create Blog"

#### Generating with AI
1. Click "Create New Blog"
2. Enter topic in AI prompt field
3. Click "Generate Blog with AI"
4. Review and edit generated content
5. Publish or save as draft

#### Scheduling Posts
1. Create or edit a blog
2. Set status to "Scheduled"
3. Choose date/time in schedule field
4. Save blog

#### Triggering Auto-Generation
1. Go to Blogs panel
2. View scheduler status card
3. Click "Generate Now" button
4. New blog will be created in ~30 seconds

### For Admin Assistants
Admin assistants have the same access as admins for blog management, allowing them to:
- Create and edit blogs
- Generate content with AI
- Publish and schedule posts
- Monitor statistics

## Database Collections

### blogs
```javascript
{
  id: String (UUID),
  title: String,
  slug: String (unique index),
  excerpt: String,
  content: String,
  author: String,
  author_id: String,
  author_bigo_id: String,
  status: String (indexed),
  category: String (indexed),
  tags: Array<String>,
  image: String,
  read_time: String,
  scheduled_time: Date,
  published_at: Date (indexed, descending),
  created_at: Date,
  updated_at: Date,
  generated_by_ai: Boolean,
  auto_generated: Boolean,
  seo_keywords: Array<String>,
  meta_description: String,
  internal_links: Array<Object>,
  bigo_profile_links: Array<String>,
  view_count: Number
}
```

### Indexes
- `slug` (unique)
- `status`
- `category`
- `published_at` (descending)

## Configuration

### Environment Variables
```bash
# Required for AI generation
GROQ_API_KEY=your_groq_api_key

# Database
MONGO_URL=mongodb://...
DB_NAME=lvl_up_agency

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

### Scheduler Configuration
Located in `blog_scheduler_service.py`:
- `random_hour`: 8-11 (8am-12pm)
- `random_minute`: 0-59
- Default timezone: UTC

## Troubleshooting

### Scheduler Not Running
1. Check backend logs for errors
2. Verify MongoDB connection
3. Ensure AI service has valid API key
4. Check scheduler status endpoint

### AI Generation Fails
1. Verify GROQ_API_KEY in settings or environment
2. Check AI service logs
3. Test with simpler prompts
4. Verify rate limits not exceeded

### Frontend Not Loading Blogs
1. Check API_URL configuration
2. Verify CORS settings
3. Check network tab for API errors
4. Ensure backend is running

## Future Enhancements

Potential improvements:
- [ ] Image upload and storage
- [ ] Rich text editor (WYSIWYG)
- [ ] Blog comments system
- [ ] Social media auto-posting
- [ ] Analytics integration
- [ ] A/B testing for titles
- [ ] Multi-language support
- [ ] Blog templates
- [ ] Content calendar view
- [ ] SEO scoring system

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Review API responses in browser network tab
3. Verify database collections exist
4. Test endpoints with curl/Postman
5. Contact development team

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-26  
**Powered by**: LVL UP Coach AI Technology
