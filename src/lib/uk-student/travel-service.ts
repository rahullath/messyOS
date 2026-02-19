import type { 
  TravelRoute, 
  Location, 
  WeatherData, 
  TravelPreferences, 
  TravelConditions,
  TravelPlan,
  TravelOptimizationResult,
  TrainService,
  CyclingRoute,
  TravelCostTracking
} from '../../types/uk-student-travel';

export class TravelService {
  private readonly TRAIN_COST_PENCE = 205; // £2.05 base cost
  private readonly BIKE_PARKING_TIME = 5; // minutes
  private readonly LIFT_ACCESS_TIME = 3; // minutes
  private readonly POST_WORKOUT_FATIGUE_MULTIPLIER = 1.3;
  
  // Birmingham-specific locations
  private readonly LOCATIONS = {
    FIVE_WAYS: {
      name: 'Five Ways Station',
      coordinates: [52.4751, -1.9180] as [number, number],
      type: 'other' as const,
      address: 'Five Ways Station, Birmingham B16 0SP'
    },
    UNIVERSITY: {
      name: 'University of Birmingham',
      coordinates: [52.4508, -1.9305] as [number, number],
      type: 'university' as const,
      address: 'University of Birmingham, Edgbaston, Birmingham B15 2TT'
    },
    SELLY_OAK: {
      name: 'Selly Oak Station',
      coordinates: [52.4373, -1.9364] as [number, number],
      type: 'other' as const,
      address: 'Selly Oak Station, Birmingham B29 6NA'
    },
    SELLY_OAK_GYM: {
      name: 'Selly Oak Gym',
      coordinates: [52.4380, -1.9350] as [number, number],
      type: 'gym' as const,
      address: 'Selly Oak, Birmingham B29'
    }
  };

  /**
   * Determines optimal transport method based on weather, schedule, and energy levels
   */
  async getOptimalRoute(
    from: Location,
    to: Location,
    conditions: TravelConditions,
    preferences: TravelPreferences
  ): Promise<TravelRoute> {
    const routes = await this.calculateAllRoutes(from, to, conditions);
    
    // Score each route based on multiple factors
    const scoredRoutes = routes.map(route => ({
      ...route,
      score: this.calculateRouteScore(route, conditions, preferences)
    }));

    // Return the highest scoring route
    const optimal = scoredRoutes.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return optimal;
  }

  /**
   * Calculate all possible routes between two locations
   */
  private async calculateAllRoutes(
    from: Location,
    to: Location,
    conditions: TravelConditions
  ): Promise<TravelRoute[]> {
    const routes: TravelRoute[] = [];

    // Calculate bike route
    const bikeRoute = await this.calculateBikeRoute(from, to, conditions);
    if (bikeRoute) routes.push(bikeRoute);

    // Calculate train route
    const trainRoute = await this.calculateTrainRoute(from, to, conditions);
    if (trainRoute) routes.push(trainRoute);

    // Calculate walking route (for short distances)
    const walkingDistance = this.calculateDistance(from.coordinates, to.coordinates);
    if (walkingDistance < 1.5) { // Less than 1.5km
      const walkRoute = await this.calculateWalkingRoute(from, to, conditions);
      if (walkRoute) routes.push(walkRoute);
    }

    return routes;
  }

  /**
   * Calculate bike route with weather and energy considerations
   */
  private async calculateBikeRoute(
    from: Location,
    to: Location,
    conditions: TravelConditions
  ): Promise<TravelRoute | null> {
    const distance = this.calculateDistance(from.coordinates, to.coordinates);
    const elevation = await this.getElevationChange(from, to);
    
    // Base cycling time (assuming 15 km/h average in Birmingham)
    let duration = (distance / 15) * 60; // minutes
    
    // Adjust for elevation
    duration += elevation * 0.5; // 30 seconds per meter of elevation
    
    // Add parking and access time
    duration += this.BIKE_PARKING_TIME + this.LIFT_ACCESS_TIME;
    
    // Weather adjustments
    const weatherMultiplier = this.getWeatherMultiplier(conditions.weather, 'bike');
    duration *= weatherMultiplier;
    
    // Energy level adjustments
    if (conditions.userEnergy <= 2) {
      duration *= 1.2;
    } else if (conditions.userEnergy >= 4) {
      duration *= 0.9;
    }

    // Post-workout fatigue consideration
    if (conditions.postActivityConsiderations?.fatigue && 
        conditions.postActivityConsiderations.fatigue >= 3) {
      duration *= this.POST_WORKOUT_FATIGUE_MULTIPLIER;
    }

    return {
      from,
      to,
      method: 'bike',
      distance: distance * 1000, // Convert to meters
      duration: Math.round(duration),
      cost: 0, // No direct cost for cycling
      elevation,
      difficulty: elevation > 30 ? 'hard' : elevation > 15 ? 'moderate' : 'easy',
      weatherSuitability: this.getWeatherSuitability(conditions.weather, 'bike'),
      energyRequired: this.calculateEnergyRequired('bike', distance, elevation),
      safetyRating: 4, // Generally safe cycling in Birmingham
      alternatives: []
    };
  }

