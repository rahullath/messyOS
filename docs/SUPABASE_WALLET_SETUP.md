# Supabase-Only Authentication with Simulated Web3 Wallet

This setup provides a clean, cost-effective solution using pure Supabase authentication with a simulated Web3 wallet experience for token management.

## 🎯 **What This Gives You**

- **Pure Supabase Authentication** - Email/password and OAuth (Google, GitHub)
- **Simulated Web3 Experience** - Wallet-like UI with realistic addresses  
- **Token Economy** - Automatic deduction for AI usage, rewards for actions
- **Zero Web3 Dependencies** - No Privy, no blockchain, no monthly fees
- **Production Ready** - Proper RLS, security, and error handling

## 📋 **Prerequisites**

- Supabase project created
- Environment variables configured (see your `.env` file)
- No additional services needed!

## 🚀 **Quick Setup**

### Step 1: Run Database Migration

Execute the clean migration to set up your database:

```bash
# Connect to your Supabase database and run:
psql -h db.YOUR_PROJECT_ID.supabase.co -p 5432 -U postgres -d postgres -f supabase-clean-migration.sql

# Or use the Supabase CLI:
supabase db push
```

### Step 2: Replace Authentication Components

Replace your existing auth components with the new simplified ones:

```jsx
// In your main app or page
import { SupabaseWalletDemo } from './components/auth/SupabaseWalletDemo';

export default function App() {
  return <SupabaseWalletDemo />;
}
```

### Step 3: Update API Routes (if needed)

Your existing API routes should work with minimal changes. The middleware now uses:

```typescript
import { withAuth } from '../../lib/auth/middleware';
import { tokenDeductionService } from '../../lib/services/token-deduction';

export const POST = withAuth(async (context, user) => {
  // Deduct tokens for AI usage
  await tokenDeductionService.deductForAIQuery(
    user.id, 
    'AI Processing',
    { feature: 'your_feature_name' }
  );
  
  // Your AI logic here...
});
```

## 🏗️ **Architecture Overview**

### Authentication Flow
1. **User signs up/in** → Supabase handles authentication
2. **Profile created** → Automatic trigger creates user profile
3. **Wallet generated** → Simulated wallet address created
4. **Tokens initialized** → ₹500 starting credit (5000 tokens)

### Token System
- **1 Token = ₹0.10** (10 tokens = ₹1.00)
- **Starting Balance**: ₹500 (5000 tokens)
- **Auto-deduction** for AI features
- **Rewards** for daily login, integrations, etc.

### Database Structure
```
auth.users (Supabase managed)
├── profiles (user info + simulated wallet)
├── user_tokens (balance, earned, spent)
├── token_transactions (full transaction history)
└── integration tables (github, outlook, etc.)
```

## 💰 **Token Economics**

### Default Costs
- **AI Query**: ₹1.00 (10 tokens)
- **Document Generation**: ₹5.00 (50 tokens)
- **Data Analysis**: ₹3.00 (30 tokens)
- **Integration Sync**: ₹2.00 (20 tokens)
- **Premium Features**: ₹10.00 (100 tokens)

### Earning Opportunities
- **Daily Login Bonus**: ₹10.00 (100 tokens)
- **Integration Connection**: ₹50.00 (500 tokens)
- **Referral Bonus**: ₹25.00 (250 tokens)
- **Achievement Unlocks**: Variable

## 🛠️ **Implementation Examples**

### Basic Token Deduction
```typescript
import { tokenDeductionService } from '../lib/services/token-deduction';

// In your AI API route
const success = await tokenDeductionService.deductForAIQuery(
  user.id,
  'GPT Query',
  { 
    model: 'gpt-4',
    tokens_used: 150,
    query_type: 'general'
  }
);

if (!success) {
  return new Response('Insufficient tokens', { status: 402 });
}
```

### Reward Users
```typescript
// Award daily bonus
await tokenDeductionService.awardDailyBonus(user.id);

// Custom reward
await tokenDeductionService.awardTokensForAction(
  user.id,
  'Completed Tutorial',
  250, // ₹25.00
  { achievement: 'tutorial_complete' }
);
```

