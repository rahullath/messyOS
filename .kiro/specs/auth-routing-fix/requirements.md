# Requirements Document

## Introduction

Fix critical authentication routing issues that are preventing proper application functionality. The current auth system is incorrectly treating public assets as protected routes and has overly aggressive session validation that breaks normal user flows.

## Requirements

### Requirement 1

**User Story:** As a user, I want public assets (icons, manifest files) to load without authentication, so that the PWA and basic functionality works correctly.

#### Acceptance Criteria

1. WHEN a user requests `/icons/*` files THEN the system SHALL serve them without authentication checks
2. WHEN a user requests `/manifest.json` THEN the system SHALL serve it without authentication checks  
3. WHEN a user requests other static assets THEN the system SHALL serve them without redirecting to login

### Requirement 2

**User Story:** As a user, I want the landing page to work properly without authentication errors, so that I can access the waitlist functionality.

#### Acceptance Criteria

1. WHEN an unauthenticated user visits `/` THEN the system SHALL show the landing page without auth errors
2. WHEN the landing page loads THEN the system SHALL NOT attempt to validate auth sessions for public content
3. WHEN analytics are tracked on public pages THEN the system SHALL handle undefined user IDs gracefully

### Requirement 3

**User Story:** As a developer, I want clear separation between public and protected routes, so that the auth system doesn't interfere with basic functionality.

#### Acceptance Criteria

1. WHEN the system checks route protection THEN it SHALL have a clear whitelist of public routes
2. WHEN a route is public THEN the system SHALL skip all authentication middleware
3. WHEN a route is protected THEN the system SHALL only then perform auth validation