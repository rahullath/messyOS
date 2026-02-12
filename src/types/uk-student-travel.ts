// UK Student Travel System Types

export interface Location {
  id?: string;
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  type: 'home' | 'university' | 'gym' | 'store' | 'other';
  address?: string;
  buildingCode?: string; // For university buildings
  notes?: string;
}

export interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  windSpeed: number;
  humidity: number;
  precipitation: number;
  visibility: number;
  timestamp: Date;
  forecast?: boolean;
}

export interface TravelRoute {
  id?: string;
  from: Location;
  to: Location;
  method: 'bike' | 'train' | 'walk' | 'bus';
  distance: number; // in meters
  duration: number; // in minutes
  cost: number; // in pence
  elevation: number; // elevation gain in meters
  difficulty: 'easy' | 'moderate' | 'hard';
  weatherSuitability: number; // 0-1 score
  energyRequired: number; // 1-5 scale
  safetyRating: number; // 1-5 scale
  alternatives: TravelRoute[];
  realTimeUpdates?: {
    delays: number; // minutes
    cancellations: boolean;
    alternativeRoutes: TravelRoute[];
  };
}

export interface TravelPreferences {
  preferredMethod: 'bike' | 'train' | 'mixed';
  maxWalkingDistance: number; // in meters
  weatherThreshold: {
    minTemperature: number;
    maxWindSpeed: number;
    maxPrecipitation: number;
  };
  fitnessLevel: 'low' | 'medium' | 'high';
  budgetConstraints: {
    dailyLimit: number; // in pence
    weeklyLimit: number; // in pence
  };
  timePreferences: {
    bufferTime: number; // extra minutes to add
    maxTravelTime: number; // maximum acceptable travel time
  };
  homeLocation?: Location; // User's home location
}

export interface TravelPlan {
  id?: string;
  userId: string;
  date: Date;
  routes: TravelRoute[];
  totalCost: number; // in pence
  totalTime: number; // in minutes
  totalDistance: number; // in meters
  weatherConsiderations: string[];
  energyForecast: {
    morning: number; // 1-5 scale
    afternoon: number;
    evening: number;
  };
  recommendations: string[];
  alternatives: TravelRoute[];
}

export interface TravelConditions {
  weather: WeatherData;
  userEnergy: number; // 1-5 scale
  timeConstraints: {
    departure: Date;
    arrival: Date;
    flexibility: number; // minutes
  };
  postActivityConsiderations?: {
    type: 'gym' | 'class' | 'meeting';
    fatigue: number; // 1-5 scale
    showerNeeded: boolean;
    equipmentToCarry: string[];
  };
}

export interface TrainService {
  line: string;
  departure: Date;
  arrival: Date;
  cost: number; // in pence
  duration: number; // in minutes
  cancelled: boolean;
  delayed: number; // minutes
  platform?: string;
  operator: string;
}

export interface CyclingRoute {
  path: [number, number][]; // Array of coordinates
  elevationProfile: number[]; // Elevation at each point
  surfaceType: 'road' | 'cycle-path' | 'mixed';
  trafficLevel: 'low' | 'medium' | 'high';
  bikeParking: {
    available: boolean;
    secure: boolean;
    covered: boolean;
    cost: number; // in pence
  };
}

export interface TravelCostTracking {
  userId: string;
  date: Date;
  method: 'bike' | 'train' | 'walk' | 'bus';
  route: string;
  cost: number; // in pence
  category: 'daily-commute' | 'gym' | 'shopping' | 'social' | 'other';
  notes?: string;
}

export interface BirminghamLocations {
  fiveWays: Location;
  university: Location;
  sellyOak: Location;
  universityBuildings: {
    [buildingCode: string]: Location;
  };
  gyms: Location[];
  stores: Location[];
  trainStations: Location[];
}

export interface TravelOptimizationResult {
  recommendedRoute: TravelRoute;
  reasoning: string[];
  costSavings: number; // compared to default option
  timeSavings: number; // in minutes
  healthBenefits: string[];
  environmentalImpact: {
    co2Saved: number; // in grams
    caloriesBurned: number;
  };
  riskFactors: string[];
}

export interface TravelServiceConfig {
  apiKeys: {
    googleMaps?: string;
    openWeatherMap?: string;
    trainline?: string;
  };
  birminghamBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  defaultLocations: BirminghamLocations;
  costConstants: {
    trainCostRange: [number, number]; // [min, max] in pence
    bikeMaintenance: number; // cost per km in pence
    walkingCost: number; // essentially 0
  };
}