### Check Balance Before Operations
```typescript
const canAfford = await tokenDeductionService.canAffordService(user.id, 'aiQuery');
if (!canAfford) {
  return { error: 'Insufficient balance' };
}
```

## 🎨 **UI Components Available**

### 1. Complete Demo (`SupabaseWalletDemo`)
Full authentication + wallet experience with demo actions

### 2. Auth Only (`SupabaseAuth`)
Just the authentication component

### 3. Wallet Only (`SimulatedWallet`)
Just the wallet interface for existing users

### 4. Standalone Service (`authService`, `tokenDeductionService`)
Backend services for your custom implementations

## 🔧 **Customization**

### Adjust Token Costs
```typescript
// In token-deduction.ts
export const DEFAULT_TOKEN_COSTS = {
  aiQuery: 20,              // ₹2.00 instead of ₹1.00
  documentGeneration: 100,  // ₹10.00 instead of ₹5.00
  // ... etc
};
```

### Custom Wallet Address Format
```sql
-- In your migration, modify the generate_simulated_wallet_address function
CREATE OR REPLACE FUNCTION generate_simulated_wallet_address()
RETURNS TEXT AS $$
BEGIN
  -- Generate different format, e.g., "mesh_" prefix
  RETURN 'mesh_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Add New Service Types
```typescript
// Extend the TokenDeductionConfig interface
export interface TokenDeductionConfig {
  aiQuery: number;
  documentGeneration: number;
  dataAnalysis: number;
  integration: number;
  premium: number;
  // Add your new service
  customService: number;
}
```

## 📊 **Analytics & Monitoring**

### User Spending Analytics
```typescript
const analytics = await tokenDeductionService.getUserSpendingAnalytics(userId, 30);
console.log(analytics);
// {
//   totalSpent: 1250,
//   serviceBreakdown: { ai_query: 800, document_generation: 450 },
//   averageDaily: 41.67,
//   topServices: [...]
// }
```

### Database Analytics
```sql
-- Top spending users
SELECT u.email, SUM(ABS(t.amount)) as total_spent
FROM auth.users u
JOIN token_transactions t ON u.id = t.user_id
WHERE t.transaction_type = 'deduction'
GROUP BY u.id, u.email
ORDER BY total_spent DESC;

-- Service usage trends
SELECT 
  metadata->>'service_type' as service,
  COUNT(*) as usage_count,
  SUM(ABS(amount)) as total_spent
FROM token_transactions
WHERE transaction_type = 'deduction'
GROUP BY metadata->>'service_type';
```

## 🔒 **Security Features**

- **RLS Policies**: All data isolated per user
- **Server-side Validation**: Token operations validated on backend
- **Audit Trail**: Complete transaction history
- **Rate Limiting**: Can be added to prevent abuse

## 🚀 **Production Deployment**

1. **Environment Variables**: Ensure all Supabase vars are set in production
2. **Database Migration**: Run the migration on production database
3. **Testing**: Test sign-up flow creates wallet and tokens properly
4. **Monitoring**: Set up alerts for low token balances or failed transactions
5. **Backup**: Regular database backups for transaction history

## 💡 **Benefits Over Web3 Approach**

- **No Monthly Fees**: $0 vs $1000+ for Privy
- **Simpler Integration**: No blockchain complexity
- **Faster Transactions**: Instant database updates
- **Better UX**: No wallet connection steps
- **Compliance Friendly**: No crypto regulations to worry about
- **Scalable**: Pure database operations

## 🔄 **Migration from Previous System**

If you have existing Privy-based data, you can migrate:

1. Export user data from Privy tables
2. Create Supabase accounts for users (via Auth API)
3. Transfer token balances to new `user_tokens` table
4. Update foreign keys to reference Supabase user IDs
5. Archive old Privy tables

This system gives you all the benefits of Web3 UX without any of the complexity or costs!