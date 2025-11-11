// UK Student Life Optimization Type Definitions

// Core location and coordinate types
export interface Location {
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  type: 'home' | 'university' | 'gym' | 'store' | 'transport' | 'other';
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Inventory Management
export interface InventoryItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  purchase_date?: Date;
  store?: string;
  cost?: number;
  category: string;
  location: 'fridge' | 'pantry' | 'freezer';
  created_at: Date;
  updated_at: Date;
}

export interface InventoryStatus {
  total_items: number;
  expiring_soon: InventoryItem[];
  low_stock: InventoryItem[];
  categories: Record<string, number>;
}

// Meal Planning
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  cooking_time: number; // minutes
  prep_time: number; // minutes
  difficulty: 1 | 2 | 3 | 4 | 5;
  servings: number;
  nutrition: NutritionInfo;
  storage_info: StorageInfo;
  bulk_cooking_multiplier: number;
  tags: string[];
  is_public: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
  substitutes?: string[];
}

export interface NutritionInfo {
  calories?: number;
  protein?: number; // grams
  carbs?: number; // grams
  fat?: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
}

export interface StorageInfo {
  fridge_days?: number;
  freezer_days?: number;
  pantry_days?: number;
  reheating_instructions?: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start_date: Date;
  meals: WeeklyMeals;
  shopping_list: ShoppingItem[];
  total_cost?: number;
  nutrition_summary: NutritionInfo;
  created_at: Date;
  updated_at: Date;
}

export interface WeeklyMeals {
  [date: string]: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
    snacks?: Recipe[];
  };
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  estimated_cost?: number;
  store_preference?: string;
  priority: 'essential' | 'preferred' | 'optional';
  category: string;
}

export interface OptimizedShoppingList {
  items: ShoppingItem[];
  stores: StoreRecommendation[];
  total_estimated_cost: number;
  estimated_time: number; // minutes
}

export interface StoreRecommendation {
  store: Store;
  items: ShoppingItem[];
  subtotal: number;
  travel_time: number;
  priority_score: number;
}

