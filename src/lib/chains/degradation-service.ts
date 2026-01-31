// Chain-Based Execution Engine (V2) - Degradation Service

import type { ExecutionChain, ChainStepInstance } from './types';

/**
 * Degradation Service
 * 
 * Handles chain degradation when running late.
 * Drops optional steps while preserving required steps.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */
export class DegradationService {
  /**
   * Check if degradation should be triggered
   * 
   * Degradation triggers when current time exceeds Chain Completion Deadline.
   * 
   * @param chain - Execution chain to check
   * @param currentTime - Current time (defaults to now)
   * @returns True if degradation should trigger
   * 
   * Requirements: 15.1
   */
  shouldTriggerDegradation(
    chain: ExecutionChain,
    currentTime: Date = new Date()
  ): boolean {
    return currentTime > chain.chain_completion_deadline;
  }

  /**
   * Degrade chain by dropping optional steps
   * 
   * Drops steps where can_skip_when_late = true.
   * Preserves steps where is_required = true.
   * Marks dropped steps with status = 'skipped' and skip_reason = "Running late".
   * 
   * @param chain - Execution chain to degrade
   * @returns Degraded execution chain
   * 
   * Requirements: 15.2, 15.3, 15.4, 15.5
   */
  degradeChain(chain: ExecutionChain): ExecutionChain {
    // Create a copy of the chain to avoid mutating the original
    const degradedChain: ExecutionChain = {
      ...chain,
      steps: chain.steps.map(step => this.degradeStep(step)),
    };

    return degradedChain;
  }

  /**
   * Degrade a single chain step
   * 
   * If step can be skipped when late, mark it as skipped.
   * Otherwise, preserve the step.
   * 
   * @param step - Chain step to degrade
   * @returns Degraded chain step
   * 
   * Requirements: 15.2, 15.3, 15.4
   */
  private degradeStep(step: ChainStepInstance): ChainStepInstance {
    // If step can be skipped when late, mark it as skipped
    if (step.can_skip_when_late && !step.is_required) {
      return {
        ...step,
        status: 'skipped',
        skip_reason: 'Running late',
      };
    }

    // Otherwise, preserve the step
    return { ...step };
  }

  /**
   * Get list of dropped steps from degradation
   * 
   * Returns steps that were marked as skipped due to degradation.
   * 
   * @param originalChain - Original chain before degradation
   * @param degradedChain - Chain after degradation
   * @returns Array of dropped step names
   */
  getDroppedSteps(
    originalChain: ExecutionChain,
    degradedChain: ExecutionChain
  ): string[] {
    const droppedSteps: string[] = [];

    for (let i = 0; i < degradedChain.steps.length; i++) {
      const originalStep = originalChain.steps[i];
      const degradedStep = degradedChain.steps[i];

      if (
        originalStep.status !== 'skipped' &&
        degradedStep.status === 'skipped' &&
        degradedStep.skip_reason === 'Running late'
      ) {
        droppedSteps.push(degradedStep.name);
      }
    }

    return droppedSteps;
  }

  /**
   * Get list of preserved steps after degradation
   * 
   * Returns steps that were kept (not skipped) after degradation.
   * 
   * @param degradedChain - Chain after degradation
   * @returns Array of preserved step names
   */
  getPreservedSteps(degradedChain: ExecutionChain): string[] {
    return degradedChain.steps
      .filter(step => step.status !== 'skipped')
      .map(step => step.name);
  }

  /**
   * Check if all required steps are preserved
   * 
   * Validates that degradation preserved all required steps.
   * 
   * @param chain - Degraded chain
   * @returns True if all required steps are preserved
   * 
   * Requirements: 15.3
   */
  areRequiredStepsPreserved(chain: ExecutionChain): boolean {
    return chain.steps
      .filter(step => step.is_required)
      .every(step => step.status !== 'skipped');
  }
}

// Export singleton instance
export const degradationService = new DegradationService();
