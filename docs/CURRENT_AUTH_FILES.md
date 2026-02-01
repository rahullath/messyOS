# Current Authentication System Files

After cleanup, here are the relevant files for your new Supabase-only authentication system:

## ✅ **Core Files to Use**

### Authentication Services
- **`src/lib/auth/supabase-auth.ts`** - Main authentication service
- **`src/lib/auth/middleware.ts`** - API route authentication middleware  
- **`src/lib/services/token-deduction.ts`** - Token management and auto-deduction

### UI Components
- **`src/components/auth/SupabaseAuth.tsx`** - Standalone auth component
- **`src/components/auth/SupabaseWalletDemo.tsx`** - Complete demo with wallet
- **`src/components/wallet/SimulatedWallet.tsx`** - Wallet interface component

### Database & Setup
- **`supabase-clean-migration.sql`** - Database migration script
- **`SUPABASE_WALLET_SETUP.md`** - Complete setup guide

### API Routes (Updated)
- **`src/pages/api/auth/privy-sync.ts`** - Now handles wallet linking for Supabase users

## 🗑️ **Files Deleted (No Longer Needed)**

### Privy-Related Files
- All `privy-*` components and providers
- `privy-auth.ts` service  
- `hybrid-auth.ts` service
- All Privy documentation files
- All Privy test/demo pages
- `privy-verify.ts` API route

### Old Auth Components
- Various test/prototype auth components
- `SupabaseFirstAuth.tsx` (replaced by `SupabaseAuth.tsx`)
- Old migration files

## 🚀 **Quick Start**

1. **Run Database Migration:**
   ```bash
   psql -h your-db-host -p 5432 -U postgres -d postgres -f supabase-clean-migration.sql
   ```

2. **Use in Your App:**
   ```jsx
   import { SupabaseWalletDemo } from './src/components/auth/SupabaseWalletDemo';
   
   export default function App() {
     return <SupabaseWalletDemo />;
   }
   ```

3. **Add Token Deduction to API Routes:**
   ```typescript
   import { withAuth } from './src/lib/auth/middleware';
   import { tokenDeductionService } from './src/lib/services/token-deduction';
   
   export const POST = withAuth(async (context, user) => {
     await tokenDeductionService.deductForAIQuery(user.id, 'AI Processing');
     // Your AI logic here
   });
   ```

Your authentication system is now clean, simple, and ready to use!