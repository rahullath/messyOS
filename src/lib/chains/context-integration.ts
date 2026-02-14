/**
 * Chain View Context Integration Service
 * 
 * Connects DailyContext to Chain View features:
 * - Exit gate suggestions based on habits
 * - Step injection for missing activities (e.g., meds)
 * - Duration prior application for realistic timing
 * - Risk inflators for degraded performance
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { DailyContext } from '../context/daily-context';
import type { ExecutionChain, ChainStep, ChainStepInstance, GateCondition } from './types';

/**
 * Chain Context Enhancement
 * 
 * Contains all enhancements to apply to a chain based on DailyContext.
 */
export interface ChainContextEnhancement {
  exitGateSuggestions: GateCondition[];
  injectedSteps: ChainStep[];
  durationAdjustments: Record<string, number>;
  riskInflators: {
    low_energy: number; // 1.0 = no change, 1.1 = +10%
    sleep_debt: number; // 1.0 = no change, 1.15 = +15%
  };
}

/**
 * Generate exit gate suggestions based on DailyContext
 * 
 * Prefills exit readiness checklist with items based on yesterday's habits
 * and detected risk flags.
 * 
 * @param context - Daily context data
 * @returns Array of gate conditions
 * 
 * Requirements: 7.1
 */
export function generateExitGateSuggestions(context: DailyContext): GateCondition[] {
  const suggestions: GateCondition[] = [
    { id: 'keys', name: 'Keys present', satisfied: false },
    { id: 'phone', name: 'Phone charged >= 20%', satisfied: false },
    { id: 'water', name: 'Water bottle filled', satisfied: false },
  ];
  
  // Add meds if not taken yesterday and reliability is high enough
  if (!context.meds.taken && context.meds.reliability > 0.5) {
    suggestions.push({
      id: 'meds',
      name: 'Meds taken',
      satisfied: false,
    });
  }
  
  // Add phone charger if low energy risk detected
  if (context.day_flags.low_energy_risk) {
    suggestions.push({
      id: 'phone-charger',
      name: 'Phone charger packed',
      satisfied: false,
    });
  }
  
  return suggestions;
}

/**
 * Inject missing steps into chain based on DailyContext
 * 
 * Adds steps for activities that should be done but weren't done yesterday.
 * Currently handles:
 * - "Take meds" if meds not taken yesterday
 * 
 * @param chain - Execution chain to enhance
 * @param context - Daily context data
 * @returns Array of steps to inject
 * 
 * Requirements: 7.2
 */
export function injectMissingSteps(
  chain: ExecutionChain,
  context: DailyContext
): ChainStep[] {
  const injected: ChainStep[] = [];
  
  // Inject "Take meds" if not taken yesterday and reliability is high enough
  if (!context.meds.taken && context.meds.reliability > 0.5) {
    injected.push({
      id: 'take-meds',
      name: 'Take meds',
      duration_estimate: 2, // 2 minutes
      is_required: true,
      can_skip_when_late: false,
    });
  }
  
  return injected;
}

/**
 * Apply duration priors to chain steps
 * 
 * Adjusts step duration estimates based on historical data from DailyContext.
 * Maps common step names to duration priors.
 * 
 * @param chain - Execution chain to enhance
 * @param context - Daily context data
 * @returns Map of step_id to adjusted duration
 * 
 * Requirements: 7.3
 */
export function applyDurationPriors(
  chain: ExecutionChain,
  context: DailyContext
): Record<string, number> {
  const adjustments: Record<string, number> = {};
  
  // Map step names to duration priors
  const priorMappings: Record<string, keyof DailyContext['duration_priors']> = {
    'bathroom': 'bathroom_min',
    'toilet': 'bathroom_min',
    'hygiene': 'hygiene_min',
    'oral hygiene': 'hygiene_min',
    'teeth': 'hygiene_min',
    'shower': 'shower_min',
    'bath': 'shower_min',
    'dress': 'dress_min',
    'get dressed': 'dress_min',
    'pack': 'pack_min',
    'pack bag': 'pack_min',
    'cook': 'cook_simple_meal_min',
    'prepare meal': 'cook_simple_meal_min',
  };
  
  // Apply priors to matching steps
  for (const step of chain.steps) {
    const stepNameLower = step.name.toLowerCase();
    
    for (const [keyword, priorKey] of Object.entries(priorMappings)) {
      if (stepNameLower.includes(keyword)) {
        const priorValue = context.duration_priors[priorKey];
        if (priorValue > 0) {
          adjustments[step.step_id] = priorValue;
        }
        break; // Only apply first matching prior
      }
    }
  }
  
  return adjustments;
}

/**
 * Calculate risk inflators based on day flags
 * 
 * Returns multipliers to apply to chain duration based on detected risks:
 * - Low energy risk: +10% (1.1x)
 * - Sleep debt risk: +15% (1.15x)
 * - Both: cumulative (1.1 * 1.15 = 1.265x)
 * 
 * @param context - Daily context data
 * @returns Risk inflator multipliers
 * 
 * Requirements: 7.4
 */
export function calculateRiskInflators(context: DailyContext): {
  low_energy: number;
  sleep_debt: number;
} {
  return {
    low_energy: context.day_flags.low_energy_risk ? 1.1 : 1.0,
    sleep_debt: context.day_flags.sleep_debt_risk ? 1.15 : 1.0,
  };
}

/**
 * Enhance chain with context
 * 
 * Main entry point for applying DailyContext enhancements to a chain.
 * Generates all enhancements in a single call.
 * 
 * @param chain - Execution chain to enhance
 * @param context - Daily context data
 * @returns Complete enhancement object
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export async function enhanceChainWithContext(
  chain: ExecutionChain,
  context: DailyContext
): Promise<ChainContextEnhancement> {
  return {
    exitGateSuggestions: generateExitGateSuggestions(context),
    injectedSteps: injectMissingSteps(chain, context),
    durationAdjustments: applyDurationPriors(chain, context),
    riskInflators: calculateRiskInflators(context),
  };
}
