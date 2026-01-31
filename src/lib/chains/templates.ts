// Chain-Based Execution Engine (V2) - Chain Templates

import type { ChainTemplate, ChainStep, AnchorType } from './types';

/**
 * Default Exit Gate Conditions
 * These are the standard checklist items that must be satisfied before leaving
 */
export const DEFAULT_GATE_TAGS = [
  'keys',
  'phone',
  'water',
  'meds',
  'cat-fed',
  'bag-packed'
];

/**
 * Chain Templates for Different Anchor Types
 * 
 * Each template defines the execution chain required to safely reach an anchor.
 * Steps are ordered from earliest to latest in the chain.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const CHAIN_TEMPLATES: Record<AnchorType, ChainTemplate> = {
  /**
   * Class Template
   * Standard chain for lectures, tutorials, and regular classes
   * Includes full preparation sequence with optional shower
   */
  class: {
    anchor_type: 'class',
    steps: [
      {
        id: 'feed-cat',
        name: 'Feed cat',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'bathroom',
        name: 'Bathroom',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'hygiene',
        name: 'Hygiene (brush teeth)',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'shower',
        name: 'Shower',
        duration_estimate: 15,
        is_required: false,
        can_skip_when_late: true
      },
      {
        id: 'dress',
        name: 'Get dressed',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'pack-bag',
        name: 'Pack bag',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'exit-gate',
        name: 'Exit Readiness Check',
        duration_estimate: 2,
        is_required: true,
        can_skip_when_late: false,
        gate_tags: DEFAULT_GATE_TAGS
      },
      {
        id: 'leave',
        name: 'Leave house',
        duration_estimate: 0,
        is_required: true,
        can_skip_when_late: false
      }
    ]
  },

  /**
   * Seminar Template
   * Extended preparation time for seminars and workshops
   * Includes additional prep time (25 min instead of 15 min total prep)
   */
  seminar: {
    anchor_type: 'seminar',
    steps: [
      {
        id: 'feed-cat',
        name: 'Feed cat',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'bathroom',
        name: 'Bathroom',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'hygiene',
        name: 'Hygiene (brush teeth)',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'shower',
        name: 'Shower',
        duration_estimate: 15,
        is_required: false,
        can_skip_when_late: true
      },
      {
        id: 'dress',
        name: 'Get dressed',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'review-materials',
        name: 'Review seminar materials',
        duration_estimate: 15,
        is_required: false,
        can_skip_when_late: true
      },
      {
        id: 'pack-bag',
        name: 'Pack bag',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'exit-gate',
        name: 'Exit Readiness Check',
        duration_estimate: 2,
        is_required: true,
        can_skip_when_late: false,
        gate_tags: DEFAULT_GATE_TAGS
      },
      {
        id: 'leave',
        name: 'Leave house',
        duration_estimate: 0,
        is_required: true,
        can_skip_when_late: false
      }
    ]
  },

  /**
   * Workshop Template
   * Similar to seminar with extended prep time
   * Includes material review and preparation
   */
  workshop: {
    anchor_type: 'workshop',
    steps: [
      {
        id: 'feed-cat',
        name: 'Feed cat',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'bathroom',
        name: 'Bathroom',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'hygiene',
        name: 'Hygiene (brush teeth)',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'shower',
        name: 'Shower',
        duration_estimate: 15,
        is_required: false,
        can_skip_when_late: true
      },
      {
        id: 'dress',
        name: 'Get dressed',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'review-materials',
        name: 'Review workshop materials',
        duration_estimate: 15,
        is_required: false,
        can_skip_when_late: true
      },
      {
        id: 'pack-bag',
        name: 'Pack bag',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'exit-gate',
        name: 'Exit Readiness Check',
        duration_estimate: 2,
        is_required: true,
        can_skip_when_late: false,
        gate_tags: DEFAULT_GATE_TAGS
      },
      {
        id: 'leave',
        name: 'Leave house',
        duration_estimate: 0,
        is_required: true,
        can_skip_when_late: false
      }
    ]
  },

  /**
   * Appointment Template
   * Streamlined chain for appointments and meetings
   * No cat feeding, shorter prep sequence
   */
  appointment: {
    anchor_type: 'appointment',
    steps: [
      {
        id: 'bathroom',
        name: 'Bathroom',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'hygiene',
        name: 'Hygiene (brush teeth)',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'dress',
        name: 'Get dressed',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'pack-bag',
        name: 'Pack bag',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'exit-gate',
        name: 'Exit Readiness Check',
        duration_estimate: 2,
        is_required: true,
        can_skip_when_late: false,
        gate_tags: DEFAULT_GATE_TAGS
      },
      {
        id: 'leave',
        name: 'Leave house',
        duration_estimate: 0,
        is_required: true,
        can_skip_when_late: false
      }
    ]
  },

  /**
   * Other Template (Default)
   * Fallback template for unclassified anchor types
   * Uses the same structure as class template
   */
  other: {
    anchor_type: 'other',
    steps: [
      {
        id: 'feed-cat',
        name: 'Feed cat',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'bathroom',
        name: 'Bathroom',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'hygiene',
        name: 'Hygiene (brush teeth)',
        duration_estimate: 5,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'shower',
        name: 'Shower',
        duration_estimate: 15,
        is_required: false,
        can_skip_when_late: true
      },
      {
        id: 'dress',
        name: 'Get dressed',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'pack-bag',
        name: 'Pack bag',
        duration_estimate: 10,
        is_required: true,
        can_skip_when_late: false
      },
      {
        id: 'exit-gate',
        name: 'Exit Readiness Check',
        duration_estimate: 2,
        is_required: true,
        can_skip_when_late: false,
        gate_tags: DEFAULT_GATE_TAGS
      },
      {
        id: 'leave',
        name: 'Leave house',
        duration_estimate: 0,
        is_required: true,
        can_skip_when_late: false
      }
    ]
  }
};

