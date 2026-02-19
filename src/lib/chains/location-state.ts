// Location State Tracker - Track user location (at_home vs not_home)

import type { 
  ExecutionChain, 
  LocationPeriod, 
  HomeInterval, 
  LocationState 
} from './types';

// Re-export types for external use
export type { LocationPeriod, HomeInterval, LocationState };

/**
 * Location State Tracker
 * 
 * Tracks whether user is at home or not based on commitment envelopes.
 * Calculates home intervals for meal placement.
 * 
 * Algorithm:
 * 1. Start with location_state = at_home at planStart
 * 2. For each chain:
 *    - When travel_there starts: location_state = not_home
 *    - When travel_back ends + recovery completes: location_state = at_home
 * 3. Calculate home intervals:
 *    - Start with full day (planStart to sleepTime)
 *    - Subtract all commitment envelopes (prep through recovery)
 *    - Remaining periods = home intervals
 * 4. Filter home intervals:
 *    - Keep only intervals >= 30 minutes
 *    - Discard shorter intervals (too short for meals)
 */
export class LocationStateTracker {
  /**
   * Calculate location periods for the day
   * 
   * Tracks state transitions based on commitment envelopes.
   * 
   * @param chains - Execution chains for the day
   * @param planStart - Start of the plan
   * @param sleepTime - End of the day
   * @returns Array of location periods with state transitions
   * 
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   * **Requirements: 18.5 - Log location period calculation**
   */
  calculateLocationPeriods(
    chains: ExecutionChain[],
    planStart: Date,
    sleepTime: Date
  ): LocationPeriod[] {
    console.log('[Location State] Starting location period calculation:', {
      planStart: planStart.toLocaleString(),
      sleepTime: sleepTime.toLocaleString(),
      chainCount: chains.length,
    });

    const periods: LocationPeriod[] = [];
    
    // If no chains, entire day is at home
    if (chains.length === 0) {
      console.log('[Location State] No chains - entire day at home');
      periods.push({
        start: planStart,
        end: sleepTime,
        state: 'at_home'
      });
      return periods;
    }

    // Sort chains by start time (travel_there start)
    const sortedChains = [...chains].sort((a, b) => {
      const aStart = a.commitment_envelope.travel_there.start_time;
      const bStart = b.commitment_envelope.travel_there.start_time;
      return aStart.getTime() - bStart.getTime();
    });

    let currentTime = planStart;
    let currentState: LocationState = 'at_home';

    for (const chain of sortedChains) {
      const { travel_there, recovery } = chain.commitment_envelope;
      
      console.log('[Location State] Processing chain:', {
        chainId: chain.chain_id,
        anchorTitle: chain.anchor.title,
        travelStart: travel_there.start_time.toLocaleString(),
        recoveryEnd: recovery.end_time.toLocaleString(),
      });

      // Add at_home period before this chain (if any time exists)
      if (currentState === 'at_home' && currentTime < travel_there.start_time) {
        const atHomePeriod = {
          start: currentTime,
          end: travel_there.start_time,
          state: 'at_home' as const
        };
        periods.push(atHomePeriod);
        console.log('[Location State] Added at_home period:', {
          start: atHomePeriod.start.toLocaleString(),
          end: atHomePeriod.end.toLocaleString(),
          durationMinutes: Math.floor((atHomePeriod.end.getTime() - atHomePeriod.start.getTime()) / (1000 * 60)),
        });
      }

      // Transition to not_home when travel starts
      const notHomePeriod = {
        start: travel_there.start_time,
        end: recovery.end_time,
        state: 'not_home' as const
      };
      periods.push(notHomePeriod);
      console.log('[Location State] Added not_home period:', {
        start: notHomePeriod.start.toLocaleString(),
        end: notHomePeriod.end.toLocaleString(),
        durationMinutes: Math.floor((notHomePeriod.end.getTime() - notHomePeriod.start.getTime()) / (1000 * 60)),
      });

      // Update current time and state
      currentTime = recovery.end_time;
      currentState = 'at_home';
    }

    // Add final at_home period (if any time remains)
    if (currentTime < sleepTime) {
      const finalPeriod = {
        start: currentTime,
        end: sleepTime,
        state: 'at_home' as const
      };
      periods.push(finalPeriod);
      console.log('[Location State] Added final at_home period:', {
        start: finalPeriod.start.toLocaleString(),
        end: finalPeriod.end.toLocaleString(),
        durationMinutes: Math.floor((finalPeriod.end.getTime() - finalPeriod.start.getTime()) / (1000 * 60)),
      });
    }

    console.log('[Location State] Location period calculation complete:', {
      totalPeriods: periods.length,
      atHomePeriods: periods.filter(p => p.state === 'at_home').length,
      notHomePeriods: periods.filter(p => p.state === 'not_home').length,
    });

    return periods;
  }

