// src/components/habits/HabitsPageEnhanced.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import HabitCreationModal from './HabitCreationModal';
import MobileQuickActionsWrapper from './MobileQuickActionsWrapper';
import { UXPolishProvider } from './UXPolishProvider';

interface NewHabitData {
  name: string;
  description?: string;
  category: string;
  type: 'build' | 'break' | 'maintain';
  measurement_type: 'boolean' | 'count' | 'duration';
  target_value?: number;
  target_unit?: string;
  color: string;
  reminder_time?: string;
  allows_skips: boolean;
}

// Declare global function for TypeScript
declare global {
  interface Window {
    openHabitCreationModal?: () => void;
  }
}

export default function HabitsPageEnhanced() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitsData, setHabitsData] = useState<any>(null);

  const handleCreateHabit = async (habitData: NewHabitData) => {
    try {
      const response = await fetch('/api/habits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(habitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create habit');
      }

      const result = await response.json();
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>✅ ${habitData.name} created successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
        // Reload the page to show the new habit
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error creating habit:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  // Function to be called from the global scope
  React.useEffect(() => {
    // Make the function available globally so the button can call it
    const openModal = () => {
      setIsModalOpen(true);
    };
    
    (window as any).openHabitCreationModal = openModal;

    // Extract habits data from the page for mobile quick actions
    const extractHabitsData = () => {
      try {
        // Get habits data from the page's script tag or global variable
        const habitsScript = document.querySelector('script[data-habits]');
        if (habitsScript) {
          const data = JSON.parse(habitsScript.textContent || '{}');
          setHabitsData(data);
        } else {
          // Fallback: extract from DOM elements
          const habitCards = document.querySelectorAll('[data-habit-id]');
          const habits = Array.from(habitCards).map(card => {
            const habitId = card.getAttribute('data-habit-id');
            const nameEl = card.querySelector('h3, h4, .habit-name');
            const colorEl = card.querySelector('[style*="background-color"]');
            const streakEl = card.querySelector('.streak, [class*="streak"]');
            const completedEl = card.querySelector('.completed, [class*="completed"]');
            
            return {
              id: habitId,
              name: nameEl?.textContent?.trim() || 'Unknown Habit',
              type: 'build', // Default
              measurement_type: 'boolean', // Default
              color: colorEl ? getComputedStyle(colorEl).backgroundColor : '#3B82F6',
              streak_count: parseInt(streakEl?.textContent?.match(/\d+/)?.[0] || '0'),
              allows_skips: false, // Default
              completedToday: !!completedEl
            };
          });
          
          if (habits.length > 0) {
            setHabitsData({ habits });
          }
        }
      } catch (error) {
        console.error('Failed to extract habits data:', error);
      }
    };

    extractHabitsData();

    // Initialize UX Polish Provider
    const uxPolishRoot = document.getElementById('ux-polish-root');
    if (uxPolishRoot && !uxPolishRoot.hasChildNodes()) {
      const root = createRoot(uxPolishRoot);
      root.render(
        <UXPolishProvider>
          <div /> {/* Empty div as UXPolishProvider handles everything globally */}
        </UXPolishProvider>
      );
    }

    return () => {
      // Cleanup
      delete (window as any).openHabitCreationModal;
    };
  }, []);

  return (
    <>
      {/* Mobile Quick Actions - only render on mobile */}
      {habitsData && (
        <div className="block md:hidden mb-6">
          <MobileQuickActionsWrapper habitsData={habitsData} />
        </div>
      )}
      
      <HabitCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateHabit}
      />
    </>
  );
}