# UK Student Financial System

A comprehensive financial management system designed specifically for UK students, with features tailored for Birmingham-based students managing expenses, budgets, and financial health.

## Features

### 🏦 Multi-Bank Integration
- **Monzo**: CSV statement parsing with category support
- **iQ Prepaid**: University card transaction parsing
- **ICICI UK**: International student account support
- **Generic CSV**: Support for other bank formats

### 💰 Expense Management
- **Smart Categorization**: Automatic expense categorization based on description and store
- **Receipt OCR**: Google Vision API integration for receipt scanning
- **Manual Entry**: Fallback for failed OCR with structured item entry
- **Tags & Notes**: Flexible expense organization
- **Recurring Expenses**: Track subscription and regular payments

### 📊 Budget Management
- **Category Budgets**: Weekly/monthly limits for groceries, transport, utilities, etc.
- **Budget Templates**: Pre-configured budgets for UK students
- **Real-time Alerts**: Notifications at 80% threshold and when exceeded
- **Budget Health**: Overall financial health scoring (0-100)
- **Pot System**: Separate budgets for different expense categories

### 🔍 Price Intelligence
- **Overpaying Detection**: Alerts when paying significantly above average prices
- **Price References**: Database of typical UK prices for common items
- **Store Comparison**: Recommendations for budget-friendly alternatives
- **Savings Opportunities**: AI-powered suggestions for reducing expenses

### 📈 Analytics & Insights
- **Spending Trends**: Daily, weekly, monthly spending patterns
- **Category Breakdown**: Detailed analysis by expense category
- **Store Analysis**: Track spending by retailer
- **Payment Method Tracking**: Monitor cash vs card usage
- **Savings Insights**: Identify opportunities to reduce costs

### 🎯 UK Student Specific Features
- **Birmingham Integration**: Local store awareness and pricing
- **University Costs**: Education-specific expense categories
- **Student Lifestyle**: Categories for fitness, entertainment, personal care
- **Transport Optimization**: Train vs bike cost analysis
- **Accommodation Costs**: Utilities and household expense tracking

## Architecture

### Service Layer
```typescript
// Core service for all financial operations
UKFinanceService
├── Expense Management (CRUD operations)
├── Budget Management (creation, monitoring, alerts)
├── Receipt Processing (OCR + manual entry)
├── Bank Integration (statement parsing)
├── Price Comparison (overpaying detection)
├── Analytics (insights and trends)
└── Templates (budget suggestions)
```

### Data Models
```typescript
// Primary data structures
UKStudentExpense     // Individual transactions
UKStudentBudget      // Budget limits and tracking
UKBankAccount        // Bank account integration
UKStudentReceipt     // Receipt processing results
PriceReference       // Price comparison data
BudgetAlert          // Notifications and warnings
SpendingInsight      // AI-generated recommendations
```

### Components
```typescript
// React components for UI
BudgetManager        // Budget creation and monitoring
ExpenseTracker       // Expense entry and management
ReceiptScanner       // OCR and manual receipt entry
SpendingAnalytics    // Charts and insights display
BudgetAlerts         // Notification management
```

## API Endpoints

### Expenses
- `GET /api/uk-student/expenses` - Fetch expenses with filtering
- `POST /api/uk-student/expenses` - Create new expense
- `PUT /api/uk-student/expenses` - Update existing expense
- `DELETE /api/uk-student/expenses` - Delete expense

### Budgets
- `GET /api/uk-student/budgets` - Fetch budgets and health
- `POST /api/uk-student/budgets` - Create new budget
- `PUT /api/uk-student/budgets` - Update budget
- `DELETE /api/uk-student/budgets` - Delete budget

### Receipts
- `POST /api/uk-student/receipts` - Process receipt OCR
- `GET /api/uk-student/receipts` - Fetch receipt history

### Analytics
- `GET /api/uk-student/analytics` - Get spending analytics and insights

### Alerts
- `GET /api/uk-student/alerts` - Fetch budget alerts
- `PUT /api/uk-student/alerts` - Mark alerts as read/dismissed

## Database Schema

### Core Tables
```sql
uk_student_expenses          -- Transaction records
uk_student_budgets           -- Budget definitions
uk_student_bank_accounts     -- Bank account info
uk_student_receipts          -- Receipt processing
uk_student_price_references  -- Price comparison data
uk_student_budget_alerts     -- Notifications
uk_student_spending_insights -- AI insights
uk_student_budget_templates  -- Default budgets
```

### Key Features
- **Row Level Security**: User data isolation
- **Automatic Triggers**: Budget updates and alert generation
- **Indexes**: Optimized for common queries
- **JSONB Support**: Flexible metadata storage

