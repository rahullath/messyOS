// Chain-Based Execution Engine (V2) - Chain Generator

import { v4 as uuidv4 } from 'uuid';
import type {
  ExecutionChain,
  ChainStepInstance,
  CommitmentEnvelope,
  ChainTemplate,
  ChainStep,
} from './types';
import type { Anchor } from '../anchors/types';
import { getChainTemplate } from './templates';
import { TravelService } from '../uk-student/travel-service';
import type { Location, TravelConditions, TravelPreferences } from '../../types/uk-student-travel';

/**
 * Chain Generator Configuration
 */
export interface ChainGeneratorConfig {
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

/**
 * Chain Generator Options
 */
export interface ChainGeneratorOptions {
  userId: string;
  date: Date;
  config: ChainGeneratorConfig;
}

/**
 * Constants
 */
const CHAIN_COMPLETION_BUFFER_MINUTES = 45; // Time buffer before anchor start
const DEFAULT_TRAVEL_DURATION_MINUTES = 30; // Fallback travel duration
const PREP_DURATION_MINUTES = 15; // Default prep time
const PREP_DURATION_SEMINAR_MINUTES = 25; // Extended prep for seminars/workshops
const RECOVERY_SHORT_MINUTES = 10; // Recovery after short anchors (< 2 hours)
const RECOVERY_LONG_MINUTES = 20; // Recovery after long anchors (>= 2 hours)

/**
 * Chain Generator
 * 
 * Generates execution chains from anchors by working backward from anchor start time.
 * Creates commitment envelopes (prep, travel_there, anchor, travel_back, recovery).
 * 
 * Requirements: 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */
export class ChainGenerator {
  private travelService: TravelService;

  constructor() {
    this.travelService = new TravelService();
  }

  /**
   * Generate execution chains for all anchors on a given date
   * 
   * @param anchors - Array of anchors to generate chains for
   * @param options - Generation options (userId, date, config)
   * @returns Array of execution chains
   * 
   * Requirements: 12.1, 12.2, 12.5
   */
  async generateChainsForDate(
    anchors: Anchor[],
    options: ChainGeneratorOptions
  ): Promise<ExecutionChain[]> {
    const chains: ExecutionChain[] = [];

    for (const anchor of anchors) {
      try {
        const chain = await this.generateChainForAnchor(anchor, options);
        chains.push(chain);
      } catch (error) {
        console.error(`Failed to generate chain for anchor ${anchor.id}:`, error);
        // Continue with other anchors even if one fails
      }
    }

    return chains;
  }

  /**
   * Generate execution chain for a single anchor
   * 
   * @param anchor - Anchor to generate chain for
   * @param options - Generation options
   * @returns Execution chain
   * 
   * Requirements: 12.2, 12.3, 12.4
   */
  private async generateChainForAnchor(
    anchor: Anchor,
    options: ChainGeneratorOptions
  ): Promise<ExecutionChain> {
    // Get travel duration
    const travelDuration = await this.getTravelDuration(anchor, options.config);

    // Calculate Chain Completion Deadline
    const chainCompletionDeadline = this.calculateChainCompletionDeadline(
      anchor,
      travelDuration
    );

    // Load chain template for anchor type
    const template = getChainTemplate(anchor.type);

    // Generate backward chain from deadline
    const chainSteps = this.generateBackwardChain(
      anchor,
      template,
      chainCompletionDeadline,
      travelDuration
    );

    // Generate commitment envelope
    const commitmentEnvelope = this.generateCommitmentEnvelope(
      anchor,
      chainSteps,
      travelDuration
    );

    // Create execution chain
    const chain: ExecutionChain = {
      chain_id: uuidv4(),
      anchor_id: anchor.id,
      anchor,
      chain_completion_deadline: chainCompletionDeadline,
      steps: chainSteps,
      commitment_envelope: commitmentEnvelope,
      status: 'pending',
    };

    return chain;
  }

