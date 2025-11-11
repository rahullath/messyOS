# UK Student Life Optimization Module

This module provides comprehensive life optimization features specifically designed for UK students, particularly those studying in Birmingham.

## Overview

The UK Student Life Optimization module integrates with the existing MessyOS architecture to provide:

- **Inventory Management**: Track food items, expiry dates, and storage locations
- **Meal Planning**: Generate weekly meal plans with shopping lists optimized for local stores
- **Travel Optimization**: Smart route planning between Five Ways, University, and Selly Oak
- **Financial Budgeting**: Track expenses across UK banks (Monzo, iQ Prepaid, ICICI UK) with OCR receipt processing
- **Academic Management**: Assignment breakdown and study session scheduling
- **Routine Building**: Structured daily routines including skincare, laundry, and personal care
- **Location Intelligence**: Birmingham-specific store locations, opening hours, and price levels

## Database Schema

The module adds the following tables to the existing Supabase database:

- `uk_student_inventory` - Food and item inventory tracking
- `uk_student_meal_plans` - Weekly meal planning and shopping lists
- `uk_student_travel_routes` - Optimized travel routes with usage statistics
- `uk_student_expenses` - UK-specific expense tracking with receipt data
- `uk_student_academic_events` - University schedule and assignment management
- `uk_student_routines` - Personal care and daily routine tracking
- `uk_student_budgets` - Category-based budget limits and spending tracking
- `uk_student_locations` - Birmingham store and location database
- `uk_student_recipes` - Student-friendly recipe database
- `uk_student_preferences` - User preferences and settings

## TypeScript Types

All data models are fully typed in `src/types/uk-student.ts` with comprehensive interfaces for:

- Inventory items and storage management
- Recipes with ingredients and nutrition information
- Travel routes with weather and cost considerations
- Financial expenses with UK banking integration
- Academic events and assignment tracking
- Routines with step-by-step instructions
- Location data with opening hours and price levels

## Validation

The module includes comprehensive validation in `src/lib/uk-student/validation.ts`:

- Business rule validation (reasonable cooking times, travel costs, etc.)
- Data integrity constraints
- Birmingham-specific validations (transport costs, store locations)
- Student lifestyle constraints (budget limits, routine durations)

## Database Utilities

`src/lib/uk-student/database-utils.ts` provides:

- User initialization with default preferences and budgets
- Birmingham location and store data retrieval
- Recipe search and filtering
- Budget tracking and spending updates
- Travel route usage statistics

## Seed Data

The module includes comprehensive seed data for Birmingham:

- **Stores**: Aldi, Tesco, Sainsbury's, Premier, University Superstore
- **Transport**: Five Ways Station, University Station, Selly Oak Station
- **Locations**: University buildings, gyms, residential areas
- **Recipes**: Student-friendly meals with realistic cooking times
- **Routines**: Morning, skincare, and laundry routine templates

## Testing

Comprehensive unit tests in `src/test/uk-student/data-models.test.ts` cover:

- Data model validation for all entity types
- Business logic constraints
- Birmingham-specific validations
- Data integrity checks
- Edge cases and error conditions

## Integration with Existing MessyOS

The module is designed to integrate seamlessly with existing MessyOS features:

- **Habits System**: Routine tracking integrates with existing habit tracking
- **Task System**: Academic assignments create tasks in the existing task system
- **Finance System**: UK expenses integrate with existing financial tracking
- **Calendar System**: Academic events sync with the existing calendar

## Usage

### Initialize User Data
```typescript
import { ukStudentDb } from '../lib/uk-student/database-utils';

// Initialize UK student data for new user
await ukStudentDb.initializeUserData(userId);
```

### Validate Data
```typescript
import { validateExpense, validateRecipe } from '../lib/uk-student/validation';

// Validate expense before saving
const result = validateExpense(expenseData);
if (!result.valid) {
  console.error('Validation error:', result.error);
}
```

### Get Birmingham Locations
```typescript
// Get all Birmingham stores and locations
const locations = await ukStudentDb.getBirminghamLocations();

// Search for recipes
const recipes = await ukStudentDb.searchRecipes('pasta', ['quick', 'budget']);
```

## Future Enhancements

The module is designed to be extensible for future features:

- AI-powered meal planning based on preferences and budget
- Real-time transport API integration
- Weather-based activity recommendations
- Automated expense categorization with machine learning
- Social features for sharing recipes and routines with other students
- Integration with university systems for automatic schedule import

## Birmingham-Specific Features

The module includes specific optimizations for Birmingham students:

- **Transport**: £2.05-2.10 train fares between Five Ways and University
- **Stores**: Local store locations with accurate opening hours and price levels
- **Routes**: Cycling routes considering Birmingham's elevation and weather
- **Budget**: Realistic budget limits for UK student lifestyle
- **Academic**: University of Birmingham specific locations and schedules