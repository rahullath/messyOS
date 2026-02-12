// Daily Plan Generator V1 - Exit Time Calculator

import { TravelService } from '../uk-student/travel-service';
import type { Location, TravelConditions, TravelPreferences } from '../../types/uk-student-travel';
import type { TravelMethod } from '../../types/daily-plan';

export interface Commitment {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: Location;
}

export interface ExitTimeResult {
  commitmentId: string;
  exitTime: Date;
  travelDuration: number; // minutes
  preparationTime: number; // minutes (fixed at 15)
  travelMethod: TravelMethod;
  travelBlockDuration: number; // total minutes (travel + prep)
}

export interface ExitTimeCalculatorOptions {
  currentLocation: Location;
  userEnergy?: number; // 1-5 scale, defaults to 3
  weather?: {
    temperature: number;
    condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
    windSpeed: number;
    humidity: number;
    precipitation: number;
    visibility: number;
    timestamp: Date;
  };
}

const PREPARATION_BUFFER_MINUTES = 15;
const DEFAULT_TRAVEL_DURATION_MINUTES = 30;

export class ExitTimeCalculator {
  private travelService: TravelService;

  constructor() {
    this.travelService = new TravelService();
  }

  /**
   * Calculate exit time for a commitment
   * 
   * Formula: exitTime = commitmentStart - travelDuration - preparationBuffer
   * 
   * @param commitment - The commitment to calculate exit time for
   * @param options - Current location and optional conditions
   * @returns Exit time result with travel details
   */
  async calculateExitTime(
    commitment: Commitment,
    options: ExitTimeCalculatorOptions
  ): Promise<ExitTimeResult> {
    const { currentLocation, userEnergy = 3, weather } = options;

    // If commitment has no location, we can't calculate travel time
    if (!commitment.location) {
      return this.createFallbackResult(commitment, 'No location specified');
    }

    try {
      // Build travel conditions
      const conditions: TravelConditions = {
        weather: weather || this.getDefaultWeather(),
        userEnergy,
        timeConstraints: {
          departure: new Date(commitment.startTime.getTime() - 60 * 60 * 1000), // 1 hour before
          arrival: commitment.startTime,
          flexibility: 15, // 15 minutes flexibility
        },
      };

      // Build travel preferences (use defaults)
      const preferences: TravelPreferences = {
        preferredMethod: 'mixed',
        maxWalkingDistance: 1500, // 1.5km
        weatherThreshold: {
          minTemperature: 0,
          maxWindSpeed: 30,
          maxPrecipitation: 10,
        },
        fitnessLevel: 'medium',
        budgetConstraints: {
          dailyLimit: 500, // £5
          weeklyLimit: 2000, // £20
        },
        timePreferences: {
          bufferTime: 10,
          maxTravelTime: 60,
        },
      };

      // Get optimal route from travel service
      const route = await this.travelService.getOptimalRoute(
        currentLocation,
        commitment.location,
        conditions,
        preferences
      );

      // Calculate exit time
      const travelDuration = route.duration;
      const totalMinutes = travelDuration + PREPARATION_BUFFER_MINUTES;
      const exitTime = new Date(
        commitment.startTime.getTime() - totalMinutes * 60 * 1000
      );

      return {
        commitmentId: commitment.id,
        exitTime,
        travelDuration,
        preparationTime: PREPARATION_BUFFER_MINUTES,
        travelMethod: route.method as TravelMethod,
        travelBlockDuration: totalMinutes,
      };
    } catch (error) {
      // If travel service fails, use fallback
      console.error('Travel service failed, using fallback:', error);
      return this.createFallbackResult(commitment, 'Travel service error');
    }
  }

  /**
   * Calculate exit times for multiple commitments
   * 
   * @param commitments - Array of commitments
   * @param options - Current location and optional conditions
   * @returns Array of exit time results
   */
  async calculateExitTimes(
    commitments: Commitment[],
    options: ExitTimeCalculatorOptions
  ): Promise<ExitTimeResult[]> {
    const results: ExitTimeResult[] = [];

    for (const commitment of commitments) {
      const result = await this.calculateExitTime(commitment, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Create fallback result when travel service fails
   * Uses 30-minute default travel time
   */
  private createFallbackResult(
    commitment: Commitment,
    reason: string
  ): ExitTimeResult {
    console.warn(`Using fallback exit time for commitment ${commitment.id}: ${reason}`);

    const totalMinutes = DEFAULT_TRAVEL_DURATION_MINUTES + PREPARATION_BUFFER_MINUTES;
    const exitTime = new Date(
      commitment.startTime.getTime() - totalMinutes * 60 * 1000
    );

    return {
      commitmentId: commitment.id,
      exitTime,
      travelDuration: DEFAULT_TRAVEL_DURATION_MINUTES,
      preparationTime: PREPARATION_BUFFER_MINUTES,
      travelMethod: 'walk', // Default to walking
      travelBlockDuration: totalMinutes,
    };
  }

  /**
   * Get default weather conditions
   */
  private getDefaultWeather() {
    return {
      temperature: 15,
      condition: 'cloudy' as const,
      windSpeed: 10,
      humidity: 70,
      precipitation: 0,
      visibility: 10,
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const exitTimeCalculator = new ExitTimeCalculator();
