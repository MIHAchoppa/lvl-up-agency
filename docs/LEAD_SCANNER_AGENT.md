# Lead Scanner Agent - Documentation

## Overview

The Lead Scanner Agent is an automated system that allows admin users to scan social media platforms (Instagram, TikTok, YouTube) for potential BIGO Live host leads. It discovers influencers, extracts their public information, calculates quality scores, and stores them in the database for review and outreach.

## Features

### 🔍 Automated Lead Discovery
- Scans multiple social media platforms simultaneously
- Keyword-based search to find relevant influencers
- Configurable filters (minimum followers, max results)
- Platform-specific search strategies

### 🎯 Lead Enrichment
- Automatic quality scoring (0-100) based on:
  - Follower count
  - Engagement rate
  - Contact information availability
- Profile data extraction (bio, username, profile URL)
- Engagement metrics calculation

### ✅ Lead Validation
- Validates lead quality before saving
- Duplicate detection (by username + platform)
- Minimum follower threshold enforcement
- Profile URL and username validation

### 📊 Statistics & Tracking
- Real-time scan status monitoring
- Scan history with detailed results
- Platform-wise breakdown of leads
- Quality metrics and analytics

## API Endpoints

### 1. Start a Lead Scan
```
POST /api/recruitment/scan
Authorization: Bearer <admin_token>

Request Body:
{
  "platforms": ["instagram", "tiktok", "youtube"],
  "keywords": ["live streamer", "content creator", "influencer"],
  "min_followers": 5000,
  "max_results": 50,
  "auto_enrich": true
}

Response:
{
  "success": true,
  "scan_id": "uuid",
  "results": {
    "total_found": 45,
    "total_saved": 40,
    "total_duplicates": 5,
    "by_platform": {
      "instagram": {"found": 20, "status": "success"},
      "tiktok": {"found": 15, "status": "success"},
      "youtube": {"found": 10, "status": "success"}
    }
  },
  "message": "Scan completed successfully. Found 45 leads, saved 40 new leads."
}
```

### 2. Get Scan History
```
GET /api/recruitment/scans?limit=50
Authorization: Bearer <admin_token>

Response:
{
  "scans": [
    {
      "id": "uuid",
      "initiated_by": "user_id",
      "initiated_by_name": "Admin Name",
      "status": "completed",
      "platforms": ["instagram", "tiktok"],
      "keywords": ["live streamer"],
      "started_at": "2025-10-23T00:00:00Z",
      "completed_at": "2025-10-23T00:05:00Z",
      "results": {
        "total_found": 45,
        "total_saved": 40,
        "total_duplicates": 5
      }
    }
  ],
  "total": 10
}
```

### 3. Get Scan Details
```
GET /api/recruitment/scans/{scan_id}
Authorization: Bearer <admin_token>

Response:
{
  "scan": { /* scan object */ },
  "leads": [ /* array of leads from this scan */ ]
}
```

### 4. Delete Scan
```
DELETE /api/recruitment/scans/{scan_id}?delete_leads=false
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Scan deleted successfully",
  "leads_deleted": 0
}
```

### 5. Get Recruitment Statistics
```
GET /api/recruitment/stats
Authorization: Bearer <admin_token>

Response:
{
  "total_leads": 150,
  "status_breakdown": {
    "found": 100,
    "contacted": 30,
    "responded": 15,
    "recruited": 5
  },
  "platform_breakdown": {
    "instagram": 70,
    "tiktok": 50,
    "youtube": 30
  },
  "recent_scans_7d": 5,
  "avg_quality_score": 65.3,
  "high_quality_leads": 45
}
```

## Frontend UI Components

### Scanner Agent Tab
- **Platform Selection**: Choose which platforms to scan (Instagram, TikTok, YouTube)
- **Keywords Input**: Comma-separated search keywords
- **Filters**: 
  - Minimum followers (default: 5000)
  - Maximum results (default: 50)
- **Start Scan Button**: Initiates the scan with visual feedback

### Leads Tab
- **Lead Table** with columns:
  - Name
  - Platform (with badge)
  - Username (clickable profile link)
  - Follower count (formatted: K/M)
  - Quality score (color-coded)
  - Email
  - Status badge
  - Actions (Send Outreach button)
- **Stats Cards**: Total leads, high quality, recent scans, avg quality

### Scan History Tab
- List of past scans with:
  - Keywords and platforms
  - Status badge (completed/running/failed)
  - Results summary (found/saved/duplicates)
  - Timestamp and initiator

