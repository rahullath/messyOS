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
import type { TimeBlock, TimeBlockMetadata } from '../../types/daily-plan';
import { getChainTemplate, CHAIN_TEMPLATES } from './templates';
import { TravelService } from '../uk-student/travel-service';
import type { Location, TravelConditions, TravelPreferences } from '../../types/uk-student-travel';
import { generateDailyContext, type DailyContext } from '../context/daily-context';
import { enhanceChainWithContext, type ChainContextEnhancement } from './context-integration';
import { DEFAULT_GATE_CONDITIONS } from './exit-gate';

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
   * Fetches DailyContext and applies enhancements to all chains.
   * 
   * @param anchors - Array of anchors to generate chains for
   * @param options - Generation options (userId, date, config)
   * @returns Array of execution chains
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 8.5, 12.1, 12.2, 12.5
   */
  async generateChainsForDate(
    anchors: Anchor[],
    options: ChainGeneratorOptions
  ): Promise<ExecutionChain[]> {
    const chains: ExecutionChain[] = [];

    // Fetch DailyContext for today
    // Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4
    let dailyContext: DailyContext | null = null;
    try {
      dailyContext = await generateDailyContext(options.userId, options.date);
      if (dailyContext) {
        console.log('[Chain Generator] DailyContext fetched successfully:', {
          date: dailyContext.date,
          medsReliability: dailyContext.meds.reliability,
          medsTaken: dailyContext.meds.taken,
          lowEnergyRisk: dailyContext.day_flags.low_energy_risk,
          sleepDebtRisk: dailyContext.day_flags.sleep_debt_risk,
        });
      }
    } catch (error) {
      console.error('[Chain Generator] Error fetching DailyContext, using defaults:', error);
    }

    for (const anchor of anchors) {
      try {
        const chain = await this.generateChainForAnchor(anchor, options, dailyContext);
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
   * @param dailyContext - Daily context data (optional, uses defaults if null)
   * @returns Execution chain
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 12.2, 12.3, 12.4, Design - Error Handling - Chain Generation Failures
   * Requirements: 18.5 - Log chain generation steps
   */
  private async generateChainForAnchor(
    anchor: Anchor,
    options: ChainGeneratorOptions,
    dailyContext: DailyContext | null = null
  ): Promise<ExecutionChain> {
    console.log('[Chain Generator] Starting chain generation for anchor:', {
      anchorId: anchor.id,
      title: anchor.title,
      type: anchor.type,
      start: anchor.start.toLocaleString(),
      location: anchor.location || 'none',
    });

    // Get travel duration (with fallback handling)
    const { duration: travelDuration, fallbackUsed: travelFallbackUsed } = await this.getTravelDuration(anchor, options.config);
    
    console.log('[Chain Generator] Travel duration calculated:', {
      anchorId: anchor.id,
      duration: travelDuration,
      fallbackUsed: travelFallbackUsed,
    });

    // Calculate Chain Completion Deadline
    const chainCompletionDeadline = this.calculateChainCompletionDeadline(
      anchor,
      travelDuration
    );
    
    console.log('[Chain Generator] Chain Completion Deadline:', {
      anchorId: anchor.id,
      deadline: chainCompletionDeadline.toLocaleString(),
      anchorStart: anchor.start.toLocaleString(),
      bufferMinutes: CHAIN_COMPLETION_BUFFER_MINUTES,
    });

    // Load chain template for anchor type (with fallback handling)
    // Requirements: Design - Error Handling - Chain Generation Failures
    const template = getChainTemplate(anchor.type);
    const templateFallbackUsed = !CHAIN_TEMPLATES[anchor.type];
    
    if (templateFallbackUsed) {
      console.warn(`[Chain Generator] Using fallback template for anchor type "${anchor.type}" (anchor: ${anchor.id})`);
    }
    
    console.log('[Chain Generator] Chain template loaded:', {
      anchorId: anchor.id,
      anchorType: anchor.type,
      templateSteps: template.steps.length,
      fallbackUsed: templateFallbackUsed,
    });

    // Generate backward chain from deadline
    const chainSteps = this.generateBackwardChain(
      anchor,
      template,
      chainCompletionDeadline,
      travelDuration
    );
    
    console.log('[Chain Generator] Backward chain generated:', {
      anchorId: anchor.id,
      totalSteps: chainSteps.length,
      firstStep: chainSteps[0]?.name,
      lastStep: chainSteps[chainSteps.length - 1]?.name,
      chainStart: chainSteps[0]?.start_time.toLocaleString(),
      chainEnd: chainSteps[chainSteps.length - 1]?.end_time.toLocaleString(),
    });

    // Generate commitment envelope
    const commitmentEnvelope = this.generateCommitmentEnvelope(
      anchor,
      chainSteps,
      travelDuration,
      travelFallbackUsed
    );
    
    console.log('[Chain Generator] Commitment envelope generated:', {
      anchorId: anchor.id,
      envelopeId: commitmentEnvelope.envelope_id,
      prep: `${commitmentEnvelope.prep.start_time.toLocaleTimeString()} - ${commitmentEnvelope.prep.end_time.toLocaleTimeString()}`,
      travelThere: `${commitmentEnvelope.travel_there.start_time.toLocaleTimeString()} - ${commitmentEnvelope.travel_there.end_time.toLocaleTimeString()}`,
      anchor: `${commitmentEnvelope.anchor.start_time.toLocaleTimeString()} - ${commitmentEnvelope.anchor.end_time.toLocaleTimeString()}`,
      travelBack: `${commitmentEnvelope.travel_back.start_time.toLocaleTimeString()} - ${commitmentEnvelope.travel_back.end_time.toLocaleTimeString()}`,
      recovery: `${commitmentEnvelope.recovery.start_time.toLocaleTimeString()} - ${commitmentEnvelope.recovery.end_time.toLocaleTimeString()}`,
    });

    // Create execution chain
    const chain: ExecutionChain = {
      chain_id: uuidv4(),
      anchor_id: anchor.id,
      anchor,
      chain_completion_deadline: chainCompletionDeadline,
      steps: chainSteps,
      commitment_envelope: commitmentEnvelope,
      status: 'pending',
      // Add metadata for template fallback
      // Requirements: Design - Error Handling - Chain Generation Failures
      metadata: templateFallbackUsed ? {
        template_fallback: true,
        original_anchor_type: anchor.type,
        fallback_template: 'other',
      } : undefined,
    };
    
    console.log('[Chain Generator] Chain generation complete:', {
      chainId: chain.chain_id,
      anchorId: anchor.id,
      status: chain.status,
      templateFallback: templateFallbackUsed,
    });

    // Apply DailyContext enhancements if available
    // Requirements: 7.1, 7.2, 7.3, 7.4
    if (dailyContext) {
      try {
        const enhancement = await enhanceChainWithContext(chain, dailyContext);
        
        console.log('[Chain Generator] Applying DailyContext enhancements:', {
          chainId: chain.chain_id,
          exitGateSuggestions: enhancement.exitGateSuggestions.length,
          injectedSteps: enhancement.injectedSteps.length,
          durationAdjustments: Object.keys(enhancement.durationAdjustments).length,
          riskInflators: enhancement.riskInflators,
        });
        
        // Apply exit gate suggestions to exit-gate steps
        // Requirements: 7.1
        for (const step of chain.steps) {
          if (step.role === 'exit-gate') {
            if (!step.metadata) {
              step.metadata = {};
            }
            step.metadata.gate_suggestions = enhancement.exitGateSuggestions;
          }
        }
        
        // Inject missing steps (e.g., "Take meds")
        // Requirements: 7.2
        if (enhancement.injectedSteps.length > 0) {
          // Find the first step after wake-up to inject meds
          const firstStepIndex = chain.steps.findIndex(s => s.name.toLowerCase().includes('wake') || s.name.toLowerCase().includes('bathroom'));
          const insertIndex = firstStepIndex >= 0 ? firstStepIndex + 1 : 0;
          
          for (const injectedStep of enhancement.injectedSteps) {
            // Create step instance with timing
            const previousStep = chain.steps[insertIndex - 1];
            const nextStep = chain.steps[insertIndex];
            
            const startTime = previousStep ? previousStep.end_time : chain.steps[0].start_time;
            const endTime = new Date(startTime.getTime() + injectedStep.duration_estimate * 60 * 1000);
            
            const stepInstance: ChainStepInstance = {
              step_id: injectedStep.id,
              chain_id: chain.chain_id,
              name: injectedStep.name,
              start_time: startTime,
              end_time: endTime,
              duration: injectedStep.duration_estimate,
              is_required: injectedStep.is_required,
              can_skip_when_late: injectedStep.can_skip_when_late,
              status: 'pending',
              role: 'chain-step',
              metadata: {
                injected: true,
                reason: 'meds_not_taken_yesterday',
              },
            };
            
            chain.steps.splice(insertIndex, 0, stepInstance);
            
            // Adjust timing of subsequent steps
            for (let i = insertIndex + 1; i < chain.steps.length; i++) {
              const step = chain.steps[i];
              const prevStep = chain.steps[i - 1];
              step.start_time = prevStep.end_time;
              step.end_time = new Date(step.start_time.getTime() + step.duration * 60 * 1000);
            }
          }
        }
        
        // Apply duration priors to step estimates
        // Requirements: 7.3
        for (const [stepId, adjustedDuration] of Object.entries(enhancement.durationAdjustments)) {
          const step = chain.steps.find(s => s.step_id === stepId);
          if (step) {
            const oldDuration = step.duration;
            step.duration = adjustedDuration;
            step.end_time = new Date(step.start_time.getTime() + adjustedDuration * 60 * 1000);
            
            if (!step.metadata) {
              step.metadata = {};
            }
            step.metadata.duration_prior_applied = true;
            step.metadata.original_duration = oldDuration;
            
            // Adjust timing of subsequent steps
            const stepIndex = chain.steps.indexOf(step);
            for (let i = stepIndex + 1; i < chain.steps.length; i++) {
              const nextStep = chain.steps[i];
              const prevStep = chain.steps[i - 1];
              nextStep.start_time = prevStep.end_time;
              nextStep.end_time = new Date(nextStep.start_time.getTime() + nextStep.duration * 60 * 1000);
            }
          }
        }
        
        // Apply risk inflators to total chain duration
        // Requirements: 7.4
        const totalInflator = enhancement.riskInflators.low_energy * enhancement.riskInflators.sleep_debt;
        if (totalInflator > 1.0) {
          // Store risk inflator in chain metadata
          if (!chain.metadata) {
            chain.metadata = {};
          }
          chain.metadata.risk_inflator = totalInflator;
          chain.metadata.low_energy_risk = enhancement.riskInflators.low_energy > 1.0;
          chain.metadata.sleep_debt_risk = enhancement.riskInflators.sleep_debt > 1.0;
          
          console.log('[Chain Generator] Risk inflator applied:', {
            chainId: chain.chain_id,
            inflator: totalInflator,
            lowEnergyRisk: chain.metadata.low_energy_risk,
            sleepDebtRisk: chain.metadata.sleep_debt_risk,
          });
        }
        
      } catch (error) {
        console.error('[Chain Generator] Error applying DailyContext enhancements:', error);
        // Continue without enhancements - graceful degradation
      }
    } else {
      console.log('[Chain Generator] No DailyContext available, using defaults');
    }

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
   * @param travelFallbackUsed - Whether travel service fallback was used
   * @returns Commitment envelope
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 12.4, Design - Error Handling - Travel Service Failures
   */
  private generateCommitmentEnvelope(
    anchor: Anchor,
    chainSteps: ChainStepInstance[],
    travelDuration: number,
    travelFallbackUsed: boolean = false
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
      // Add metadata for travel fallback
      // Requirements: Design - Error Handling - Travel Service Failures
      metadata: travelFallbackUsed ? {
        fallback_used: true,
        fallback_reason: 'Travel service unavailable',
      } : undefined,
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
      // Add metadata for travel fallback
      // Requirements: Design - Error Handling - Travel Service Failures
      metadata: travelFallbackUsed ? {
        fallback_used: true,
        fallback_reason: 'Travel service unavailable',
      } : undefined,
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
   * @returns Travel duration in minutes and fallback flag
   * 
   * Requirements: Design - Error Handling - Travel Service Failures
   */
  private async getTravelDuration(
    anchor: Anchor,
    config: ChainGeneratorConfig
  ): Promise<{ duration: number; fallbackUsed: boolean }> {
    // If no location, use default
    if (!anchor.location) {
      console.log(`[Chain Generator] No location for anchor ${anchor.id}, using default travel duration`);
      return { duration: DEFAULT_TRAVEL_DURATION_MINUTES, fallbackUsed: false };
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
        console.warn(`[Chain Generator] Invalid travel duration (${route.duration}) for anchor ${anchor.id}, using fallback`);
        return { duration: DEFAULT_TRAVEL_DURATION_MINUTES, fallbackUsed: true };
      }

      return { duration: route.duration, fallbackUsed: false };
    } catch (error) {
      // Travel Service Error Handling
      // Requirements: Design - Error Handling - Travel Service Failures
      console.error(`[Chain Generator] Travel service failed for anchor ${anchor.id}, using fallback duration:`, error);
      console.error(`[Chain Generator] Error details:`, {
        anchorId: anchor.id,
        anchorLocation: anchor.location,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      // Use fallback duration: 30 minutes (conservative estimate)
      // Mark travel block with metadata: fallback_used = true
      // UI will display: "Travel time estimated (service unavailable)"
      return { duration: DEFAULT_TRAVEL_DURATION_MINUTES, fallbackUsed: true };
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

  /**
   * Convert chain steps to TimeBlocks with chain metadata
   * 
   * This method adds chain semantics to TimeBlocks without schema changes.
   * 
   * @param chain - Execution chain to convert
   * @param planId - Plan ID for the TimeBlocks
   * @param locationState - Current location state ('at_home' | 'not_home')
   * @returns Array of TimeBlocks with chain metadata
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 18.1, 18.2, 18.3, 18.4
   */
  convertChainToTimeBlocks(
    chain: ExecutionChain,
    planId: string,
    locationState: 'at_home' | 'not_home' = 'at_home'
  ): Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>[] {
    const timeBlocks: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    let sequenceOrder = 1;

    // Convert chain steps to TimeBlocks
    for (const step of chain.steps) {
      const metadata: TimeBlockMetadata = {
        // Chain semantics
        // Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
        role: {
          type: step.role,
          required: step.is_required,
          chain_id: chain.chain_id,
        },
        
        // Chain linkage
        // Requirements: 18.1, 18.2
        chain_id: chain.chain_id,
        step_id: step.step_id,
        anchor_id: chain.anchor_id,
        
        // Location state
        // Requirements: 18.3
        location_state: locationState,
      };

      // Add gate conditions for exit-gate steps
      if (step.role === 'exit-gate') {
        metadata.role!.gate_conditions = DEFAULT_GATE_CONDITIONS.map((condition) => ({
          ...condition,
        }));
      }

      // Add step metadata (fallback info if present)
      if (step.metadata) {
        Object.assign(metadata, step.metadata);
      }

      timeBlocks.push({
        planId,
        startTime: step.start_time,
        endTime: step.end_time,
        activityType: this.mapRoleToActivityType(step.role),
        activityName: step.name,
        activityId: chain.anchor_id,
        isFixed: true,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
        metadata,
      });
    }

    // Convert commitment envelope to TimeBlocks
    const envelope = chain.commitment_envelope;
    const envelopeSteps = [
      { step: envelope.prep, type: 'prep' as const },
      { step: envelope.travel_there, type: 'travel_there' as const },
      { step: envelope.anchor, type: 'anchor' as const },
      { step: envelope.travel_back, type: 'travel_back' as const },
      { step: envelope.recovery, type: 'recovery' as const },
    ];

    for (const { step, type } of envelopeSteps) {
      const metadata: TimeBlockMetadata = {
        // Chain semantics
        role: {
          type: step.role,
          required: step.is_required,
          chain_id: chain.chain_id,
        },
        
        // Chain linkage
        chain_id: chain.chain_id,
        step_id: step.step_id,
        anchor_id: chain.anchor_id,
        
        // Location state (travel and anchor are not_home, others depend on context)
        location_state: 
          type === 'travel_there' || type === 'anchor' || type === 'travel_back'
            ? 'not_home'
            : 'at_home',
        
        // Commitment envelope tracking
        // Requirements: 18.4
        commitment_envelope: {
          envelope_id: envelope.envelope_id,
          envelope_type: type,
        },
      };

      // Add step metadata (fallback info if present)
      if (step.metadata) {
        Object.assign(metadata, step.metadata);
      }

      timeBlocks.push({
        planId,
        startTime: step.start_time,
        endTime: step.end_time,
        activityType: this.mapRoleToActivityType(step.role),
        activityName: step.name,
        activityId: chain.anchor_id,
        isFixed: true,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
        metadata,
      });
    }

    return timeBlocks;
  }

  /**
   * Map chain step role to activity type
   */
  private mapRoleToActivityType(role: ChainStepInstance['role']): TimeBlock['activityType'] {
    switch (role) {
      case 'anchor':
        return 'commitment';
      case 'chain-step':
        return 'routine';
      case 'exit-gate':
        return 'routine';
      case 'recovery':
        return 'buffer';
      default:
        return 'routine';
    }
  }
}

// Export singleton instance
export const chainGenerator = new ChainGenerator();
