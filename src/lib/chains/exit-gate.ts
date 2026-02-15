// Exit Readiness Gate Service
// Implements boolean gate that must be satisfied before leaving

import type { ExitGate, GateCondition, ExitGateStatus } from './types';

/**
 * Default gate conditions that must be satisfied before leaving
 */
export const DEFAULT_GATE_CONDITIONS: GateCondition[] = [
  { id: 'keys', name: 'Keys present', satisfied: false },
  { id: 'phone', name: 'Phone charged >= 20%', satisfied: false },
  { id: 'water', name: 'Water bottle filled', satisfied: false },
  { id: 'meds', name: 'Meds taken', satisfied: false },
  { id: 'cat-fed', name: 'Cat fed', satisfied: false },
  { id: 'bag-packed', name: 'Bag packed', satisfied: false },
  { id: 'eyeglasses', name: 'Eyeglasses', satisfied: false },
];

/**
 * Exit Gate Service
 * 
 * Manages the Exit Readiness Gate - a boolean checklist that must be satisfied
 * before the user can leave for an anchor. This prevents forgetting essential
 * items when rushing.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class ExitGateService {
  private conditions: Map<string, GateCondition>;

  constructor(initialConditions?: GateCondition[]) {
    this.conditions = new Map();
    const conditionsToUse = initialConditions || DEFAULT_GATE_CONDITIONS;
    
    // Initialize conditions map
    conditionsToUse.forEach(condition => {
      this.conditions.set(condition.id, { ...condition });
    });
  }

  /**
   * Evaluate the exit gate status
   * 
   * Checks all conditions and returns:
   * - status: 'blocked' if any condition is unsatisfied, 'ready' if all satisfied
   * - conditions: current state of all conditions
   * - blocked_reasons: list of unsatisfied condition names
   * 
   * Requirements: 3.2, 3.3, 3.4
   * 
   * @returns ExitGate with current status and blocked reasons
   */
  evaluateGate(): ExitGate {
    const conditionsArray = Array.from(this.conditions.values());
    const unsatisfiedConditions = conditionsArray.filter(c => !c.satisfied);
    
    const status: ExitGateStatus = unsatisfiedConditions.length > 0 ? 'blocked' : 'ready';
    const blocked_reasons = unsatisfiedConditions.map(c => c.name);

    return {
      status,
      conditions: conditionsArray,
      blocked_reasons,
    };
  }

  /**
   * Toggle a gate condition
   * 
   * Updates the satisfied state of a specific condition.
   * Used for UI interaction when user checks/unchecks items.
   * 
   * Requirements: 3.5
   * 
   * @param conditionId - ID of the condition to toggle
   * @param satisfied - New satisfied state
   * @throws Error if condition ID not found
   */
  toggleCondition(conditionId: string, satisfied: boolean): void {
    const condition = this.conditions.get(conditionId);
    
    if (!condition) {
      throw new Error(`Gate condition not found: ${conditionId}`);
    }

    condition.satisfied = satisfied;
    this.conditions.set(conditionId, condition);
  }

  /**
   * Get current state of a specific condition
   * 
   * @param conditionId - ID of the condition to check
   * @returns GateCondition or undefined if not found
   */
  getCondition(conditionId: string): GateCondition | undefined {
    return this.conditions.get(conditionId);
  }

  /**
   * Get all conditions
   * 
   * @returns Array of all gate conditions
   */
  getAllConditions(): GateCondition[] {
    return Array.from(this.conditions.values());
  }

  /**
   * Reset all conditions to unsatisfied
   * 
   * Useful for starting a new day or resetting the gate
   */
  resetAllConditions(): void {
    this.conditions.forEach(condition => {
      condition.satisfied = false;
    });
  }

  /**
   * Set all conditions to satisfied
   * 
   * Useful for testing or manual override
   */
  satisfyAllConditions(): void {
    this.conditions.forEach(condition => {
      condition.satisfied = true;
    });
  }

  /**
   * Create a new exit gate with default conditions
   * 
   * Factory method for creating a fresh exit gate
   * 
   * @returns New ExitGateService instance
   */
  static createDefault(): ExitGateService {
    return new ExitGateService(DEFAULT_GATE_CONDITIONS);
  }

  /**
   * Create an exit gate from gate tags
   * 
   * Used when generating chains - converts gate_tags from chain template
   * into actual gate conditions
   * 
   * @param gateTags - Array of gate tag IDs from chain template
   * @returns New ExitGateService instance with only specified conditions
   */
  static fromGateTags(gateTags: string[]): ExitGateService {
    const filteredConditions = DEFAULT_GATE_CONDITIONS.filter(
      condition => gateTags.includes(condition.id)
    );
    
    return new ExitGateService(filteredConditions);
  }
}