/**
 * Get chain template for anchor type
 * Returns the appropriate template or falls back to 'other' template
 * 
 * @param anchorType - Type of anchor (class, seminar, workshop, appointment, other)
 * @returns Chain template for the anchor type
 */
export function getChainTemplate(anchorType: AnchorType): ChainTemplate {
  return CHAIN_TEMPLATES[anchorType] || CHAIN_TEMPLATES.other;
}

/**
 * Calculate total estimated duration for a chain template
 * Sums up all step durations (including optional steps)
 * 
 * @param template - Chain template
 * @returns Total duration in minutes
 */
export function calculateTemplateDuration(template: ChainTemplate): number {
  return template.steps.reduce((total, step) => total + step.duration_estimate, 0);
}

/**
 * Calculate minimum required duration for a chain template
 * Sums up only required step durations
 * 
 * @param template - Chain template
 * @returns Minimum required duration in minutes
 */
export function calculateMinimumDuration(template: ChainTemplate): number {
  return template.steps
    .filter(step => step.is_required)
    .reduce((total, step) => total + step.duration_estimate, 0);
}

/**
 * Get all required steps from a template
 * 
 * @param template - Chain template
 * @returns Array of required chain steps
 */
export function getRequiredSteps(template: ChainTemplate): ChainStep[] {
  return template.steps.filter(step => step.is_required);
}

/**
 * Get all optional steps from a template
 * 
 * @param template - Chain template
 * @returns Array of optional chain steps
 */
export function getOptionalSteps(template: ChainTemplate): ChainStep[] {
  return template.steps.filter(step => !step.is_required);
}

/**
 * Get steps that can be skipped when running late
 * 
 * @param template - Chain template
 * @returns Array of skippable chain steps
 */
export function getSkippableSteps(template: ChainTemplate): ChainStep[] {
  return template.steps.filter(step => step.can_skip_when_late);
}