  /**
   * Calculate train route with real-time disruption handling
   */
  private async calculateTrainRoute(
    from: Location,
    to: Location,
    conditions: TravelConditions
  ): Promise<TravelRoute | null> {
    // Check if locations are train-accessible
    if (!this.isTrainAccessible(from) || !this.isTrainAccessible(to)) {
      return null;
    }

    // Base train journey time between Five Ways and University
    let duration = 12; // minutes for Five Ways to University
    
    // Add walking time to/from stations
    duration += this.getWalkingTimeToStation(from);
    duration += this.getWalkingTimeFromStation(to);
    
    // Check for real-time disruptions
    const disruptions = await this.checkTrainDisruptions();
    if (disruptions.length > 0) {
      duration += 15; // Add delay buffer
    }

    // Weather doesn't significantly affect train travel
    const weatherMultiplier = this.getWeatherMultiplier(conditions.weather, 'train');
    duration *= weatherMultiplier;

    return {
      from,
      to,
      method: 'train',
      distance: this.calculateDistance(from.coordinates, to.coordinates) * 1000, // Convert to meters
      duration: Math.round(duration),
      cost: this.TRAIN_COST_PENCE,
      elevation: 0, // Trains don't have elevation changes
      difficulty: 'easy',
      weatherSuitability: this.getWeatherSuitability(conditions.weather, 'train'),
      energyRequired: this.calculateEnergyRequired('train', 0, 0),
      safetyRating: 5, // Very safe
      alternatives: []
    };
  }

  /**
   * Calculate walking route for short distances
   */
  private async calculateWalkingRoute(
    from: Location,
    to: Location,
    conditions: TravelConditions
  ): Promise<TravelRoute | null> {
    const distance = this.calculateDistance(from.coordinates, to.coordinates);
    
    // Average walking speed: 5 km/h
    let duration = (distance / 5) * 60; // minutes
    
    // Weather adjustments for walking
    const weatherMultiplier = this.getWeatherMultiplier(conditions.weather, 'walk');
    duration *= weatherMultiplier;
    
    // Energy level adjustments
    if (conditions.userEnergy <= 2) {
      duration *= 1.3;
    }

    return {
      from,
      to,
      method: 'walk',
      distance: distance * 1000, // Convert to meters
      duration: Math.round(duration),
      cost: 0,
      elevation: 0, // Simplified for walking
      difficulty: 'easy',
      weatherSuitability: this.getWeatherSuitability(conditions.weather, 'walk'),
      energyRequired: this.calculateEnergyRequired('walk', distance, 0),
      safetyRating: 4, // Generally safe walking
      alternatives: []
    };
  }

  /**
   * Score a route based on multiple factors
   */
  private calculateRouteScore(
    route: TravelRoute,
    conditions: TravelConditions,
    preferences: TravelPreferences
  ): number {
    let score = 100; // Base score

    // Time preference (shorter is better)
    score -= route.duration * 0.5;

    // Cost preference (cheaper is better)
    score -= route.cost * 0.1;

    // Weather suitability
    score += route.weatherSuitability * 20;

    // Energy considerations
    if (conditions.userEnergy <= 2 && route.energyRequired > 3) {
      score -= 30; // Penalize high-energy routes when tired
    }

    // User preferences
    if (preferences.preferredMethod === route.method) {
      score += 25;
    }

    // Schedule urgency - prefer faster, more reliable options
    const timeBuffer = conditions.timeConstraints.flexibility;
    if (timeBuffer < 10 && route.method === 'train') {
      score += 15; // Prefer reliable train when urgent
    }

    // Post-workout considerations
    if (conditions.postActivityConsiderations?.type === 'gym' && 
        conditions.postActivityConsiderations.fatigue >= 3 && 
        route.method === 'bike') {
      score -= 20; // Discourage cycling after intense workout
    }

    return Math.max(0, score);
  }

