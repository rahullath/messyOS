/**
 * Notes-First Logging UI Component
 * 
 * Provides a structured chip-based interface for logging habits with rich context.
 * Chips are generated based on habit semantic type, allowing quick composition
 * of parseable notes alongside free-form text input.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import React, { useState, useMemo } from 'react';
import { SemanticType, inferSemanticType } from '../../lib/habits/taxonomy';
import type { Habit } from '../../types/habits';

interface NotesFirstLoggingUIProps {
  habit: Habit;
  onSubmit: (notes: string, value?: number) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface Chip {
  id: string;
  label: string;
  value: string;
  category: string;
}

/**
 * Generate chip suggestions based on habit semantic type
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
function generateChips(semanticType: SemanticType | null): Chip[] {
  if (!semanticType) return [];

  const chips: Chip[] = [];

  // Nicotine chips (Requirement 9.2)
  if (semanticType === SemanticType.NICOTINE_POUCHES || semanticType === SemanticType.VAPING_PUFFS) {
    // Strength chips
    chips.push(
      { id: 'strength-3mg', label: '3mg', value: '3mg', category: 'strength' },
      { id: 'strength-6mg', label: '6mg', value: '6mg', category: 'strength' },
      { id: 'strength-13.5mg', label: '13.5mg', value: '13.5mg', category: 'strength' },
      { id: 'strength-50mg', label: '50mg', value: '50mg', category: 'strength' }
    );
    
    // Count chips
    chips.push(
      { id: 'count-1', label: '1', value: '1', category: 'count' },
      { id: 'count-2', label: '2', value: '2', category: 'count' },
      { id: 'count-3+', label: '3+', value: '3', category: 'count' }
    );
    
    // Timing chips
    chips.push(
      { id: 'timing-morning', label: 'Morning', value: 'morning', category: 'timing' },
      { id: 'timing-afternoon', label: 'Afternoon', value: 'afternoon', category: 'timing' },
      { id: 'timing-evening', label: 'Evening', value: 'evening', category: 'timing' }
    );
  }

  // Shower chips (Requirement 9.3)
  if (semanticType === SemanticType.SHOWER) {
    // Type chips
    chips.push(
      { id: 'shower-reg', label: 'Reg shower', value: 'reg shower', category: 'type' },
      { id: 'shower-head', label: 'Head shower', value: 'head shower', category: 'type' },
      { id: 'shower-proper', label: 'Proper cleanse', value: 'proper cleanse', category: 'type' },
      { id: 'shower-water', label: 'Only water', value: 'only water', category: 'type' }
    );
    
    // Includes chips
    chips.push(
      { id: 'includes-skincare', label: '+ Skincare', value: 'with skincare', category: 'includes' },
      { id: 'includes-oral', label: '+ Oral hygiene', value: 'with oral hygiene', category: 'includes' }
    );
  }

  // Cannabis chips (Requirement 9.4)
  if (semanticType === SemanticType.POT_USE) {
    // Method chips
    chips.push(
      { id: 'method-vaporizer', label: 'Vaporizer', value: 'vaporizer', category: 'method' },
      { id: 'method-bong', label: 'Bong', value: 'bong', category: 'method' },
      { id: 'method-edibles', label: 'Edibles', value: 'edibles', category: 'method' },
      { id: 'method-avb', label: 'AVB', value: 'avb', category: 'method' }
    );
    
    // Sessions chips
    chips.push(
      { id: 'sessions-0.5', label: '0.5 sesh', value: '0.5 sesh', category: 'sessions' },
      { id: 'sessions-1', label: '1 sesh', value: '1 sesh', category: 'sessions' },
      { id: 'sessions-1.5', label: '1.5 sesh', value: '1.5 sesh', category: 'sessions' },
      { id: 'sessions-2+', label: '2+ sesh', value: '2 sesh', category: 'sessions' }
    );
    
    // Context chips
    chips.push(
      { id: 'context-shared', label: 'Shared', value: 'shared', category: 'context' },
      { id: 'context-alone', label: 'Alone', value: 'alone', category: 'context' }
    );
  }

  // Meal chips (Requirement 9.5)
  if (semanticType === SemanticType.MEALS_COOKED) {
    // Count chips
    chips.push(
      { id: 'meal-count-1', label: '1 meal', value: '1 meal', category: 'count' },
      { id: 'meal-count-2', label: '2 meals', value: '2 meals', category: 'count' },
      { id: 'meal-count-3', label: '3 meals', value: '3 meals', category: 'count' }
    );
    
    // Type chips
    chips.push(
      { id: 'meal-type-cooked', label: 'Cooked', value: 'cooked', category: 'type' },
      { id: 'meal-type-takeout', label: 'Takeout', value: 'takeout', category: 'type' },
      { id: 'meal-type-simple', label: 'Simple', value: 'simple', category: 'type' }
    );
  }

  return chips;
}

/**
 * Group chips by category for organized display
 */
