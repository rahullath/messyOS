# Privy Production Implementation Guide

## 🚀 Overview

This implementation provides a production-ready Privy authentication system that:
- ✅ Preserves existing Supabase user accounts
- ✅ Allows email/Google login without forcing wallet creation
- ✅ Provides seamless migration for existing users
- ✅ Maintains backward compatibility during transition

## 🔧 Setup & Configuration

### 1. Environment Variables (Already Configured)
```env
PUBLIC_PRIVY_APP_ID=cmeaj35yf006oic0cyhhppt65
PRIVY_APP_SECRET=2Gw2fBeZnrrjnSuEaSLssS7VceqvYfd9EnNi2PNQxznpV4J6dY4stZ52iVNqUJ8W3U5iYtcAe6rt1MJ5MSxwikT2
```

### 2. Database Migration
Run the safe migration script to enable hybrid auth:

```bash
# Apply the migration to your Supabase database
psql -f database/safe-privy-migration.sql
```

This creates:
- `user_privy_links` table for linking Supabase ↔ Privy accounts
- Hybrid RLS policies supporting both auth systems
- Migration helper functions

## 🔄 Migration Flow

### For Existing Users
1. User logs in with Privy using same email as Supabase account
2. System detects existing Supabase user
3. Migration prompt appears asking user to link accounts
4. If user agrees: data is preserved and linked
5. If user skips: new Privy-only account is created

### For New Users
1. User logs in with Privy
2. New account created in `user_privy_links` table
3. Token balance and preferences initialized

## 🏗️ Architecture

### Components

**ProductionPrivyAuth** (`src/components/auth/ProductionPrivyAuth.tsx`)
- Main auth provider with migration support
- Handles login flow and user sync
- Shows migration prompts for existing users

**Auth Middleware** (`src/lib/auth/middleware.ts`)
- Supports both Supabase and Privy authentication
- Provides unified auth interface for API routes
- Handles RLS context setting

**Enhanced Auth Service** (`src/lib/auth/privy-auth.ts`)
- Production Privy token verification
- User migration logic
- Hybrid user lookup

### API Endpoints

**Migration API** (`/api/auth/migrate-user`)
- `GET` - Check if email needs migration
- `POST` - Link existing Supabase user with Privy account

**Sync API** (`/api/auth/privy-sync`)
- Handles user creation/update after Privy login
- Automatically handles migration during sync

### Hooks

**useAuth** (`src/hooks/useAuth.ts`)
- Unified auth hook for components
- Token balance management
- Migration-aware login

## 🎯 Login Methods Prioritization

Configured to show in this order:
1. **Email** (primary)
2. **Google** (social)
3. **Wallet** (optional)

Wallets are NOT auto-created - users must explicitly request them.

## 🔒 Security Features

- ✅ Production Privy token verification
- ✅ Server-side auth validation
- ✅ Row Level Security (RLS) for both auth systems
- ✅ Secure migration with data integrity checks
- ✅ Fallback auth during transition period

## 📊 Database Structure

### New Tables
- `user_privy_links` - Links Supabase users to Privy accounts
- `migration_candidates` - View of users eligible for migration

### Updated Tables
All existing tables now have optional `privy_user_id` columns alongside existing `user_id` columns, allowing gradual migration.

## 🚦 Production Deployment Steps

1. **Deploy Database Migration**
   ```bash
   # Run the safe migration script
   psql -f database/safe-privy-migration.sql
   ```

2. **Update Environment**
   - Ensure `PRIVY_APP_SECRET` is set
   - Verify `PUBLIC_PRIVY_APP_ID` is correct

3. **Deploy Application**
   - All layouts now use `ProductionPrivyAuth`
   - API routes support hybrid auth
   - Migration flow is automatic

4. **Monitor Migration**
   - Check logs for migration successes/failures
   - Monitor `user_privy_links` table for new links
   - Use `migration_candidates` view to track progress

## 🔄 Rollback Plan

If needed, you can rollback by:
1. Reverting layouts to use original `PrivyProvider`
2. Supabase auth continues working unchanged
3. No data is lost during migration

## 🧪 Testing

### Test Scenarios
1. **New user signup** - Creates Privy-only account
2. **Existing user login** - Shows migration prompt
3. **Migration acceptance** - Links accounts, preserves data
4. **Migration skip** - Creates new account
5. **Already migrated user** - Direct login

### Test Commands
```bash
# Run development server
npm run dev

# Test different user scenarios
# - Try logging in with existing Supabase email
# - Try logging in with new email
# - Test wallet creation (optional)
```

## 📈 Benefits

- **Zero Downtime**: Existing users continue working
- **Data Preservation**: No user data is lost
- **Flexible Login**: Email/social preferred over wallet
- **Future Ready**: Full Privy ecosystem support
- **Gradual Migration**: Users migrate at their own pace

## 🛠️ Usage Examples

### In Components
```tsx
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    login, 
    tokenBalance,
    createWallet // Optional
  } = useAuth();
  
  if (!isAuthenticated) {
    return <button onClick={login}>Login</button>;
  }
  
  return (
    <div>
      <p>Welcome {user.email}!</p>
      <p>Balance: ₹{tokenBalance?.balance || 0}</p>
      {!user.hasWallet && (
        <button onClick={createWallet}>
          Create Wallet (Optional)
        </button>
      )}
    </div>
  );
}
```

### In API Routes
```ts
import { withAuth } from '../../lib/auth/middleware';

export const GET = withAuth(async (context, user) => {
  // user.id works for both Supabase and Privy users
  // user.provider tells you which auth system
  
  return new Response(JSON.stringify({ 
    userId: user.id,
    provider: user.provider 
  }));
});
```

## 🎉 Ready for Production!

Your auth system now supports:
- ✅ Existing Supabase users (preserved)
- ✅ New Privy users (email/Google first)
- ✅ Optional wallet creation
- ✅ Seamless migration
- ✅ Production-grade security