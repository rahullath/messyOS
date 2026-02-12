# UK Student Meal Planning System

A comprehensive meal planning, inventory management, and shopping optimization system designed specifically for UK students in Birmingham.

## Overview

This system addresses the specific challenges faced by UK students:
- Limited cooking time between classes
- Budget constraints (£40-50/week food budget)
- Limited kitchen storage space
- Need for nutritious, quick meals
- Optimization for local Birmingham stores (Aldi, Tesco, Sainsbury's, etc.)

## Features

### 🍽️ Meal Planning
- **Weekly meal generation** based on available ingredients, time constraints, and budget
- **Recipe scoring algorithm** that considers ingredient availability, cooking time, and difficulty
- **Bulk cooking recommendations** for meal prep and storage optimization
- **Nutritional balance** tracking across the week
- **Drag-and-drop meal planning** interface for easy customization

### 📦 Inventory Management
- **Multi-location tracking** (fridge, pantry, freezer)
- **Expiry date monitoring** with smart alerts
- **Automatic categorization** of food items
- **Low stock notifications** to prevent running out of essentials
- **Cost tracking** to monitor spending per item

### 🛒 Shopping Optimization
- **Store route optimization** considering Birmingham locations
- **Price comparison** across Aldi, Tesco, Sainsbury's, Premier, and University stores
- **Travel time calculation** for cycling vs. train transport
- **Weather-aware recommendations** (bike when sunny, train when rainy)
- **Bulk buying suggestions** for cost savings

### 🧠 Recipe Intelligence
- **Ingredient substitution** suggestions when items are unavailable
- **Complementary recipe** recommendations for balanced nutrition
- **Difficulty scaling** based on cooking skill level
- **Time-based filtering** for busy schedules
- **Dietary restriction** support (vegetarian, vegan, gluten-free, etc.)

## Architecture

### Core Services

#### MealPlanningService
```typescript
class MealPlanningService {
  generateWeeklyPlan(constraints: MealConstraints): Promise<MealPlan>
  suggestRecipes(ingredients: string[], maxTime: number): Promise<Recipe[]>
  calculateBulkCooking(recipe: Recipe, days: number): BulkCookingInfo
}
```

#### InventoryService
```typescript
class InventoryService {
  getAllInventory(): Promise<InventoryItem[]>
  addInventoryItem(item: InventoryUpdateRequest): Promise<InventoryItem>
  getExpiryAlerts(): Promise<ExpiryAlert[]>
  bulkUpdateInventory(items: InventoryUpdateRequest[]): Promise<InventoryItem[]>
}
```

#### RecipeEngine
```typescript
class RecipeEngine {
  static scoreRecipes(recipes: Recipe[], constraints: RecipeConstraints): RecipeScore[]
  static findMakeableRecipes(recipes: Recipe[], inventory: InventoryItem[]): RecipeScore[]
  static suggestBulkCookingRecipes(recipes: Recipe[], constraints: RecipeConstraints): RecipeScore[]
}
```

#### ShoppingOptimizer
```typescript
class ShoppingOptimizer {
  optimizeShoppingList(items: ShoppingItem[], stores: Store[]): Promise<OptimizedShoppingList>
  findCheapestCombination(items: ShoppingItem[], stores: Store[]): Promise<StoreRecommendation[]>
  findFastestRoute(items: ShoppingItem[], stores: Store[]): Promise<StoreRecommendation[]>
}
```

### Database Schema

The system uses the following main tables:

- `uk_student_inventory` - Track fridge, pantry, and freezer items
- `uk_student_recipes` - Recipe database with ingredients and instructions
- `uk_student_meal_plans` - Weekly meal plans with shopping lists
- `uk_student_stores` - Birmingham store locations and information
- `uk_student_preferences` - User preferences and dietary restrictions

## Usage Examples

### Generate a Weekly Meal Plan

```typescript
const mealPlanningService = new MealPlanningService(userId);

const constraints = {
  budget: 45, // £45 per week
  cookingTimeLimits: {
    breakfast: 10, // 10 minutes max
    lunch: 20,     // 20 minutes max
    dinner: 30     // 30 minutes max
  },
  dietaryRestrictions: ['vegetarian'],
  servings: 1,
  bulkCookingPreference: true
};

const mealPlan = await mealPlanningService.generateWeeklyPlan(constraints);
console.log(`Generated plan costs £${mealPlan.total_cost}`);
```

### Add Inventory Items

```typescript
const inventoryService = new InventoryService(userId);

const newItem = {
  item_name: 'chicken breast',
  quantity: 2,
  unit: 'pieces',
  location: 'fridge',
  expiry_date: new Date('2024-11-20'),
  cost: 5.99,
  store: 'Aldi'
};

const item = await inventoryService.addInventoryItem(newItem);
```

### Optimize Shopping List

```typescript
const locationService = new UKLocationService();
const shoppingOptimizer = new ShoppingOptimizer(locationService);

const shoppingList = [
  { name: 'bread', quantity: 1, unit: 'loaf', priority: 'essential', category: 'bakery' },
  { name: 'milk', quantity: 1, unit: 'liter', priority: 'essential', category: 'dairy' }
];

const stores = await getLocalStores(); // Birmingham stores
const constraints = {
  maxBudget: 20,
  prioritizePrice: true
};

const optimized = await shoppingOptimizer.optimizeShoppingList(shoppingList, stores, constraints);
console.log(`Optimized route visits ${optimized.stores.length} stores`);
```

### Score Recipes by Available Ingredients

```typescript
const constraints = {
  maxCookingTime: 25,
  maxDifficulty: 3,
  availableIngredients: ['pasta', 'tomatoes', 'cheese'],
  dietaryRestrictions: []
};

const recipes = await getRecipes(); // From database
const inventory = await inventoryService.getAllInventory();

const scores = RecipeEngine.scoreRecipes(recipes, constraints, inventory);
const bestRecipe = scores[0]; // Highest scoring recipe

console.log(`Best recipe: ${bestRecipe.recipe.name} (score: ${bestRecipe.score})`);
console.log(`Missing ingredients: ${bestRecipe.missingIngredients.join(', ')}`);
```

## API Endpoints

### Meal Planning
- `GET /api/uk-student/meal-planning/plan` - Get current meal plan
- `POST /api/uk-student/meal-planning/plan/generate` - Generate new meal plan
- `GET /api/uk-student/meal-planning/recipes/suggest` - Get recipe suggestions

### Inventory Management
- `GET /api/uk-student/meal-planning/inventory` - Get all inventory
- `POST /api/uk-student/meal-planning/inventory` - Add inventory item
- `PUT /api/uk-student/meal-planning/inventory/:id` - Update inventory item
- `DELETE /api/uk-student/meal-planning/inventory/:id` - Delete inventory item

### Shopping Optimization
- `POST /api/uk-student/meal-planning/shopping/optimize` - Optimize shopping list

## Components

### React Components

#### MealPlanningDashboard
Main dashboard with drag-and-drop meal planning interface.

```tsx
<MealPlanningDashboard 
  userId="user-123"
  cookingTimeLimits={{ breakfast: 10, lunch: 20, dinner: 30 }}
  budget={50}
  dietaryRestrictions={['vegetarian']}
/>
```

#### InventoryManager
Comprehensive inventory management with expiry tracking.

```tsx
<InventoryManager 
  userId="user-123"
  onInventoryChange={(inventory) => console.log('Updated:', inventory)}
/>
```

#### ShoppingListOptimizer
Shopping route optimization with store recommendations.

```tsx
<ShoppingListOptimizer 
  shoppingList={shoppingItems}
  userId="user-123"
  onOptimizedListChange={(optimized) => console.log('Optimized:', optimized)}
/>
```

## Testing

The system includes comprehensive tests:

```bash
# Run all UK student meal planning tests
npm test -- src/test/uk-student/

# Run integration tests
npm test -- src/test/uk-student/integration.test.ts

# Run specific service tests
npm test -- src/test/uk-student/meal-planning.test.ts
```

### Test Coverage

- ✅ Recipe scoring algorithms
- ✅ Inventory management operations
- ✅ Shopping list optimization
- ✅ Bulk cooking calculations
- ✅ Ingredient substitution logic
- ✅ Expiry date tracking
- ✅ Budget constraint handling

## Birmingham-Specific Features

### Store Integration
- **Aldi Five Ways** - Budget option, 15min cycle
- **Tesco Selly Oak** - 24/7 availability, 20min cycle
- **Sainsbury's University** - On-campus convenience
- **Premier Stores** - Quick essentials, higher prices
- **University Superstore** - Campus-specific items

### Transport Optimization
- **Cycling routes** with elevation and safety considerations
- **Train alternatives** for bad weather (£2.05-2.10 daily cost)
- **Walking distances** for nearby stores
- **Weather integration** for transport recommendations

### Local Considerations
- **University schedule** integration (9am classes, gym timing)
- **Student budget** optimization (£40-50/week typical)
- **Shared kitchen** space constraints
- **Bulk cooking** for limited cooking time
- **Storage optimization** for small fridges/freezers

## Configuration

### Environment Variables
```env
# API Keys
GOOGLE_MAPS_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# UK Student Specific
DEFAULT_LOCATION_LAT=52.4751
DEFAULT_LOCATION_LNG=-1.9180
DEFAULT_BUDGET=50
```

### User Preferences
```typescript
interface UKStudentPreferences {
  home_location: string;
  transport_preference: 'bike' | 'train' | 'mixed';
  cooking_time_limits: CookingTimeLimits;
  dietary_restrictions: string[];
  budget_alert_enabled: boolean;
  weather_notifications: boolean;
}
```

## Future Enhancements

### Planned Features
- 🔄 **Meal plan sharing** with flatmates
- 📱 **Mobile app** with offline functionality
- 🤖 **AI meal suggestions** based on eating patterns
- 📊 **Nutrition tracking** and health insights
- 🏪 **Real-time store prices** and availability
- 📅 **Calendar integration** for automatic meal scheduling
- 💳 **Bank integration** for automatic expense tracking

### Integration Opportunities
- **University timetable** sync
- **Fitness tracker** integration for calorie needs
- **Weather API** for transport decisions
- **Delivery services** (Deliveroo, Uber Eats) integration
- **Social features** for recipe sharing

## Contributing

When contributing to the meal planning system:

1. **Follow the existing patterns** for service classes and components
2. **Add comprehensive tests** for new features
3. **Update type definitions** in `src/types/uk-student.ts`
4. **Consider Birmingham-specific** requirements and constraints
5. **Test with realistic student budgets** and time constraints

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Include error handling and validation
- Write tests for all new functionality

## Support

For issues or questions about the UK Student Meal Planning system:

1. Check the test files for usage examples
2. Review the API documentation above
3. Look at existing components for implementation patterns
4. Consider the specific constraints of UK student life

The system is designed to be practical, cost-effective, and time-efficient for the unique challenges of being a student in Birmingham, UK.