  /**
   * Get weather multiplier for different transport methods
   */
  private getWeatherMultiplier(weather: WeatherData, method: 'bike' | 'train' | 'walk'): number {
    const { condition, temperature, windSpeed, precipitation } = weather;

    switch (method) {
      case 'bike':
        if (condition === 'rainy' || precipitation > 5) return 1.8;
        if (condition === 'snowy') return 2.5;
        if (windSpeed > 20) return 1.3;
        if (temperature < 0) return 1.4;
        return 1.0;

      case 'train':
        // Trains are mostly weather-independent
        if (condition === 'snowy') return 1.2; // Slight delays possible
        return 1.0;

      case 'walk':
        if (condition === 'rainy' || precipitation > 2) return 1.5;
        if (condition === 'snowy') return 2.0;
        if (temperature < 0) return 1.3;
        return 1.0;

      default:
        return 1.0;
    }
  }

  /**
   * Get weather suitability score (0-1)
   */
  private getWeatherSuitability(weather: WeatherData, method: 'bike' | 'train' | 'walk'): number {
    const { condition, temperature, windSpeed, precipitation } = weather;

    switch (method) {
      case 'bike':
        if (condition === 'sunny' && temperature > 5 && temperature < 25) return 1.0;
        if (condition === 'cloudy' && temperature > 0) return 0.8;
        if (condition === 'rainy' || precipitation > 5) return 0.2;
        if (condition === 'snowy') return 0.1;
        return 0.6;

      case 'train':
        return 0.9; // Almost always suitable

      case 'walk':
        if (condition === 'sunny' && temperature > 10) return 0.9;
        if (condition === 'cloudy' && temperature > 5) return 0.7;
        if (condition === 'rainy') return 0.3;
        if (condition === 'snowy') return 0.2;
        return 0.6;

      default:
        return 0.5;
    }
  }