  /**
   * Calculate Chain Completion Deadline
   * 
   * Formula: anchor.start - travel_duration - 45 minutes
   * 
   * @param anchor - Anchor to calculate deadline for
   * @param travelDuration - Travel duration in minutes
   * @returns Chain completion deadline
   * 
   * Requirements: 4.1
   */
  calculateChainCompletionDeadline(
    anchor: Anchor,
    travelDuration: number
  ): Date {
    const totalMinutes = travelDuration + CHAIN_COMPLETION_BUFFER_MINUTES;
    return new Date(anchor.start.getTime() - totalMinutes * 60 * 1000);
  }

  /**
   * Generate backward chain from Chain Completion Deadline
   * 
   * Works backward from deadline, assigning start/end times to each step.
   * 
   * @param anchor - Anchor for the chain
   * @param template - Chain template
   * @param deadline - Chain completion deadline
   * @param travelDuration - Travel duration in minutes
   * @returns Array of chain step instances
   * 
   * Requirements: 4.2, 12.3, 12.4
   */
  private generateBackwardChain(
    anchor: Anchor,
    template: ChainTemplate,
    deadline: Date,
    travelDuration: number
  ): ChainStepInstance[] {
    const chainId = uuidv4();
    const steps: ChainStepInstance[] = [];

    // Start from deadline and work backward
    let currentTime = new Date(deadline);

    // Process template steps in reverse order
    for (let i = template.steps.length - 1; i >= 0; i--) {
      const templateStep = template.steps[i];
      
      // Calculate step times
      const endTime = new Date(currentTime);
      const startTime = new Date(
        currentTime.getTime() - templateStep.duration_estimate * 60 * 1000
      );

      // Create chain step instance
      const step: ChainStepInstance = {
        step_id: uuidv4(),
        chain_id: chainId,
        name: templateStep.name,
        start_time: startTime,
        end_time: endTime,
        duration: templateStep.duration_estimate,
        is_required: templateStep.is_required,
        can_skip_when_late: templateStep.can_skip_when_late,
        status: 'pending',
        role: templateStep.id === 'exit-gate' ? 'exit-gate' : 'chain-step',
      };

      steps.unshift(step); // Add to beginning since we're working backward
      currentTime = startTime; // Move backward in time
    }

    return steps;
  }

