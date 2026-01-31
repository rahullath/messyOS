// Wake Ramp Generator - Mandatory startup sequence after wake

import type { WakeRamp, WakeRampComponents, EnergyState } from './types';

/**
 * Wake Ramp Generator
 * 
 * Generates wake-up ramp blocks based on energy level and timing.
 * Wake ramps are mandatory startup sequences that account for the time
 * needed to become functional after waking up.
 * 
 * Duration Logic:
 * - Low energy: 120 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 45)
 * - Medium energy: 90 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 15)
 * - High energy: 75 minutes (toilet 20, hygiene 10, shower 25, dress 20, buffer 0)
 * 
 * Skip Logic:
 * - If planStart > wakeTime + 2 hours → skip (already awake and functional)
 */
export class WakeRampGenerator {
  /**
   * Generate a wake ramp block
   * 
   * @param planStart - When the plan starts
   * @param wakeTime - When the user woke up
   * @param energy - User's energy level (low, medium, high)
   * @returns WakeRamp object with timing and component breakdown
   */
  generateWakeRamp(
    planStart: Date,
    wakeTime: Date,
    energy: EnergyState
  ): WakeRamp {
    // Check if we should skip the wake ramp
    if (this.shouldSkipWakeRamp(planStart, wakeTime)) {
      return {
        start: planStart,
        end: planStart,
        duration: 0,
        components: {
          toilet: 0,
          hygiene: 0,
          shower: 0,
          dress: 0,
          buffer: 0,
        },
        skipped: true,
        skip_reason: 'Already awake',
      };
    }

    // Get component breakdown based on energy level
    const components = this.getComponentsForEnergy(energy);
    const duration = this.calculateTotalDuration(components);

    // Wake ramp starts at planStart and extends forward
    const start = new Date(planStart);
    const end = new Date(start.getTime() + duration * 60 * 1000);

    return {
      start,
      end,
      duration,
      components,
      skipped: false,
    };
  }

  /**
   * Determine if wake ramp should be skipped
   * 
   * Skip if planStart > wakeTime + 2 hours (user is already awake and functional)
   * 
   * @param planStart - When the plan starts
   * @param wakeTime - When the user woke up
   * @returns true if wake ramp should be skipped
   */
  shouldSkipWakeRamp(planStart: Date, wakeTime: Date): boolean {
    const twoHoursAfterWake = new Date(wakeTime.getTime() + 2 * 60 * 60 * 1000);
    return planStart > twoHoursAfterWake;
  }

  /**
   * Get component breakdown for energy level
   * 
   * @param energy - User's energy level
   * @returns Component breakdown with durations in minutes
   */
  private getComponentsForEnergy(energy: EnergyState): WakeRampComponents {
    // Base components (same for all energy levels)
    const baseComponents = {
      toilet: 20,
      hygiene: 10,
      shower: 25,
      dress: 20,
    };

    // Buffer varies by energy level
    let buffer: number;
    switch (energy) {
      case 'low':
        buffer = 45;
        break;
      case 'medium':
        buffer = 15;
        break;
      case 'high':
        buffer = 0;
        break;
      default:
        buffer = 15; // default to medium
    }

    return {
      ...baseComponents,
      buffer,
    };
  }

  /**
   * Calculate total duration from components
   * 
   * @param components - Component breakdown
   * @returns Total duration in minutes
   */
  private calculateTotalDuration(components: WakeRampComponents): number {
    return (
      components.toilet +
      components.hygiene +
      components.shower +
      components.dress +
      components.buffer
    );
  }
}

/**
 * Default instance for convenience
 */
export const wakeRampGenerator = new WakeRampGenerator();