## Quality Scoring Algorithm

The quality score (0-100) is calculated based on:

```
Base Score (Followers):
- 50,000+ followers: +40 points
- 10,000-49,999 followers: +30 points
- 5,000-9,999 followers: +20 points
- <5,000 followers: +10 points

Engagement Rate:
- 5.0%+ engagement: +40 points
- 3.0-4.9% engagement: +30 points
- 2.0-2.9% engagement: +20 points
- <2.0% engagement: +10 points

Contact Information:
- Has email: +20 points

Maximum Total: 100 points
```

Quality Thresholds:
- **High Quality**: 70+ (Green)
- **Medium Quality**: 50-69 (Yellow)
- **Low Quality**: <50 (Gray)

## Usage Example

### Admin Workflow
1. Navigate to Dashboard → Leads tab
2. Click "Scanner Agent" tab
3. Select platforms (e.g., Instagram, TikTok)
4. Enter keywords (e.g., "live streamer, content creator")
5. Set minimum followers (e.g., 10,000)
6. Click "Start Lead Scan"
7. Wait for scan to complete (shows progress indicator)
8. Review results in Leads tab
9. Check quality scores and contact high-quality leads
10. Send personalized outreach emails

## Database Schema

### influencer_leads Collection
```javascript
{
  id: String (UUID),
  name: String,
  platform: String ("instagram" | "tiktok" | "youtube"),
  username: String,
  profile_url: String,
  follower_count: Number,
  engagement_rate: Number,
  email: String (optional),
  phone: String (optional),
  bio: String,
  status: String ("found" | "contacted" | "responded" | "recruited" | "rejected"),
  quality_score: Number (0-100),
  scan_id: String (UUID),
  notes: String,
  contact_attempts: Number,
  last_contacted: DateTime,
  discovered_at: DateTime
}
```

### lead_scans Collection
```javascript
{
  id: String (UUID),
  initiated_by: String (user_id),
  initiated_by_name: String,
  status: String ("running" | "completed" | "failed"),
  platforms: [String],
  keywords: [String],
  filters: {
    min_followers: Number,
    max_results: Number
  },
  started_at: DateTime,
  completed_at: DateTime,
  results: {
    total_found: Number,
    total_saved: Number,
    total_duplicates: Number,
    by_platform: Object
  },
  error: String (if failed)
}
```

## Security & Permissions

- **Access Control**: Only users with `admin` or `owner` roles can access scanner endpoints
- **JWT Authentication**: All endpoints require valid bearer token
- **Rate Limiting**: Consider implementing rate limits to prevent abuse
- **Data Privacy**: Stores only publicly available information
- **Duplicate Prevention**: Checks for existing leads before saving

## Testing

Run the test suite:
```bash
python3 tests/test_lead_scanner.py
```

Tests cover:
- ✅ Basic scanning functionality
- ✅ Lead enrichment
- ✅ Lead validation
- ✅ Quality scoring
- ✅ Duplicate detection logic
- ✅ Platform-specific scanning

## Future Enhancements

1. **Real Web Scraping**: Replace sample data generation with actual web scraping (requires handling rate limits and CAPTCHAs)
2. **Email Finder Integration**: Integrate with services like Hunter.io or RocketReach for email discovery
3. **Automated Outreach**: Schedule and automate email campaigns
4. **Lead Scoring ML**: Use machine learning to improve quality scoring
5. **Social Listening**: Monitor for mentions of BIGO Live or live streaming
6. **Multi-platform Correlation**: Identify same person across platforms
7. **Engagement Tracking**: Track lead responses and conversation history
8. **A/B Testing**: Test different outreach messages
9. **CRM Integration**: Connect with external CRM systems
10. **Webhook Notifications**: Alert admins when high-quality leads are found

## Troubleshooting

### Scan Returns No Results
- Check if keywords are too specific
- Verify platform availability
- Lower minimum follower threshold
- Check for network/API issues

### Duplicate Leads
- System automatically detects duplicates by username+platform
- Duplicates are counted but not saved
- Check scan history for duplicate counts

### Quality Scores Too Low
- Adjust quality scoring algorithm in `lead_scanner_service.py`
- Consider lowering minimum follower thresholds
- Review engagement rate calculations

## Support

For issues or questions:
- Review logs in `/var/log/backend.log`
- Check MongoDB collections for data integrity
- Verify JWT token validity
- Ensure admin role permissions are set correctly
