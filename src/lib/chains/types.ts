// Chain-Based Execution Engine (V2) - Core Types

import type { TimeBlock } from '../../types/daily-plan';
import type { Anchor } from '../anchors/types';

/**
 * Chain Step - Single node in execution chain
 */
export interface ChainStep {
  id: string;
  name: string;
  duration_estimate: number; // minutes
  is_required: boolean;
  can_skip_when_late: boolean;
  gate_tags?: string[]; // for Exit Gate steps
}

/**
 * Chain Template - Predefined execution chain for anchor types
 */
export interface ChainTemplate {
  anchor_type: AnchorType;
  steps: ChainStep[];
}

/**
 * Chain Step Instance - Actual scheduled chain step with times
 */
export interface ChainStepInstance {
  step_id: string;
  chain_id: string;
  name: string;
  start_time: Date;
  end_time: Date;
  duration: number; // minutes
  is_required: boolean;
  can_skip_when_late: boolean;
  status: ChainStepStatus;
  role: ChainStepRole;
  skip_reason?: string;
  metadata?: {
    fallback_used?: boolean;
    fallback_reason?: string;
    [key: string]: any;
  };
}

/**
 * Execution Chain - Complete chain from prep to recovery
 */
export interface ExecutionChain {
  chain_id: string;
  anchor_id: string;
  anchor: Anchor;
  chain_completion_deadline: Date;
  steps: ChainStepInstance[];
  commitment_envelope: CommitmentEnvelope;
  status: ChainStatus;
  metadata?: {
    template_fallback?: boolean;
    original_anchor_type?: string;
    fallback_template?: string;
    [key: string]: any;
  };
}

/**
 * Commitment Envelope - Full cycle for anchor
 */
export interface CommitmentEnvelope {
  envelope_id: string;
  prep: ChainStepInstance;
  travel_there: ChainStepInstance;
  anchor: ChainStepInstance;
  travel_back: ChainStepInstance;
  recovery: ChainStepInstance;
}

/**
 * Exit Readiness Gate - Boolean checklist before leaving
 */
export interface ExitGate {
  status: ExitGateStatus;
  conditions: GateCondition[];
  blocked_reasons: string[];
}

/**
 * Gate Condition - Single condition in exit gate
 */
export interface GateCondition {
  id: string;
  name: string;
  satisfied: boolean;
}

/**
 * Location State - Simple boolean (at_home vs not_home)
 */
export type LocationState = 'at_home' | 'not_home';

/**
 * Location Period - Time period with location state
 */
export interface LocationPeriod {
  start: Date;
  end: Date;
  state: LocationState;
}

/**
 * Home Interval - Time period when at home
 */
export interface HomeInterval {
  start: Date;
  end: Date;
  duration: number; // minutes
}

/**
 * Wake Ramp - Mandatory startup sequence after wake
 */
export interface WakeRamp {
  start: Date;
  end: Date;
  duration: number; // minutes
  components: WakeRampComponents;
  skipped: boolean;
  skip_reason?: string;
}

/**
 * Wake Ramp Components - Breakdown of wake ramp activities
 */
export interface WakeRampComponents {
  toilet: number;
  hygiene: number;
  shower: number;
  dress: number;
  buffer: number;
}

/**
 * TimeBlock Metadata Extension for V2
 */
export interface TimeBlockMetadata {
  // Existing V1.2 fields
  target_time?: string;
  placement_reason?: string;
  skip_reason?: string;
  
  // New V2 fields
  role?: {
    type: ChainStepRole;
    required: boolean;
    chain_id?: string;
    gate_conditions?: GateCondition[];
  };
  chain_id?: string;
  step_id?: string;
  anchor_id?: string;
  location_state?: LocationState;
  commitment_envelope?: {
    envelope_id: string;
    envelope_type: CommitmentEnvelopeType;
  };
}

/**
 * Chains Response - API response for chains endpoint
 */
export interface ChainsResponse {
  date: string;
  anchors: Anchor[];
  chains: ExecutionChain[];
  home_intervals: HomeInterval[];
  wake_ramp?: WakeRamp;
}

/**
 * Daily Plan Response Extension for V2
 */
export interface DailyPlanV2Response {
  // Existing V1.2 fields
  plan_id: string;
  date: string;
  time_blocks: TimeBlock[];
  
  // New V2 fields
  chains: ExecutionChain[];
  home_intervals: HomeInterval[];
  wake_ramp?: WakeRamp;
  location_periods: LocationPeriod[];
}

// Type aliases and enums

/**
 * Anchor Type - Classification of calendar events
 */
export type AnchorType = 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';

/**
 * Chain Step Status
 */
export type ChainStepStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';

/**
 * Chain Step Role
 */
export type ChainStepRole = 'anchor' | 'chain-step' | 'exit-gate' | 'recovery';

/**
 * Chain Status
 */
export type ChainStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * Exit Gate Status
 */
export type ExitGateStatus = 'blocked' | 'ready';

/**
 * Commitment Envelope Type
 */
export type CommitmentEnvelopeType = 'prep' | 'travel_there' | 'anchor' | 'travel_back' | 'recovery';

/**
 * Energy State (from V1, re-exported for convenience)
 */
export type EnergyState = 'low' | 'medium' | 'high';
