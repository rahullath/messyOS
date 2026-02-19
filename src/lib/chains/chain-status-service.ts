// Chain-Based Execution Engine (V2) - Chain Status Service

import type { ExecutionChain, ChainStepInstance, ChainStatus } from './types';

/**
 * Chain Status Result
 * 
 * Result of chain status evaluation
 */
export interface ChainStatusResult {
  status: ChainStatus;
  chain_integrity: 'intact' | 'broken';
  message: string;
  completed_steps: string[];
  missing_steps: string[];
  was_late: boolean;
}

/**
 * Chain Status Service
 * 
 * Tracks chain execution status and determines success/failure.
 * Implements momentum preservation: late but complete = SUCCESS.
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 20.1, 20.2, 20.3, 20.4, 20.5
 */
export class ChainStatusService {
  /**
   * Update chain status based on current execution state
   * 
   * Evaluates chain completion and determines status:
   * - Late but complete → SUCCESS (chain integrity intact)
   * - On time but missing steps → FAILURE (chain integrity broken)
   * - In progress → IN-PROGRESS
   * - Not started → PENDING
   * 
   * @param chain - Execution chain to evaluate
   * @param currentTime - Current time (defaults to now)
   * @returns Updated chain with new status
   * 
   * Requirements: 16.1, 16.2, 16.3, 16.4, 20.1, 20.2
   */
  updateChainStatus(
    chain: ExecutionChain,
    currentTime: Date = new Date()
  ): ExecutionChain {
    const statusResult = this.evaluateChainStatus(chain, currentTime);

    return {
      ...chain,
      status: statusResult.status,
    };
  }

  /**
   * Evaluate chain status and return detailed result
   * 
   * Determines chain status based on step completion and timing.
   * 
   * @param chain - Execution chain to evaluate
   * @param currentTime - Current time (defaults to now)
   * @returns Chain status result with details
   * 
   * Requirements: 16.3, 16.4, 20.1, 20.2, 20.3
   */
  evaluateChainStatus(
    chain: ExecutionChain,
    currentTime: Date = new Date()
  ): ChainStatusResult {
    const completedSteps = this.getCompletedSteps(chain);
    const requiredSteps = this.getRequiredSteps(chain);
    const missingRequiredSteps = this.getMissingRequiredSteps(chain);
    const hasStarted = this.hasChainStarted(chain);
    const isComplete = this.isChainComplete(chain);

    // Determine status based on completion and timing
    let status: ChainStatus;
    let chainIntegrity: 'intact' | 'broken';
    let message: string;
    let wasLate: boolean;

    if (!hasStarted) {
      // Chain hasn't started yet
      status = 'pending';
      chainIntegrity = 'intact';
      message = 'Chain not started';
      wasLate = false;
    } else if (isComplete && missingRequiredSteps.length === 0) {
      // All required steps completed (chain integrity intact)
      // SUCCESS even if late
      status = 'completed';
      chainIntegrity = 'intact';
      
      // Check if chain was late by comparing first step start time to deadline
      wasLate = this.wasChainLateByStepTiming(chain);
      
      if (wasLate) {
        message = 'You made it! Chain completed late but intact.';
      } else {
        message = 'You made it! Chain completed on time.';
      }
    } else if (isComplete && missingRequiredSteps.length > 0) {
      // Chain reached anchor but missing required steps (chain integrity broken)
      // FAILURE even if on time
      status = 'failed';
      chainIntegrity = 'broken';
      wasLate = this.wasChainLateByStepTiming(chain);
      message = `Chain broke at ${missingRequiredSteps[0].name}. Let's try again tomorrow.`;
    } else if (hasStarted && !isComplete) {
      // Chain in progress
      status = 'in-progress';
      chainIntegrity = 'intact'; // Assume intact until proven otherwise
      message = 'Chain in progress';
      wasLate = currentTime > chain.chain_completion_deadline;
    } else {
      // Default case (shouldn't happen)
      status = 'pending';
      chainIntegrity = 'intact';
      message = 'Chain status unknown';
      wasLate = false;
    }

    return {
      status,
      chain_integrity: chainIntegrity,
      message,
      completed_steps: completedSteps.map(s => s.name),
      missing_steps: missingRequiredSteps.map(s => s.name),
      was_late: wasLate,
    };
  }

  /**
   * Check if chain should trigger replanning
   * 
   * Momentum preservation: chains should NOT trigger replanning mid-flow.
   * Only replan if chain is failed or completed.
   * 
   * @param chain - Execution chain to check
   * @returns False (never replan mid-flow)
   * 
   * Requirements: 16.4, 20.1
   */
  shouldTriggerReplanning(chain: ExecutionChain): boolean {
    // Momentum preservation: never replan mid-flow
    // Even if chain overruns, let it complete
    return false;
  }

  /**
   * Get completed steps from chain
   * 
   * @param chain - Execution chain
   * @returns Array of completed steps
   */
  private getCompletedSteps(chain: ExecutionChain): ChainStepInstance[] {
    return chain.steps.filter(step => step.status === 'completed');
  }