  /**
   * Generate commitment envelope (prep, travel_there, anchor, travel_back, recovery)
   * 
   * @param anchor - Anchor for the envelope
   * @param chainSteps - Chain steps (for timing)
   * @param travelDuration - Travel duration in minutes
   * @returns Commitment envelope
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 12.4
   */
  private generateCommitmentEnvelope(
    anchor: Anchor,
    chainSteps: ChainStepInstance[],
    travelDuration: number
  ): CommitmentEnvelope {
    const envelopeId = uuidv4();
    const chainId = chainSteps[0]?.chain_id || uuidv4();

    // Determine prep duration based on anchor type
    const prepDuration = 
      anchor.type === 'seminar' || anchor.type === 'workshop'
        ? PREP_DURATION_SEMINAR_MINUTES
        : PREP_DURATION_MINUTES;

    // Calculate prep block (all chain steps before travel)
    const firstStep = chainSteps[0];
    const lastStep = chainSteps[chainSteps.length - 1];
    const prepStart = firstStep.start_time;
    const prepEnd = lastStep.end_time;

    const prep: ChainStepInstance = {
      step_id: uuidv4(),
      chain_id: chainId,
      name: 'Preparation',
      start_time: prepStart,
      end_time: prepEnd,
      duration: Math.round((prepEnd.getTime() - prepStart.getTime()) / (60 * 1000)),
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    };

    // Calculate travel_there block
    const travelThereStart = prepEnd;
    const travelThereEnd = new Date(travelThereStart.getTime() + travelDuration * 60 * 1000);

    const travelThere: ChainStepInstance = {
      step_id: uuidv4(),
      chain_id: chainId,
      name: 'Travel to ' + anchor.title,
      start_time: travelThereStart,
      end_time: travelThereEnd,
      duration: travelDuration,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    };

    // Calculate anchor block
    const anchorBlock: ChainStepInstance = {
      step_id: uuidv4(),
      chain_id: chainId,
      name: anchor.title,
      start_time: anchor.start,
      end_time: anchor.end,
      duration: Math.round((anchor.end.getTime() - anchor.start.getTime()) / (60 * 1000)),
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'anchor',
    };

    // Calculate travel_back block (same duration as travel_there)
    const travelBackStart = anchor.end;
    const travelBackEnd = new Date(travelBackStart.getTime() + travelDuration * 60 * 1000);

    const travelBack: ChainStepInstance = {
      step_id: uuidv4(),
      chain_id: chainId,
      name: 'Travel from ' + anchor.title,
      start_time: travelBackStart,
      end_time: travelBackEnd,
      duration: travelDuration,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    };

    // Calculate recovery buffer (duration based on anchor length)
    const anchorDurationMinutes = Math.round(
      (anchor.end.getTime() - anchor.start.getTime()) / (60 * 1000)
    );
    const recoveryDuration = 
      anchorDurationMinutes >= 120 
        ? RECOVERY_LONG_MINUTES 
        : RECOVERY_SHORT_MINUTES;

    const recoveryStart = travelBackEnd;
    const recoveryEnd = new Date(recoveryStart.getTime() + recoveryDuration * 60 * 1000);

    const recovery: ChainStepInstance = {
      step_id: uuidv4(),
      chain_id: chainId,
      name: 'Recovery',
      start_time: recoveryStart,
      end_time: recoveryEnd,
      duration: recoveryDuration,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'recovery',
    };

    return {
      envelope_id: envelopeId,
      prep,
      travel_there: travelThere,
      anchor: anchorBlock,
      travel_back: travelBack,
      recovery,
    };
  }

  /**
   * Get travel duration for anchor
   * 
   * Uses travel service if anchor has location, otherwise returns default.
   * 
   * @param anchor - Anchor to get travel duration for
   * @param config - Chain generator config
   * @returns Travel duration in minutes
   */
  private async getTravelDuration(
    anchor: Anchor,
    config: ChainGeneratorConfig
  ): Promise<number> {
    // If no location, use default
    if (!anchor.location) {
      console.log(`No location for anchor ${anchor.id}, using default travel duration`);
      return DEFAULT_TRAVEL_DURATION_MINUTES;
    }

    try {
      // Convert anchor location string to Location object
      // For now, we'll use a simple conversion. In production, this would
      // geocode the address or look up the location in a database.
      const destinationLocation: Location = {
        name: anchor.location,
        coordinates: [52.4508, -1.9305], // Default to Birmingham city center
        type: 'other',
        address: anchor.location,
      };

      // Build travel conditions
      const conditions: TravelConditions = {
        weather: config.weather || this.getDefaultWeather(),
        userEnergy: config.userEnergy || 3,
        timeConstraints: {
          departure: new Date(anchor.start.getTime() - 60 * 60 * 1000), // 1 hour before
          arrival: anchor.start,
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
        config.currentLocation,
        destinationLocation,
        conditions,
        preferences
      );

      // Validate route duration
      if (!route.duration || route.duration <= 0) {
        console.warn(`Invalid travel duration (${route.duration}) for anchor ${anchor.id}, using default`);
        return DEFAULT_TRAVEL_DURATION_MINUTES;
      }

      return route.duration;
    } catch (error) {
      console.error(`Travel service failed for anchor ${anchor.id}, using default duration:`, error);
      return DEFAULT_TRAVEL_DURATION_MINUTES;
    }
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
export const chainGenerator = new ChainGenerator();