function groupChipsByCategory(chips: Chip[]): Record<string, Chip[]> {
  return chips.reduce((acc, chip) => {
    if (!acc[chip.category]) {
      acc[chip.category] = [];
    }
    acc[chip.category].push(chip);
    return acc;
  }, {} as Record<string, Chip[]>);
}

/**
 * Compose note string from selected chips and free-form text
 * Requirements: 9.6
 */
function composeNote(selectedChips: Chip[], freeText: string): string {
  const chipValues = selectedChips.map(chip => chip.value);
  const parts = [...chipValues];
  
  if (freeText.trim()) {
    parts.push(freeText.trim());
  }
  
  return parts.join(', ');
}

export default function NotesFirstLoggingUI({
  habit,
  onSubmit,
  onCancel,
  className = ''
}: NotesFirstLoggingUIProps) {
  const [selectedChips, setSelectedChips] = useState<Chip[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Infer semantic type from habit
  const semanticType = useMemo(() => {
    return inferSemanticType(habit.name, habit.target_unit || undefined);
  }, [habit.name, habit.target_unit]);

  // Generate chips based on semantic type
  const chips = useMemo(() => generateChips(semanticType), [semanticType]);
  const chipsByCategory = useMemo(() => groupChipsByCategory(chips), [chips]);

  // Toggle chip selection
  const toggleChip = (chip: Chip) => {
    setSelectedChips(prev => {
      const isSelected = prev.some(c => c.id === chip.id);
      
      if (isSelected) {
        // Deselect chip
        return prev.filter(c => c.id !== chip.id);
      } else {
        // For single-select categories (type, method), deselect others in same category
        const singleSelectCategories = ['type', 'method'];
        if (singleSelectCategories.includes(chip.category)) {
          return [...prev.filter(c => c.category !== chip.category), chip];
        }
        
        // For multi-select categories, just add
        return [...prev, chip];
      }
    });
  };

  // Check if chip is selected
  const isChipSelected = (chip: Chip) => {
    return selectedChips.some(c => c.id === chip.id);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Compose note from chips and free text (Requirement 9.6)
      const composedNote = composeNote(selectedChips, freeText);
      
      // Submit with composed note (Requirement 9.7)
      await onSubmit(composedNote);
      
      // Reset form on success
      setSelectedChips([]);
      setFreeText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log habit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category display names
  const categoryLabels: Record<string, string> = {
    strength: 'Strength',
    count: 'Count',
    timing: 'Timing',
    type: 'Type',
    includes: 'Includes',
    method: 'Method',
    sessions: 'Sessions',
    context: 'Context'
  };

  return (
    <div className={`notes-first-logging-ui ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chip suggestions by category (Requirement 9.1) */}
        {Object.keys(chipsByCategory).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Quick add:</h4>
            
            {Object.entries(chipsByCategory).map(([category, categoryChips]) => (
              <div key={category} className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {categoryLabels[category] || category}
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryChips.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium transition-all
                        ${isChipSelected(chip)
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Free-form text input (Requirement 9.7) */}
        <div className="space-y-2">
          <label htmlFor="free-text" className="text-sm font-medium text-gray-700">
            Additional notes (optional)
          </label>
          <textarea
            id="free-text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Add any additional details..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Preview of composed note */}
        {(selectedChips.length > 0 || freeText.trim()) && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Preview:</p>
            <p className="text-sm text-gray-800">
              {composeNote(selectedChips, freeText) || <span className="text-gray-400">No content</span>}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Logging...' : 'Log Habit'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
