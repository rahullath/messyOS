# Design Document

## Overview

The current authentication middleware is incorrectly treating static assets (icons, manifest files) as protected routes, causing them to be redirected to the login page. This breaks PWA functionality and creates unnecessary authentication errors. The solution is to implement proper static asset handling and refine the public route detection logic.

## Architecture

### Current Problem
- Middleware intercepts ALL requests including static assets
- Static assets like `/icons/*` are not in the PUBLIC_ROUTES list
- These assets get redirected to `/login` causing 302 responses
- PWA manifest and icons fail to load properly

### Solution Architecture
- **Static Asset Detection**: Add pattern matching for static assets
- **Enhanced Public Route Logic**: Expand public route detection beyond hardcoded list
- **Middleware Optimization**: Skip auth checks entirely for static assets
- **Error Handling**: Improve error logging and graceful fallbacks

## Components and Interfaces

### 1. Enhanced Middleware (`src/middleware.ts`)
```typescript
interface StaticAssetPattern {
  pattern: RegExp;
  description: string;
}

interface RouteClassification {
  isPublic: boolean;
  isStatic: boolean;
  requiresAuth: boolean;
}
```

### 2. Route Classification Service
```typescript
class RouteClassifier {
  classifyRoute(pathname: string): RouteClassification
  isStaticAsset(pathname: string): boolean
  isPublicRoute(pathname: string): boolean
}
```

### 3. Static Asset Patterns
- `/icons/*` - PWA icons
- `/manifest.json` - PWA manifest
- `/favicon.*` - Favicon files
- `/sw.js` - Service worker
- `/*.png`, `/*.jpg`, `/*.svg` - Image assets
- `/robots.txt`, `/sitemap.xml` - SEO files

## Data Models

### Route Classification
```typescript
const STATIC_ASSET_PATTERNS = [
  { pattern: /^\/icons\/.*/, description: 'PWA Icons' },
  { pattern: /^\/manifest\.json$/, description: 'PWA Manifest' },
  { pattern: /^\/favicon\..*/, description: 'Favicon' },
  { pattern: /^\/sw\.js$/, description: 'Service Worker' },
  { pattern: /^\/.*\.(png|jpg|jpeg|svg|ico|webp)$/, description: 'Images' },
  { pattern: /^\/robots\.txt$/, description: 'Robots' },
  { pattern: /^\/sitemap\.xml$/, description: 'Sitemap' }
];

const PUBLIC_ROUTES = [
  '/', '/landing', '/login', '/auth/callback', '/auth/exchange', 
  '/onboarding', '/reset-password', '/auth-status'
];
```

## Error Handling

### Current Issues
1. **Overly Verbose Logging**: Auth errors logged for every static asset
2. **Misleading Error Messages**: "Auth session missing" for public assets
3. **Analytics Noise**: JavaScript errors tracked for normal behavior

### Solutions
1. **Conditional Logging**: Only log auth errors for routes that actually need auth
2. **Asset-Specific Handling**: Different log levels for different asset types
3. **Error Context**: Include route classification in error messages

## Testing Strategy

### Unit Tests
- Route classification logic
- Static asset pattern matching
- Public route detection

### Integration Tests
- PWA manifest loading
- Icon accessibility
- Landing page functionality without auth
- Protected route behavior

### Manual Testing
- Browser developer tools network tab
- PWA installation flow
- Offline functionality
- Mobile device testing