  /**
   * Calculate home intervals from location periods
   * 
   * Extracts periods where location_state = at_home and filters by minimum duration.
   * 
   * @param locationPeriods - Location periods for the day
   * @param minDurationMinutes - Minimum duration for valid home interval (default: 30)
   * @returns Array of home intervals (>= minDuration)
   * 
   * **Validates: Requirements 17.1, 17.2, 17.3**
   * **Requirements: 18.5 - Log home interval calculation**
   */
  calculateHomeIntervals(
    locationPeriods: LocationPeriod[],
    minDurationMinutes: number = 30
  ): HomeInterval[] {
    console.log('[Location State] Starting home interval calculation:', {
      totalPeriods: locationPeriods.length,
      minDurationMinutes,
    });

    const homeIntervals: HomeInterval[] = [];

    for (const period of locationPeriods) {
      if (period.state === 'at_home') {
        const durationMs = period.end.getTime() - period.start.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));

        console.log('[Location State] Found at_home period:', {
          start: period.start.toLocaleString(),
          end: period.end.toLocaleString(),
          durationMinutes,
          meetsMinimum: durationMinutes >= minDurationMinutes,
        });

        // Only include intervals >= minimum duration
        if (durationMinutes >= minDurationMinutes) {
          homeIntervals.push({
            start: period.start,
            end: period.end,
            duration: durationMinutes
          });
          console.log('[Location State] Added home interval (meets minimum duration)');
        } else {
          console.log('[Location State] Skipped home interval (too short)');
        }
      }
    }

    console.log('[Location State] Home interval calculation complete:', {
      totalHomeIntervals: homeIntervals.length,
      totalHomeMinutes: homeIntervals.reduce((sum, i) => sum + i.duration, 0),
    });

    return homeIntervals;
  }

  /**
   * Check if a given time falls within a home interval
   * 
   * @param time - Time to check
   * @param homeIntervals - Array of home intervals
   * @returns true if time is within any home interval, false otherwise
   * 
   * **Validates: Requirements 17.4**
   */
  isHomeInterval(time: Date, homeIntervals: HomeInterval[]): boolean {
    const timeMs = time.getTime();

    for (const interval of homeIntervals) {
      const startMs = interval.start.getTime();
      const endMs = interval.end.getTime();

      if (timeMs >= startMs && timeMs < endMs) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the current location state at a specific time
   * 
   * @param time - Time to check
   * @param locationPeriods - Location periods for the day
   * @returns Current location state at the given time
   */
  getLocationStateAt(time: Date, locationPeriods: LocationPeriod[]): LocationState {
    const timeMs = time.getTime();

    for (const period of locationPeriods) {
      const startMs = period.start.getTime();
      const endMs = period.end.getTime();

      if (timeMs >= startMs && timeMs < endMs) {
        return period.state;
      }
    }

    // Default to at_home if no period found
    return 'at_home';
  }

  /**
   * Calculate total time at home for the day
   * 
   * @param homeIntervals - Array of home intervals
   * @returns Total minutes at home
   */
  getTotalHomeTime(homeIntervals: HomeInterval[]): number {
    return homeIntervals.reduce((total, interval) => total + interval.duration, 0);
  }

  /**
   * Find the next home interval after a given time
   * 
   * @param time - Time to check from
   * @param homeIntervals - Array of home intervals
   * @returns Next home interval, or null if none found
   */
  getNextHomeInterval(time: Date, homeIntervals: HomeInterval[]): HomeInterval | null {
    const timeMs = time.getTime();

    for (const interval of homeIntervals) {
      if (interval.start.getTime() > timeMs) {
        return interval;
      }
    }

    return null;
  }

  /**
   * Find the current or next home interval
   * 
   * Useful for meal placement: find where to place the next meal.
   * 
   * @param time - Time to check from
   * @param homeIntervals - Array of home intervals
   * @returns Current or next home interval, or null if none found
   */
  getCurrentOrNextHomeInterval(time: Date, homeIntervals: HomeInterval[]): HomeInterval | null {
    const timeMs = time.getTime();

    // Check if currently in a home interval
    for (const interval of homeIntervals) {
      const startMs = interval.start.getTime();
      const endMs = interval.end.getTime();

      if (timeMs >= startMs && timeMs < endMs) {
        return interval;
      }
    }

    // Otherwise, find next home interval
    return this.getNextHomeInterval(time, homeIntervals);
  }
}