  /**
   * Get required steps from chain
   * 
   * @param chain - Execution chain
   * @returns Array of required steps
   */
  private getRequiredSteps(chain: ExecutionChain): ChainStepInstance[] {
    return chain.steps.filter(step => step.is_required);
  }

  /**
   * Get missing required steps from chain
   * 
   * Returns required steps that are not completed.
   * 
   * @param chain - Execution chain
   * @returns Array of missing required steps
   */
  private getMissingRequiredSteps(chain: ExecutionChain): ChainStepInstance[] {
    return chain.steps.filter(
      step => step.is_required && step.status !== 'completed'
    );
  }

  /**
   * Check if chain was late based on step timing
   * 
   * For completed/failed chains, check if the first step started after the deadline.
   * 
   * @param chain - Execution chain
   * @returns True if chain was late
   */
  private wasChainLateByStepTiming(chain: ExecutionChain): boolean {
    if (chain.steps.length > 0) {
      const firstStep = chain.steps[0];
      return firstStep.start_time > chain.chain_completion_deadline;
    }
    return false;
  }

  /**
   * Check if chain was late
   * 
   * Chain is late if the chain completion deadline was missed.
   * For pending/in-progress chains, check current time vs deadline.
   * For completed/failed chains, check if the first step started after the deadline.
   * 
   * @param chain - Execution chain
   * @param currentTime - Current time
   * @returns True if chain was late
   */
  private wasChainLate(chain: ExecutionChain, currentTime: Date): boolean {
    // If chain is still pending or in progress, check current time vs deadline
    if (chain.status === 'pending' || chain.status === 'in-progress') {
      return currentTime > chain.chain_completion_deadline;
    }
    
    // For completed/failed chains, check if the first step started after the deadline
    return this.wasChainLateByStepTiming(chain);
  }

  /**
   * Check if chain has started
   * 
   * Chain has started if any step is in-progress or completed.
   * 
   * @param chain - Execution chain
   * @returns True if chain has started
   */
  private hasChainStarted(chain: ExecutionChain): boolean {
    return chain.steps.some(
      step => step.status === 'in-progress' || step.status === 'completed'
    );
  }

  /**
   * Check if chain is complete
   * 
   * Chain is complete if the anchor step is completed.
   * 
   * @param chain - Execution chain
   * @returns True if chain is complete
   */
  private isChainComplete(chain: ExecutionChain): boolean {
    // Chain is complete when anchor is reached (anchor step completed)
    const anchorStep = chain.commitment_envelope.anchor;
    return anchorStep.status === 'completed';
  }

  /**
   * Get chain integrity status
   * 
   * Chain integrity is intact if all required steps are completed.
   * Chain integrity is broken if any required steps are missing.
   * 
   * @param chain - Execution chain
   * @returns 'intact' or 'broken'
   * 
   * Requirements: 16.5, 20.3
   */
  getChainIntegrity(chain: ExecutionChain): 'intact' | 'broken' {
    const missingRequiredSteps = this.getMissingRequiredSteps(chain);
    return missingRequiredSteps.length === 0 ? 'intact' : 'broken';
  }

  /**
   * Get chain status display message
   * 
   * Returns user-friendly message based on chain status.
   * 
   * @param chain - Execution chain
   * @param currentTime - Current time
   * @returns Display message
   * 
   * Requirements: 20.4, 20.5
   */
  getChainStatusMessage(
    chain: ExecutionChain,
    currentTime: Date = new Date()
  ): string {
    const statusResult = this.evaluateChainStatus(chain, currentTime);
    return statusResult.message;
  }

  /**
   * Mark step as completed
   * 
   * Updates step status to completed and recalculates chain status.
   * 
   * @param chain - Execution chain
   * @param stepId - Step ID to mark as completed
   * @returns Updated chain
   */
  markStepCompleted(chain: ExecutionChain, stepId: string): ExecutionChain {
    const updatedSteps = chain.steps.map(step =>
      step.step_id === stepId
        ? { ...step, status: 'completed' as const }
        : step
    );

    const updatedChain = {
      ...chain,
      steps: updatedSteps,
    };

    // Update chain status based on new step completion
    return this.updateChainStatus(updatedChain);
  }

  /**
   * Mark step as in-progress
   * 
   * Updates step status to in-progress and recalculates chain status.
   * 
   * @param chain - Execution chain
   * @param stepId - Step ID to mark as in-progress
   * @returns Updated chain
   */
  markStepInProgress(chain: ExecutionChain, stepId: string): ExecutionChain {
    const updatedSteps = chain.steps.map(step =>
      step.step_id === stepId
        ? { ...step, status: 'in-progress' as const }
        : step
    );

    const updatedChain = {
      ...chain,
      steps: updatedSteps,
    };

    // Update chain status based on new step state
    return this.updateChainStatus(updatedChain);
  }
}

// Export singleton instance
export const chainStatusService = new ChainStatusService();
