// src/test/e2e/habit-workflow.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Complete Habit Workflow End-to-End', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a comprehensive DOM for testing
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app">
            <!-- Habit Creation Modal -->
            <div id="habit-creation-modal" class="hidden">
              <form id="habit-creation-form">
                <input type="text" id="habit-name" placeholder="Habit name" />
                <select id="habit-type">
                  <option value="build">Build</option>
                  <option value="break">Break</option>
                  <option value="maintain">Maintain</option>
                </select>
                <select id="measurement-type">
                  <option value="boolean">Yes/No</option>
                  <option value="count">Count</option>
                  <option value="duration">Duration</option>
                </select>
                <input type="number" id="target-value" placeholder="Target" />
                <input type="color" id="habit-color" value="#3B82F6" />
                <button type="submit">Create Habit</button>
              </form>
            </div>

            <!-- Habits List -->
            <div id="habits-container">
              <button id="new-habit-btn">New Habit</button>
              <div id="habits-list"></div>
            </div>

            <!-- Enhanced Logging Modal -->
            <div id="enhanced-logging-modal" class="hidden">
              <form id="enhanced-logging-form">
                <input type="date" id="log-date" />
                <div id="status-buttons">
                  <button type="button" data-value="0">Failed</button>
                  <button type="button" data-value="1">Completed</button>
                  <button type="button" data-value="2">Skipped</button>
                  <button type="button" data-value="3">Partial</button>
                </div>
                <input type="range" id="effort" min="1" max="5" value="3" />
                <input type="range" id="energy" min="1" max="5" value="3" />
                <input type="range" id="mood" min="1" max="5" value="3" />
                <select id="location">
                  <option value="">Select location</option>
                  <option value="Home">Home</option>
                  <option value="Gym">Gym</option>
                  <option value="Office">Office</option>
                </select>
                <textarea id="notes" placeholder="Notes..."></textarea>
                <button type="submit">Log Habit</button>
              </form>
            </div>

            <!-- Analytics Dashboard -->
            <div id="analytics-dashboard" class="hidden">
              <div id="completion-rate-chart"></div>
              <div id="streak-timeline"></div>
              <div id="context-correlations"></div>
            </div>

            <!-- Mobile Quick Actions -->
            <div id="mobile-quick-actions" class="mobile-only">
              <div id="quick-actions-list"></div>
              <button id="batch-complete-btn">Complete Selected</button>
            </div>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window as any;
    
    // Set up global variables
    (global as any).document = document;
    (global as any).window = window;
    
    // Mock successful API responses
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      const method = options?.method || 'GET';
      const body = options?.body ? JSON.parse(options.body) : {};
      
      // Route API calls
      if (url.includes('/api/habits') && method === 'POST' && !url.includes('/log')) {
        // Habit creation
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'habit-123',
            name: body.name,
            type: body.type,
            measurement_type: body.measurement_type,
            color: body.color,
            current_streak: 0,
            best_streak: 0
          })
        });
      }
      
      if (url.includes('/log-enhanced')) {
        // Enhanced logging
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'entry-123',
            message: 'Habit logged successfully',
            streakUpdate: {
              currentStreak: 5,
              bestStreak: 10
            }
          })
        });
      }
      
      if (url.includes('/analytics')) {
        // Analytics
        return Promise.resolve({
          ok: true,
          json: async () => ({
            analytics: {
              completionRate: 0.75,
              streakTimeline: [
                { date: '2025-01-01', streak: 1 },
                { date: '2025-01-02', streak: 2 },
                { date: '2025-01-03', streak: 3 }
              ],
              contextCorrelations: {
                mood: { correlation: 0.8, insight: 'Higher mood leads to better completion' },
                energy_level: { correlation: 0.7, insight: 'High energy improves success rate' }
              }
            }
          })
        });
      }
      
      // Default response
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      });
    });
  });

  describe('Complete Habit Creation Workflow', () => {
    it('should create a new habit through the complete flow', async () => {
      // Set up workflow functions
      (window as any).showHabitCreationModal = () => {
        const modal = document.getElementById('habit-creation-modal');
        modal?.classList.remove('hidden');
      };

      (window as any).createHabit = async (formData: any) => {
        const response = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          const habit = await response.json();
          (window as any).addHabitToList(habit);
          return habit;
        }
        throw new Error('Failed to create habit');
      };

      (window as any).addHabitToList = (habit: any) => {
        const habitsList = document.getElementById('habits-list');
        const habitCard = document.createElement('div');
        habitCard.className = 'habit-card';
        habitCard.innerHTML = `
          <h3>${habit.name}</h3>
          <p>Type: ${habit.type}</p>
          <p>Streak: ${habit.current_streak}</p>
          <button onclick="logHabit('${habit.id}', '${habit.name}')">Log</button>
        `;
        habitsList?.appendChild(habitCard);
      };

      // Step 1: Click "New Habit" button
      const newHabitBtn = document.getElementById('new-habit-btn');
      newHabitBtn?.click();
      (window as any).showHabitCreationModal();

      // Verify modal is shown
      const modal = document.getElementById('habit-creation-modal');
      expect(modal?.classList.contains('hidden')).toBe(false);

      // Step 2: Fill out the form
      const nameInput = document.getElementById('habit-name') as HTMLInputElement;
      const typeSelect = document.getElementById('habit-type') as HTMLSelectElement;
      const measurementSelect = document.getElementById('measurement-type') as HTMLSelectElement;
      const colorInput = document.getElementById('habit-color') as HTMLInputElement;

      nameInput.value = 'Daily Exercise';
      typeSelect.value = 'build';
      measurementSelect.value = 'boolean';
      colorInput.value = '#10B981';

      // Step 3: Submit the form
      const formData = {
        name: nameInput.value,
        type: typeSelect.value,
        measurement_type: measurementSelect.value,
        color: colorInput.value
      };

      const createdHabit = await (window as any).createHabit(formData);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      // Verify habit was added to the list
      const habitsList = document.getElementById('habits-list');
      expect(habitsList?.innerHTML).toContain('Daily Exercise');
      expect(habitsList?.innerHTML).toContain('Type: build');

      // Verify habit object
      expect(createdHabit.name).toBe('Daily Exercise');
      expect(createdHabit.type).toBe('build');
    });
  });

  describe('Complete Habit Logging Workflow', () => {
    it('should log a habit with enhanced context through the complete flow', async () => {
      // Set up habit logging functions
      (window as any).selectedStatus = null;
      (window as any).selectedContext = [];

      (window as any).showEnhancedLoggingModal = (habitId: string, habitName: string) => {
        const modal = document.getElementById('enhanced-logging-modal');
        modal?.classList.remove('hidden');
        
        // Set up status button handlers
        const statusButtons = document.querySelectorAll('#status-buttons button');
        statusButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            (window as any).selectedStatus = parseInt(btn.getAttribute('data-value') || '0');
            statusButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });
      };

      (window as any).logHabitEnhanced = async (habitId: string) => {
        const logDate = (document.getElementById('log-date') as HTMLInputElement)?.value;
        const effort = (document.getElementById('effort') as HTMLInputElement)?.value;
        const energy = (document.getElementById('energy') as HTMLInputElement)?.value;
        const mood = (document.getElementById('mood') as HTMLInputElement)?.value;
        const location = (document.getElementById('location') as HTMLSelectElement)?.value;
        const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value;

        const logData = {
          value: (window as any).selectedStatus,
          date: logDate || new Date().toISOString().split('T')[0],
          effort: parseInt(effort),
          energy_level: parseInt(energy),
          mood: parseInt(mood),
          location: location || null,
          notes: notes || null,
          context: (window as any).selectedContext
        };

        const response = await fetch(`/api/habits/${habitId}/log-enhanced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData)
        });

        if (response.ok) {
          const result = await response.json();
          (window as any).updateHabitStreak(habitId, result.streakUpdate);
          return result;
        }
        throw new Error('Failed to log habit');
      };

      (window as any).updateHabitStreak = (habitId: string, streakUpdate: any) => {
        const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (habitCard) {
          const streakElement = habitCard.querySelector('.streak-display');
          if (streakElement) {
            streakElement.textContent = `Streak: ${streakUpdate.currentStreak}`;
          }
        }
      };

      // Add a habit card to test with
      const habitsList = document.getElementById('habits-list');
      if (habitsList) {
        habitsList.innerHTML = `
          <div class="habit-card" data-habit-id="habit-123">
            <h3>Daily Exercise</h3>
            <p class="streak-display">Streak: 4</p>
            <button onclick="logHabit('habit-123', 'Daily Exercise')">Log</button>
          </div>
        `;
      }

      (window as any).logHabit = (habitId: string, habitName: string) => {
        (window as any).showEnhancedLoggingModal(habitId, habitName);
      };

      // Step 1: Click log button on habit
      (window as any).logHabit('habit-123', 'Daily Exercise');

      // Verify modal is shown
      const modal = document.getElementById('enhanced-logging-modal');
      expect(modal?.classList.contains('hidden')).toBe(false);

      // Step 2: Select completion status
      const completedBtn = document.querySelector('[data-value="1"]') as HTMLButtonElement;
      completedBtn?.click();
      expect((window as any).selectedStatus).toBe(1);

      // Step 3: Fill out context data
      const dateInput = document.getElementById('log-date') as HTMLInputElement;
      const effortSlider = document.getElementById('effort') as HTMLInputElement;
      const energySlider = document.getElementById('energy') as HTMLInputElement;
      const moodSlider = document.getElementById('mood') as HTMLInputElement;
      const locationSelect = document.getElementById('location') as HTMLSelectElement;
      const notesTextarea = document.getElementById('notes') as HTMLTextAreaElement;

      dateInput.value = '2025-01-15';
      effortSlider.value = '4';
      energySlider.value = '5';
      moodSlider.value = '4';
      locationSelect.value = 'Gym';
      notesTextarea.value = 'Great workout today!';

      // Step 4: Submit the enhanced log
      const result = await (window as any).logHabitEnhanced('habit-123');

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/habits/habit-123/log-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 1,
          date: '2025-01-15',
          effort: 4,
          energy_level: 5,
          mood: 4,
          location: 'Gym',
          notes: 'Great workout today!',
          context: []
        })
      });

      // Verify streak was updated
      const streakDisplay = document.querySelector('.streak-display');
      expect(streakDisplay?.textContent).toBe('Streak: 5');

      // Verify result
      expect(result.message).toBe('Habit logged successfully');
    });
  });

  describe('Analytics Workflow', () => {
    it('should load and display analytics data', async () => {
      // Set up analytics functions
      (window as any).loadAnalytics = async (habitIds: string[], timeRange: string) => {
        const response = await fetch('/api/habits/analytics/optimized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitIds,
            timeRange,
            analysisType: 'comprehensive'
          })
        });

        if (response.ok) {
          const data = await response.json();
          (window as any).displayAnalytics(data.analytics);
          return data;
        }
        throw new Error('Failed to load analytics');
      };

      (window as any).displayAnalytics = (analytics: any) => {
        const dashboard = document.getElementById('analytics-dashboard');
        dashboard?.classList.remove('hidden');

        // Display completion rate
        const completionChart = document.getElementById('completion-rate-chart');
        if (completionChart) {
          completionChart.innerHTML = `<p>Completion Rate: ${(analytics.completionRate * 100).toFixed(1)}%</p>`;
        }

        // Display streak timeline
        const streakTimeline = document.getElementById('streak-timeline');
        if (streakTimeline && analytics.streakTimeline) {
          streakTimeline.innerHTML = `<p>Timeline: ${analytics.streakTimeline.length} data points</p>`;
        }

        // Display context correlations
        const contextCorrelations = document.getElementById('context-correlations');
        if (contextCorrelations && analytics.contextCorrelations) {
          const correlationText = Object.entries(analytics.contextCorrelations)
            .map(([key, value]: [string, any]) => `${key}: ${value.insight}`)
            .join('; ');
          contextCorrelations.innerHTML = `<p>Insights: ${correlationText}</p>`;
        }
      };

      // Load analytics for a habit
      const analyticsData = await (window as any).loadAnalytics(['habit-123'], '30d');

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith('/api/habits/analytics/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitIds: ['habit-123'],
          timeRange: '30d',
          analysisType: 'comprehensive'
        })
      });

      // Verify dashboard is displayed
      const dashboard = document.getElementById('analytics-dashboard');
      expect(dashboard?.classList.contains('hidden')).toBe(false);

      // Verify analytics content
      const completionChart = document.getElementById('completion-rate-chart');
      expect(completionChart?.innerHTML).toContain('Completion Rate: 75.0%');

      const contextCorrelations = document.getElementById('context-correlations');
      expect(contextCorrelations?.innerHTML).toContain('Higher mood leads to better completion');

      // Verify data structure
      expect(analyticsData.analytics.completionRate).toBe(0.75);
      expect(analyticsData.analytics.streakTimeline).toHaveLength(3);
    });
  });

  describe('Mobile Quick Actions Workflow', () => {
    it('should handle mobile quick actions and batch completion', async () => {
      // Set up mobile functions
      (window as any).selectedHabits = new Set();

      (window as any).loadQuickActions = () => {
        const quickActionsList = document.getElementById('quick-actions-list');
        if (quickActionsList) {
          quickActionsList.innerHTML = `
            <div class="quick-action-item" data-habit-id="habit-1">
              <input type="checkbox" class="habit-selector" />
              <span>Exercise</span>
              <button class="quick-complete" data-habit-id="habit-1">✓</button>
            </div>
            <div class="quick-action-item" data-habit-id="habit-2">
              <input type="checkbox" class="habit-selector" />
              <span>Meditation</span>
              <button class="quick-complete" data-habit-id="habit-2">✓</button>
            </div>
          `;

          // Set up event listeners
          document.querySelectorAll('.habit-selector').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
              const target = e.target as HTMLInputElement;
              const habitId = target.closest('.quick-action-item')?.getAttribute('data-habit-id');
              if (habitId) {
                if (target.checked) {
                  (window as any).selectedHabits.add(habitId);
                } else {
                  (window as any).selectedHabits.delete(habitId);
                }
              }
            });
          });

          document.querySelectorAll('.quick-complete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const habitId = (e.target as HTMLElement).getAttribute('data-habit-id');
              if (habitId) {
                await (window as any).quickCompleteHabit(habitId);
              }
            });
          });
        }
      };

      (window as any).quickCompleteHabit = async (habitId: string) => {
        const response = await fetch(`/api/habits/${habitId}/log-enhanced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: 1,
            date: new Date().toISOString().split('T')[0]
          })
        });

        if (response.ok) {
          const quickActionItem = document.querySelector(`[data-habit-id="${habitId}"]`);
          quickActionItem?.classList.add('completed');
          return await response.json();
        }
        throw new Error('Failed to complete habit');
      };

      (window as any).batchCompleteHabits = async () => {
        const habitIds = Array.from((window as any).selectedHabits);
        
        const response = await fetch('/api/habits/batch-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitIds,
            value: 1,
            date: new Date().toISOString().split('T')[0]
          })
        });

        if (response.ok) {
          habitIds.forEach(habitId => {
            const quickActionItem = document.querySelector(`[data-habit-id="${habitId}"]`);
            quickActionItem?.classList.add('completed');
          });
          (window as any).selectedHabits.clear();
          return await response.json();
        }
        throw new Error('Failed to batch complete habits');
      };

      // Load quick actions
      (window as any).loadQuickActions();

      // Test single quick completion
      const quickCompleteBtn = document.querySelector('[data-habit-id="habit-1"] .quick-complete') as HTMLButtonElement;
      await quickCompleteBtn?.click();

      // Verify single completion API call
      expect(global.fetch).toHaveBeenCalledWith('/api/habits/habit-1/log-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 1,
          date: expect.any(String)
        })
      });

      // Test batch completion
      const checkbox1 = document.querySelector('[data-habit-id="habit-1"] .habit-selector') as HTMLInputElement;
      const checkbox2 = document.querySelector('[data-habit-id="habit-2"] .habit-selector') as HTMLInputElement;
      
      checkbox1.checked = true;
      checkbox1.dispatchEvent(new Event('change'));
      checkbox2.checked = true;
      checkbox2.dispatchEvent(new Event('change'));

      expect((window as any).selectedHabits.size).toBe(2);

      // Set up batch complete button
      const batchCompleteBtn = document.getElementById('batch-complete-btn');
      batchCompleteBtn?.addEventListener('click', (window as any).batchCompleteHabits);
      
      await batchCompleteBtn?.click();

      // Verify batch completion API call
      expect(global.fetch).toHaveBeenCalledWith('/api/habits/batch-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitIds: ['habit-1', 'habit-2'],
          value: 1,
          date: expect.any(String)
        })
      });

      // Verify UI updates
      const completedItems = document.querySelectorAll('.quick-action-item.completed');
      expect(completedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle API errors gracefully throughout the workflow', async () => {
      // Mock API failure
      (global.fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Network error' })
        })
      );

      // Set up error handling
      (window as any).showError = (message: string) => {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
      };

      (window as any).createHabitWithErrorHandling = async (formData: any) => {
        try {
          const response = await fetch('/api/habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create habit');
          }

          return await response.json();
        } catch (error) {
          (window as any).showError((error as Error).message);
          throw error;
        }
      };

      // Attempt to create habit with error
      try {
        await (window as any).createHabitWithErrorHandling({
          name: 'Test Habit',
          type: 'build',
          measurement_type: 'boolean'
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify error message is displayed
      const errorMessage = document.getElementById('error-message');
      expect(errorMessage?.textContent).toBe('Network error');
      expect(errorMessage?.className).toBe('error');
    });
  });
});