// Travel and Transportation
export interface TravelRoute {
  id: string;
  user_id: string;
  from_location: string;
  to_location: string;
  preferred_method: 'bike' | 'train' | 'walk' | 'bus';
  duration_minutes: number;
  cost_pence: number;
  weather_conditions: WeatherConditions;
  frequency_used: number;
  last_used?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RouteInfo {
  distance: number; // meters
  duration: number; // minutes
  elevation: number; // meters
  difficulty: 'easy' | 'moderate' | 'hard';
  weather_suitability: number; // 0-1 score
  safety_rating: number; // 1-5 stars
  cost: number; // pence
}

export interface TravelPlan {
  date: Date;
  routes: TravelRoute[];
  total_cost: number;
  total_time: number;
  weather_considerations: string[];
  alternatives: TravelRoute[];
}

export interface WeatherConditions {
  temperature?: number; // celsius
  condition?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  precipitation_chance?: number; // 0-100%
  wind_speed?: number; // km/h
}

export interface WeatherData {
  date: Date;
  conditions: WeatherConditions;
  hourly_forecast?: WeatherConditions[];
}

// Financial Management
export interface UKStudentExpense {
  id: string;
  user_id: string;
  amount: number;
  currency: 'GBP' | 'USD' | 'EUR';
  description?: string;
  category: string;
  store?: string;
  location?: string;
  payment_method: 'monzo' | 'iq-prepaid' | 'icici-uk' | 'cash' | 'card';
  receipt_data: ReceiptData;
  transaction_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ReceiptData {
  store?: string;
  items?: ReceiptItem[];
  total?: number;
  date?: Date;
  confidence?: number; // OCR confidence 0-1
  raw_text?: string;
  requires_manual_input?: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

export interface UKBankAccount {
  type: 'monzo' | 'iq-prepaid' | 'icici-uk';
  balance: number;
  currency: 'GBP';
  last_sync: Date;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category?: string;
  merchant?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  weekly_limit?: number;
  monthly_limit?: number;
  current_weekly_spent: number;
  current_monthly_spent: number;
  week_start_date: Date;
  month_start_date: Date;
  alert_threshold: number; // 0-1
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetAnalysis {
  weekly_spending: number;
  monthly_spending: number;
  category_breakdown: Record<string, number>;
  budget_health: BudgetHealth;
  savings_opportunities: Recommendation[];
}

export interface BudgetHealth {
  score: number; // 0-100
  status: 'good' | 'warning' | 'critical';
  recommendations: string[];
}

export interface SpendingAnalytics {
  weekly_trend: number[];
  category_breakdown: Record<string, number>;
  unusual_spending: Alert[];
  savings_opportunities: Recommendation[];
}

// Academic Management
export interface AcademicEvent {
  id: string;
  user_id: string;
  title: string;
  type: 'class' | 'assignment' | 'exam' | 'deadline' | 'study_session';
  start_time: Date;
  end_time?: Date;
  location?: string;
  building?: string;
  importance: 1 | 2 | 3 | 4 | 5;
  preparation_time?: number; // minutes
  travel_time?: number; // minutes
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date: Date;
  estimated_hours: number;
  progress: number; // 0-100%
  priority: 'low' | 'medium' | 'high';
  breakdown_tasks: AssignmentTask[];
}

export interface AssignmentTask {
  id: string;
  title: string;
  estimated_duration: number; // minutes
  completed: boolean;
  due_date?: Date;
}

// Routine Management
export interface Routine {
  id: string;
  user_id: string;
  routine_type: 'morning' | 'evening' | 'skincare' | 'laundry' | 'gym' | 'study';
  name: string;
  steps: RoutineStep[];
  estimated_duration: number; // minutes
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  last_completed?: Date;
  completion_streak: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoutineStep {
  id: string;
  name: string;
  description?: string;
  estimated_duration: number; // minutes
  order: number;
  required: boolean;
  completed?: boolean;
}

export interface RoutineCompletion {
  routine_id: string;
  completed_at: Date;
  steps_completed: string[];
  total_duration: number; // minutes
  notes?: string;
}

// Location and Store Data
export interface Store {
  id: string;
  name: string;
  type: 'store' | 'university' | 'gym' | 'home' | 'transport' | 'other';
  address?: string;
  coordinates?: Coordinates;
  opening_hours: OpeningHours;
  price_level: 'budget' | 'mid' | 'premium';
  user_rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OpeningHours {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

export interface TimeSlot {
  open: string; // HH:MM format
  close: string; // HH:MM format
  closed?: boolean;
}

// User Preferences
export interface UKStudentPreferences {
  id: string;
  user_id: string;
  home_location: string;
  transport_preference: 'bike' | 'train' | 'mixed';
  cooking_time_limits: CookingTimeLimits;
  dietary_restrictions: string[];
  bulk_cooking_frequency: number; // days
  budget_alert_enabled: boolean;
  weather_notifications: boolean;
  laundry_reminder_enabled: boolean;
  skincare_tracking_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CookingTimeLimits {
  breakfast: number; // minutes
  lunch: number; // minutes
  dinner: number; // minutes
}

export interface TransportPreferences {
  preferred_method: 'bike' | 'train' | 'mixed';
  weather_threshold: number; // 0-1, below which to avoid cycling
  cost_sensitivity: 'low' | 'medium' | 'high';
  time_sensitivity: 'low' | 'medium' | 'high';
}

export interface DietaryPreferences {
  restrictions: string[];
  allergies: string[];
  preferred_cuisines: string[];
  cooking_skill_level: 1 | 2 | 3 | 4 | 5;
  meal_prep_preference: 'daily' | 'batch' | 'mixed';
}

// Utility Types
export interface Alert {
  id: string;
  type: 'budget_exceeded' | 'expiry_warning' | 'weather_alert' | 'routine_reminder';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: Date;
  dismissed?: boolean;
}

export interface Recommendation {
  id: string;
  type: 'cost_saving' | 'time_optimization' | 'health_improvement' | 'routine_adjustment';
  title: string;
  description: string;
  potential_benefit: string;
  effort_required: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// API Response Types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Service Configuration Types
export interface UKLocationServiceConfig {
  google_maps_api_key: string;
  weather_api_key: string;
  default_location: Coordinates;
  cache_duration: number; // minutes
}

export interface MealPlanningServiceConfig {
  max_recipes_per_search: number;
  default_serving_size: number;
  nutrition_api_key?: string;
  recipe_cache_duration: number; // hours
}

export interface FinanceServiceConfig {
  supported_banks: ('monzo' | 'iq-prepaid' | 'icici-uk')[];
  ocr_service: 'google-vision' | 'aws-textract' | 'azure-cognitive';
  ocr_api_key: string;
  default_currency: 'GBP';
}

// Dashboard and UI Types
export interface DashboardData {
  today_schedule: AcademicEvent[];
  weather: WeatherData;
  budget_status: BudgetHealth;
  upcoming_deadlines: Assignment[];
  routine_reminders: Routine[];
  travel_recommendations: TravelRoute[];
  meal_suggestions: Recipe[];
  alerts: Alert[];
}

export interface UKStudentProfile {
  user_id: string;
  preferences: UKStudentPreferences;
  current_location: Location;
  academic_schedule: AcademicEvent[];
  active_routines: Routine[];
  budget_limits: Budget[];
  dietary_preferences: DietaryPreferences;
  transport_preferences: TransportPreferences;
}

// Error Types
export interface UKStudentError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type UKStudentErrorCode = 
  | 'INVALID_LOCATION'
  | 'BUDGET_EXCEEDED'
  | 'RECIPE_NOT_FOUND'
  | 'WEATHER_API_ERROR'
  | 'TRANSPORT_API_ERROR'
  | 'OCR_PROCESSING_ERROR'
  | 'INVALID_MEAL_PLAN'
  | 'ROUTINE_CONFLICT'
  | 'ACADEMIC_SCHEDULE_ERROR';