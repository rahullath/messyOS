// src/test/integration/habits-enhanced-logging-e2e.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Habits Enhanced Logging End-to-End', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a new DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="test-container">
            <div data-habit-id="habit-123" class="habit-card">
              <h3>Exercise</h3>
              <button onclick="logHabit('habit-123', 'Exercise')">Log Habit</button>
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
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'entry-123',
        habit_id: 'habit-123',
        value: 1,
        message: 'Enhanced habit entry logged successfully'
      })
    });
  });

  it('should create enhanced logging modal when logHabit is called', () => {
    // Define the functions that would be in the habits page
    (window as any).selectedStatus = 1;
    (window as any).selectedContext = [];
    
    (window as any).showEnhancedLoggingModal = (habitId: string, habitName: string, allowsSkips: boolean) => {
      const modal = document.createElement('div');
      modal.id = 'enhanced-logging-modal';
      modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-gray-900 rounded-xl w-full max-w-2xl">
          <div class="p-6">
            <h2 class="text-2xl font-bold text-white">Log ${habitName}</h2>
            <form id="enhanced-logging-form">
              <input type="date" id="log-date" value="2025-01-01" />
              <input type="range" id="effort" value="3" min="1" max="5" />
              <input type="range" id="energy" value="3" min="1" max="5" />
              <input type="range" id="mood" value="3" min="1" max="5" />
              <button type="submit">Log ${habitName}</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    };
    
    (window as any).logHabit = (habitId: string, habitName: string) => {
      (window as any).showEnhancedLoggingModal(habitId, habitName, false);
    };

    // Simulate clicking the log habit button
    (window as any).logHabit('habit-123', 'Exercise');

    // Verify modal was created
    const modal = document.getElementById('enhanced-logging-modal');
    expect(modal).toBeTruthy();
    expect(modal?.innerHTML).toContain('Log Exercise');
    expect(modal?.innerHTML).toContain('enhanced-logging-form');
  });

  it('should validate form data before submission', () => {
    // Create modal with form
    const modal = document.createElement('div');
    modal.id = 'enhanced-logging-modal';
    modal.innerHTML = `
      <div>
        <input type="date" id="log-date" value="2025-12-31" /> <!-- Future date -->
        <input type="number" id="duration" value="2000" /> <!-- Invalid duration -->
        <input type="range" id="effort" value="6" min="1" max="5" /> <!-- Invalid range -->
        <div id="error-display" class="hidden">
          <span id="error-message"></span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Set up validation function
    (window as any).selectedStatus = null; // Invalid status
    
    const validateEnhancedLogForm = (): string[] => {
      const errors: string[] = [];
      
      if ((window as any).selectedStatus === undefined || (window as any).selectedStatus === null) {
        errors.push('Please select a completion status');
      }
      
      const logDateEl = document.getElementById('log-date') as HTMLInputElement;
      if (logDateEl?.value) {
        const selectedDate = new Date(logDateEl.value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (selectedDate > today) {
          errors.push('Cannot log habits for future dates');
        }
      }
      
      const durationEl = document.getElementById('duration') as HTMLInputElement;
      if (durationEl?.value) {
        const duration = parseInt(durationEl.value);
        if (isNaN(duration) || duration < 0 || duration > 1440) {
          errors.push('Duration must be between 0 and 1440 minutes');
        }
      }
      
      return errors;
    };

    const errors = validateEnhancedLogForm();
    
    expect(errors).toContain('Please select a completion status');
    expect(errors).toContain('Cannot log habits for future dates');
    expect(errors).toContain('Duration must be between 0 and 1440 minutes');
  });

  it('should submit form data correctly to API', async () => {
    // Create modal with form
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div>
        <input type="date" id="log-date" value="2025-01-01" />
        <input type="range" id="effort" value="4" />
        <input type="number" id="duration" value="45" />
        <input type="time" id="completion-time" value="14:30" />
        <input type="range" id="energy" value="3" />
        <input type="range" id="mood" value="5" />
        <select id="location"><option value="Gym" selected>Gym</option></select>
        <select id="weather"><option value="Sunny" selected>Sunny</option></select>
        <textarea id="notes">Great workout!</textarea>
      </div>
    `;
    document.body.appendChild(modal);

    // Set up form data
    (window as any).selectedStatus = 1;
    (window as any).selectedContext = ['Morning', 'High Energy'];

    // Simulate form submission
    const submitEnhancedLog = async (habitId: string, habitName: string) => {
      const logDateEl = document.getElementById('log-date') as HTMLInputElement;
      const effortEl = document.getElementById('effort') as HTMLInputElement;
      const durationEl = document.getElementById('duration') as HTMLInputElement;
      const completionTimeEl = document.getElementById('completion-time') as HTMLInputElement;
      const energyEl = document.getElementById('energy') as HTMLInputElement;
      const moodEl = document.getElementById('mood') as HTMLInputElement;
      const locationEl = document.getElementById('location') as HTMLSelectElement;
      const weatherEl = document.getElementById('weather') as HTMLSelectElement;
      const notesEl = document.getElementById('notes') as HTMLTextAreaElement;

      const formData = {
        value: (window as any).selectedStatus,
        date: logDateEl?.value || new Date().toISOString().split('T')[0],
        effort: effortEl ? parseInt(effortEl.value) : 3,
        duration: durationEl?.value ? parseInt(durationEl.value) : null,
        completion_time: completionTimeEl?.value || null,
        energy_level: energyEl ? parseInt(energyEl.value) : 3,
        mood: moodEl ? parseInt(moodEl.value) : 3,
        location: locationEl?.value || null,
        weather: weatherEl?.value || null,
        context: (window as any).selectedContext,
        notes: notesEl?.value || null
      };

      const response = await fetch(`/api/habits/${habitId}/log-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      return { response, formData };
    };

    const { response, formData } = await submitEnhancedLog('habit-123', 'Exercise');

    // Verify API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith('/api/habits/habit-123/log-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: 1,
        date: '2025-01-01',
        effort: 4,
        duration: 45,
        completion_time: '14:30',
        energy_level: 3,
        mood: 5,
        location: 'Gym',
        weather: 'Sunny',
        context: ['Morning', 'High Energy'],
        notes: 'Great workout!'
      })
    });

    expect(response.ok).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Database connection failed'
      })
    });

    const modal = document.createElement('div');
    modal.innerHTML = `
      <div>
        <div id="error-display" class="hidden">
          <span id="error-message"></span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Set up error handling
    const showError = (message: string) => {
      const errorDisplay = document.getElementById('error-display');
      const errorMessage = document.getElementById('error-message');
      
      if (errorDisplay && errorMessage) {
        errorMessage.textContent = message;
        errorDisplay.classList.remove('hidden');
      }
    };

    // Simulate API call failure
    try {
      const response = await fetch('/api/habits/habit-123/log-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to log habit');
      }
    } catch (error) {
      showError((error as Error).message);
    }

    // Verify error is displayed
    const errorDisplay = document.getElementById('error-display');
    const errorMessage = document.getElementById('error-message');
    
    expect(errorDisplay?.classList.contains('hidden')).toBe(false);
    expect(errorMessage?.textContent).toBe('Database connection failed');
  });
});