  /**
   * Calculate energy required for a route (1-5 scale)
   */
  private calculateEnergyRequired(
    method: 'bike' | 'train' | 'walk',
    distance: number,
    elevation: number
  ): number {
    switch (method) {
      case 'bike':
        let energy = distance * 0.5; // Base energy per km (adjusted for 1-5 scale)
        energy += elevation * 0.02; // Additional energy for elevation
        return Math.min(5, Math.max(1, energy));

      case 'train':
        return 1; // Very low energy requirement

      case 'walk':
        let walkEnergy = distance * 0.8; // Walking requires more energy per km
        return Math.min(5, Math.max(1, walkEnergy));

      default:
        return 3;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    if (!this.isCoordinateTuple(coord1) || !this.isCoordinateTuple(coord2)) {
      console.warn('[TravelService] Invalid coordinates supplied, using conservative distance fallback', {
        coord1,
        coord2,
      });
      return 3; // 3km conservative fallback to avoid underestimating travel.
    }

    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;
    
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isCoordinateTuple(value: unknown): value is [number, number] {
    return Array.isArray(value) &&
      value.length === 2 &&
      value.every((part) => typeof part === 'number' && Number.isFinite(part));
  }

  /**
   * Get elevation change between two locations
   */
  private async getElevationChange(from: Location, to: Location): Promise<number> {
    // Birmingham elevation data (simplified)
    const elevations: Record<string, number> = {
      'five-ways': 150,
      'university': 120,
      'selly-oak': 110,
      'city-centre': 140
    };

    const fromElevation = elevations[from.name.toLowerCase()] || 130;
    const toElevation = elevations[to.name.toLowerCase()] || 130;
    
    return Math.abs(toElevation - fromElevation);
  }

  /**
   * Check if location is accessible by train
   */
  private isTrainAccessible(location: Location): boolean {
    const trainAccessible = ['five-ways', 'university', 'selly-oak'];
    return trainAccessible.some(name => 
      location.name.toLowerCase().includes(name)
    );
  }

  /**
   * Get walking time to nearest train station
   */
  private getWalkingTimeToStation(location: Location): number {
    // Simplified walking times to stations
    const walkingTimes: Record<string, number> = {
      'five-ways': 2,
      'university': 5,
      'selly-oak': 3
    };

    return walkingTimes[location.name.toLowerCase()] || 8;
  }

  /**
   * Get walking time from train station to destination
   */
  private getWalkingTimeFromStation(location: Location): number {
    return this.getWalkingTimeToStation(location);
  }

  /**
   * Check for real-time train disruptions
   */
  private async checkTrainDisruptions(): Promise<any[]> {
    // In a real implementation, this would call the UK transport API
    // For now, return empty array (no disruptions)
    return [];
  }

  /**
   * Get daily travel cost tracking
   */
  async getDailyTravelCost(userId: string, date: Date): Promise<number> {
    // This would query the database for travel expenses on the given date
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Track travel expense
   */
  async trackTravelExpense(
    userId: string,
    route: TravelRoute,
    actualCost?: number
  ): Promise<void> {
    const cost = actualCost || route.cost;
    
    // In a real implementation, this would save to the database
    console.log(`Tracking travel expense: £${cost / 100} for ${route.method} from ${route.from.name} to ${route.to.name}`);
  }

  /**
   * Get alternative routes when primary route is disrupted
   */
  async getAlternativeRoutes(
    from: Location,
    to: Location,
    disruptedMethod: 'bike' | 'train' | 'walk',
    conditions: TravelConditions
  ): Promise<TravelRoute[]> {
    const allRoutes = await this.calculateAllRoutes(from, to, conditions);
    
    // Filter out the disrupted method
    return allRoutes.filter(route => route.method !== disruptedMethod);
  }

  /**
   * Generate a comprehensive travel plan for the day
   */
  async generateDailyTravelPlan(
    userId: string,
    destinations: Location[],
    preferences: TravelPreferences,
    weather: WeatherData
  ): Promise<TravelPlan> {
    const routes: TravelRoute[] = [];
    let totalCost = 0;
    let totalTime = 0;
    let totalDistance = 0;

    // Calculate routes between consecutive destinations
    for (let i = 0; i < destinations.length - 1; i++) {
      const from = destinations[i];
      const to = destinations[i + 1];
      
      const conditions: TravelConditions = {
        weather,
        userEnergy: 3, // Default medium energy
        timeConstraints: {
          departure: new Date(),
          arrival: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
          flexibility: 15 // 15 minutes flexibility
        }
      };

      const route = await this.getOptimalRoute(from, to, conditions, preferences);
      routes.push(route);
      
      totalCost += route.cost;
      totalTime += route.duration;
      totalDistance += route.distance;
    }

    return {
      userId,
      date: new Date(),
      routes,
      totalCost,
      totalTime,
      totalDistance,
      weatherConsiderations: this.generateWeatherConsiderations(weather),
      energyForecast: {
        morning: 4,
        afternoon: 3,
        evening: 2
      },
      recommendations: this.generateRecommendations(routes, weather, preferences),
      alternatives: []
    };
  }

  /**
   * Generate weather-based considerations
   */
  private generateWeatherConsiderations(weather: WeatherData): string[] {
    const considerations: string[] = [];

    if (weather.condition === 'rainy') {
      considerations.push('Consider taking the train due to rain');
      considerations.push('Bring waterproof clothing if cycling');
    }

    if (weather.temperature < 5) {
      considerations.push('Cold weather - allow extra time for cycling');
      considerations.push('Dress warmly for outdoor travel');
    }

    if (weather.windSpeed > 20) {
      considerations.push('Strong winds may affect cycling times');
    }

    return considerations;
  }

  /**
   * Generate travel recommendations
   */
  private generateRecommendations(
    routes: TravelRoute[],
    weather: WeatherData,
    preferences: TravelPreferences
  ): string[] {
    const recommendations: string[] = [];

    const totalCost = routes.reduce((sum, route) => sum + route.cost, 0);
    const dailyLimit = preferences.budgetConstraints.dailyLimit;

    if (totalCost > dailyLimit) {
      recommendations.push(`Daily travel cost (£${totalCost/100}) exceeds budget limit (£${dailyLimit/100})`);
      recommendations.push('Consider cycling more to reduce costs');
    }

    const bikeRoutes = routes.filter(r => r.method === 'bike').length;
    const totalRoutes = routes.length;

    if (weather.condition === 'sunny' && bikeRoutes < totalRoutes * 0.5) {
      recommendations.push('Great weather for cycling - consider biking more today');
    }

    return recommendations;
  }

  /**
   * Get real-time train information
   */
  async getTrainServices(from: string, to: string): Promise<TrainService[]> {
    // In a real implementation, this would call the National Rail API
    // For now, return mock data
    return [
      {
        line: 'Cross City Line',
        departure: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        arrival: new Date(Date.now() + 22 * 60 * 1000), // 22 minutes from now
        cost: this.TRAIN_COST_PENCE,
        duration: 12,
        cancelled: false,
        delayed: 0,
        platform: '2',
        operator: 'West Midlands Railway'
      }
    ];
  }
}
