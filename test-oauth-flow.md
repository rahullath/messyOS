# OAuth Flow Testing Guide

## Manual Testing Steps:

### 1. Test Environment Setup
```bash
# Start the development server
npm run dev
# or
yarn dev
```

### 2. Test Google OAuth Login

1. **Open the application**: Navigate to `http://localhost:4321/login`

2. **Initiate Google OAuth**: Click "Continue with Google"
   - Should redirect to Google OAuth consent screen
   - Complete Google authentication

3. **Monitor the redirect flow**:
   - After Google auth: redirects to `/auth/callback`
   - Callback should redirect to `/auth/exchange?code=...`
   - Exchange should process the PKCE code exchange
   - Final redirect should land on home page `/`

4. **Verify authentication state**:
   - Check browser console for authentication logs
   - Verify no "missing auth session" errors
   - Confirm user is logged in (no redirect to login page)

### 3. Test Session Persistence

1. **Refresh the page**: Press F5 or refresh manually
   - Should remain on the home page
   - No redirect to login page
   - User should still be authenticated

2. **Navigate to protected routes**: Try accessing dashboard, habits, etc.
   - Should have access to all protected routes
   - Middleware should detect authenticated user

3. **Check browser storage**:
   - Open Developer Tools → Application → Cookies
   - Look for `sb-*-auth-token` cookies
   - Verify cookie values are NOT URL-encoded

### 4. Test Server-Side Authentication

1. **Check server logs** during the flow:
   - Should see "Server found cookie" messages
   - Should see "User found: [email]" messages in middleware
   - No authentication errors

2. **Test middleware protection**:
   - Try accessing `/` directly (should work if logged in)
   - Try accessing protected routes (should work)
   - Logout and try accessing protected routes (should redirect to login)

## Debugging Checklist:

### Browser Developer Tools
- **Console**: Look for Supabase authentication logs
- **Network**: Monitor redirect chain (callback → exchange → home)
- **Application**: Check cookies and localStorage
- **Elements**: Verify no authentication error messages

### Server Logs
- **Cookie Detection**: "🍪 Server found cookie" messages
- **User Detection**: "👤 User found: [email]" messages  
- **Middleware**: "✅ Access granted" or redirect messages

### Common Issues to Check:
- [ ] Cookie values are properly formatted (not double-encoded)
- [ ] Domain and path settings match (`path=/`, domain matches)
- [ ] SameSite=Lax for OAuth compatibility
- [ ] Secure flag only in production
- [ ] No CORS errors in console
- [ ] Code exchange completes successfully
- [ ] Session persists across page refreshes

## Expected Flow:
1. Login button click → Google OAuth
2. Google auth → `/auth/callback`
3. Callback → `/auth/exchange?code=abc123`
4. Exchange processes PKCE → Sets session
5. Exchange → Home page redirect
6. Middleware detects authenticated user
7. User has access to protected routes

## Success Criteria:
- ✅ No "missing auth session" errors
- ✅ Successful OAuth redirect chain
- ✅ Session persists across refreshes
- ✅ Server-side authentication works
- ✅ Middleware properly detects user
- ✅ Access to all protected routes