# 🔍 Google OAuth Debugging Guide

## Quick Testing Steps

### 1. Environment Verification
```bash
# Check that environment variables are loaded
echo $PUBLIC_PRIVY_APP_ID
echo $PRIVY_APP_SECRET
```

### 2. Test Pages Created
- **Main Debug Page**: `/google-oauth-debug`
- **Updated Working Test**: `/working-privy` (now includes Google OAuth)
- **Simple Test**: `/privy-simple-test`

### 3. Browser Console Debugging

Open any test page and check the browser console for:

```javascript
// Look for these log messages:
"🔧 Privy Provider SINGLE INIT"
"🎉 Privy onSuccess callback"
"💥 Privy onError callback"

// Check for errors like:
"Network request failed"
"CORS policy blocked"
"OAuth configuration invalid"
```

### 4. Network Tab Debugging

1. Open Developer Tools → Network tab
2. Try to log in with Google
3. Look for failed requests to:
   - `auth.privy.io`
   - `accounts.google.com`
   - Any 4xx or 5xx status codes

### 5. Common Issues & Solutions

#### Issue: "Login method 'google' is not supported"
**Solution**: Enable Google OAuth in Privy Dashboard
- Go to dashboard.privy.io
- Navigate to App Settings → Login Methods
- Enable Google OAuth
- Configure redirect URIs

#### Issue: "OAuth callback mismatch"
**Solution**: Check redirect URI configuration
- In Google Cloud Console: Add `https://auth.privy.io/api/v1/oauth/callback/google`
- In Privy Dashboard: Verify domain whitelist includes your app domain

#### Issue: "CORS policy blocked request"
**Solution**: Domain configuration
- Add your development domain (localhost:4321) to Privy dashboard
- Add your production domain if applicable

#### Issue: "Failed to load profile from Google"
**Solution**: Check Google OAuth scopes
- Verify Google OAuth client has proper scopes (email, profile)
- Check that OAuth consent screen is published

### 6. Step-by-Step Testing Procedure

1. **Visit**: `http://localhost:4321/google-oauth-debug`
2. **Check**: Environment configuration shows all green checkmarks
3. **Click**: "Login with Google OAuth" button
4. **Monitor**: Browser console and network tab
5. **Verify**: User object contains Google OAuth linked account

### 7. Expected Successful Flow

```
1. User clicks "Login with Google"
2. Privy modal opens with Google option
3. User clicks Google → redirected to Google OAuth
4. User consents → redirected back to Privy
5. Privy creates/links account → calls onSuccess
6. User object contains linkedAccounts with type: 'google_oauth'
```

### 8. Configuration Checklist

- [ ] PUBLIC_PRIVY_APP_ID set in .env
- [ ] PRIVY_APP_SECRET set in .env
- [ ] Google OAuth enabled in Privy Dashboard
- [ ] Redirect URIs configured correctly
- [ ] Google Cloud Console OAuth client setup
- [ ] Domain whitelist includes localhost:4321
- [ ] Browser allows third-party cookies
- [ ] No ad blockers interfering with OAuth flow

### 9. Contact Points for Issues

If issues persist:
1. Check Privy Dashboard logs/analytics
2. Review Google Cloud Console OAuth errors
3. Test with different browsers (incognito mode)
4. Try on different networks (mobile hotspot)

### 10. Environment Variable Template

```bash
# .env file should contain:
PUBLIC_PRIVY_APP_ID=cmeaj35yf006oic0cyhhppt65
PRIVY_APP_SECRET=2Gw2fBeZnrrjnSuEaSLssS7VceqvYfd9EnNi2PNQxznpV4J6dY4stZ52iVNqUJ8W3U5iYtcAe6rt1MJ5MSxwikT2
JWKS_SIGNING_KEY=https://auth.privy.io/api/v1/apps/cmeaj35yf006oic0cyhhppt65/jwks.json
```