## Usage Examples

### Adding an Expense
```typescript
const expense = await ukFinanceService.addExpense({
  userId: 'user-123',
  amount: 12.50,
  description: 'Groceries at Aldi',
  category: 'groceries',
  store: 'Aldi',
  paymentMethod: 'card',
  transactionDate: new Date(),
  isRecurring: false,
  tags: ['weekly-shop']
});
```

### Creating a Budget
```typescript
const budget = await ukFinanceService.createBudget({
  userId: 'user-123',
  category: 'groceries',
  budgetType: 'weekly',
  limitAmount: 40.00,
  periodStart: new Date('2024-11-11'),
  periodEnd: new Date('2024-11-17'),
  alertThreshold: 0.8,
  isActive: true
});
```

### Processing a Receipt
```typescript
const receiptData = await ukFinanceService.processReceiptOCR(file);
// Returns: { store, items, total, date, confidence }
```

### Getting Analytics
```typescript
const analytics = await ukFinanceService.getSpendingAnalytics(userId, {
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30'),
  groupBy: 'day'
});
```

## Configuration

### Environment Variables
```env
PUBLIC_GOOGLE_VISION_API_KEY=your_api_key_here
```

### Database Setup
1. Run the schema migration: `database/uk-student-financial-schema.sql`
2. Seed with sample data (optional)
3. Configure Row Level Security policies

### API Integration
1. Set up Google Vision API for receipt OCR
2. Configure Supabase connection
3. Set up authentication middleware

## Testing

### Test Coverage
- **Unit Tests**: Service methods and validation logic
- **Component Tests**: React component behavior
- **Integration Tests**: API endpoints and database operations
- **End-to-End Tests**: Complete user workflows

### Running Tests
```bash
# Run all financial tests
npm test src/test/uk-student/

# Run specific test suites
npm test src/test/uk-student/financial-integration.test.ts
npm test src/test/uk-student/financial-components.test.tsx
npm test src/test/uk-student/financial-api.test.ts
```

## Error Handling

### Service Errors
- **UKFinanceError**: Base error class with error codes
- **ReceiptProcessingError**: OCR and receipt-specific errors
- **BudgetValidationError**: Budget creation/update errors
- **BankIntegrationError**: Statement parsing errors

### Graceful Degradation
- OCR failures fall back to manual entry
- API failures use cached data when available
- Validation errors provide clear user feedback
- Database errors are logged and reported

## Performance Considerations

### Optimization Strategies
- **Database Indexing**: Optimized queries for common operations
- **Caching**: Route and price data caching for offline use
- **Lazy Loading**: Components load data as needed
- **Batch Operations**: Bulk expense imports and updates

### Monitoring
- API response times tracked
- Database query performance monitored
- OCR processing success rates logged
- User engagement metrics collected

## Security

### Data Protection
- **Row Level Security**: Database-level user isolation
- **Input Validation**: All user inputs sanitized
- **API Authentication**: Secure endpoint access
- **PII Handling**: Sensitive data properly hashed/encrypted

### Privacy Considerations
- Bank account numbers are hashed
- Receipt images can be deleted after processing
- User data is never shared between accounts
- GDPR compliance for data deletion

## Future Enhancements

### Planned Features
- **Open Banking Integration**: Real-time bank account sync
- **AI Spending Predictions**: Machine learning for budget forecasting
- **Social Features**: Anonymous spending comparisons with peers
- **Investment Tracking**: Student savings and investment monitoring
- **Mobile App**: Native iOS/Android applications

### Technical Improvements
- **Real-time Notifications**: WebSocket-based alerts
- **Advanced OCR**: Custom receipt parsing models
- **Offline Sync**: Full offline capability with sync
- **Performance Optimization**: Further database and API improvements

## Support

### Common Issues
1. **OCR Not Working**: Check Google Vision API key configuration
2. **Budget Alerts Not Triggering**: Verify database triggers are active
3. **Bank Statement Parsing Fails**: Check file format and bank type
4. **Components Not Loading**: Verify API endpoints are accessible

### Debugging
- Enable verbose logging in development
- Check browser console for client-side errors
- Monitor API response codes and timing
- Verify database connection and permissions

### Contributing
1. Follow existing code patterns and conventions
2. Add tests for new features and bug fixes
3. Update documentation for API changes
4. Consider UK student-specific use cases in design

---

This financial system provides a comprehensive solution for UK students to manage their finances effectively, with intelligent features that understand the unique challenges of student life in Birmingham and the UK.