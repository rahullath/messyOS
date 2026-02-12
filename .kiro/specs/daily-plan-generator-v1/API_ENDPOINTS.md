# Daily Plan Generator V1 - API Endpoints

## Overview

This document describes the API endpoints for the Daily Plan Generator V1 (Spine Only).

## Endpoints

### 1. Generate Daily Plan

**POST** `/api/daily-plan/generate`

Generate a new daily plan based on wake time, sleep time, and energy state.

**Requirements:** 1.1, 1.2, 1.3

**Request Body:**
```json
{
  "wakeTime": "2026-01-18T07:00:00Z",
  "sleepTime": "2026-01-18T23:00:00Z",
  "energyState": "medium",
  "date": "2026-01-18T00:00:00Z",  // Optional, defaults to today
  "currentLocation": {              // Optional, defaults to Birmingham
    "name": "Home",
    "address": "Birmingham, UK",
    "latitude": 52.4862,
    "longitude": -1.8904
  }
}
```

**Response (201):**
```json
{
  "plan": {
    "id": "uuid",
    "userId": "uuid",
    "planDate": "2026-01-18T00:00:00Z",
    "wakeTime": "2026-01-18T07:00:00Z",
    "sleepTime": "2026-01-18T23:00:00Z",
    "energyState": "medium",
    "status": "active",
    "timeBlocks": [...],
    "exitTimes": [...],
    "createdAt": "2026-01-18T06:00:00Z",
    "updatedAt": "2026-01-18T06:00:00Z"
  }
}
```

**Error Responses:**
- `400` - Missing required fields or invalid data
- `401` - Unauthorized
- `409` - Plan already exists for this date
- `500` - Server error

---

### 2. Get Today's Plan

**GET** `/api/daily-plan/today`

Fetch today's plan for the authenticated user.

**Requirements:** 8.2, 9.2

**Response (200):**
```json
{
  "plan": {
    "id": "uuid",
    "userId": "uuid",
    "planDate": "2026-01-18T00:00:00Z",
    "wakeTime": "2026-01-18T07:00:00Z",
    "sleepTime": "2026-01-18T23:00:00Z",
    "energyState": "medium",
    "status": "active",
    "timeBlocks": [...],
    "exitTimes": [...],
    "createdAt": "2026-01-18T06:00:00Z",
    "updatedAt": "2026-01-18T06:00:00Z"
  }
}
```

**Response (200) - No plan exists:**
```json
{
  "plan": null
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Server error

---

### 3. Update Activity Status

**PATCH** `/api/daily-plan/:id/activity/:activityId`

Update an activity's status (completed or skipped) and advance the sequence.

**Requirements:** 3.3, 3.4, 9.2, 9.3

**URL Parameters:**
- `id` - Plan ID (UUID)
- `activityId` - Time block ID (UUID)

**Request Body:**
```json
{
  "status": "completed",  // or "skipped"
  "skipReason": "Optional reason for skipping"  // Only used when status is "skipped"
}
```

**Response (200):**
```json
{
  "activity": {
    "id": "uuid",
    "planId": "uuid",
    "startTime": "2026-01-18T07:00:00Z",
    "endTime": "2026-01-18T07:30:00Z",
    "activityType": "routine",
    "activityName": "Morning Routine",
    "activityId": "uuid",
    "isFixed": false,
    "sequenceOrder": 1,
    "status": "completed",
    "skipReason": null,
    "createdAt": "2026-01-18T06:00:00Z",
    "updatedAt": "2026-01-18T07:30:00Z"
  },
  "message": "Activity completed"
}
```

**Error Responses:**
- `400` - Missing parameters or invalid status
- `401` - Unauthorized
- `403` - Forbidden (plan doesn't belong to user)
- `404` - Plan or activity not found
- `500` - Server error

---

### 4. Degrade Plan

**POST** `/api/daily-plan/:id/degrade`

Degrade a plan by removing optional tasks and recomputing buffers.

**Requirements:** 4.1, 9.4

**URL Parameters:**
- `id` - Plan ID (UUID)

**Response (200):**
```json
{
  "plan": {
    "id": "uuid",
    "userId": "uuid",
    "planDate": "2026-01-18T00:00:00Z",
    "wakeTime": "2026-01-18T07:00:00Z",
    "sleepTime": "2026-01-18T23:00:00Z",
    "energyState": "medium",
    "status": "degraded",
    "timeBlocks": [...],  // Only essential activities remain
    "exitTimes": [...],
    "createdAt": "2026-01-18T06:00:00Z",
    "updatedAt": "2026-01-18T14:00:00Z"
  },
  "message": "Plan degraded successfully"
}
```

**Error Responses:**
- `400` - Plan already degraded
- `401` - Unauthorized
- `403` - Forbidden (plan doesn't belong to user)
- `404` - Plan not found
- `500` - Server error

---

## Testing with curl

### Generate a plan
```bash
curl -X POST http://localhost:4321/api/daily-plan/generate \
  -H "Content-Type: application/json" \
  -d '{
    "wakeTime": "2026-01-18T07:00:00Z",
    "sleepTime": "2026-01-18T23:00:00Z",
    "energyState": "medium"
  }'
```

### Get today's plan
```bash
curl http://localhost:4321/api/daily-plan/today
```

### Complete an activity
```bash
curl -X PATCH http://localhost:4321/api/daily-plan/{planId}/activity/{activityId} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

### Skip an activity
```bash
curl -X PATCH http://localhost:4321/api/daily-plan/{planId}/activity/{activityId} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "skipped",
    "skipReason": "Not feeling up to it"
  }'
```

### Degrade a plan
```bash
curl -X POST http://localhost:4321/api/daily-plan/{planId}/degrade
```

---

## Notes

- All endpoints require authentication via Supabase session cookies
- All timestamps should be in ISO 8601 format
- The sequence automatically advances when activities are completed or skipped
- Degradation can only be performed once per plan
- Exit times are automatically calculated for commitments with locations
