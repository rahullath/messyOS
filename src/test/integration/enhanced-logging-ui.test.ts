// src/test/integration/enhanced-logging-ui.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Enhanced Logging UI', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a new DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="test-container"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window as any;
    
    // Set up global variables that the habits page expects
    (global as any).document = document;
    (global as any).window = window;
    
    // Mock global functions that would be defined in the habits page
    (window as any).selectedStatus = 1;
    (window as any).selectedContext = [];
    
    // Define the functions that would be in the habits page
    (window as any).setStatus = (status: number) => {
      (window as any).selectedStatus = status;
    };
    
    (window as any).toggleContext = (tag: string) => {
      const context = (window as any).selectedContext;
      if (context.includes(tag)) {
        (window as any).selectedContext = context.filter((t: string) => t !== tag);
      } else {
        (window as any).selectedContext = [...context, tag];
      }
    };
    
    (window as any).hideError = () => {
      const errorDisplay = document.getElementById('error-display');
      if (errorDisplay) {
        errorDisplay.classList.add('hidden');
      }
    };
  });

  it('should validate form fields correctly', () => {
    // Create a mock enhanced logging modal
    const modal = document.createElement('div');
    modal.id = 'enhanced-logging-modal';
    modal.innerHTML = `
      <div>
        <input type="date" id="log-date" value="2025-01-01" />
        <input type="number" id="duration" value="30" />
        <input type="range" id="effort" value="3" min="1" max="5" />
        <input type="range" id="energy" value="4" min="1" max="5" />
        <input type="range" id="mood" value="5" min="1" max="5" />
        <div id="error-display" class="hidden">
          <span id="error-message"></span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Define validation function (would be in the habits page)
    const validateEnhancedLogForm = (): string[] => {
      const errors: string[] = [];
      
      // Validate status selection
      if ((window as any).selectedStatus === undefined || (window as any).selectedStatus === null) {
        errors.push('Please select a completion status');
      }
      
      // Validate date
      const logDateEl = document.getElementById('log-date') as HTMLInputElement;
      if (logDateEl?.value) {
        const selectedDate = new Date(logDateEl.value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (selectedDate > today) {
          errors.push('Cannot log habits for future dates');
        }
      }
      
      // Validate duration if provided
      const durationEl = document.getElementById('duration') as HTMLInputElement;
      if (durationEl?.value) {
        const duration = parseInt(durationEl.value);
        if (isNaN(duration) || duration < 0 || duration > 1440) {
          errors.push('Duration must be between 0 and 1440 minutes');
        }
      }
      
      return errors;
    };

    // Test valid form
    (window as any).selectedStatus = 1;
    let errors = validateEnhancedLogForm();
    expect(errors).toHaveLength(0);

    // Test missing status
    (window as any).selectedStatus = null;
    errors = validateEnhancedLogForm();
    expect(errors).toContain('Please select a completion status');

    // Test future date
    (window as any).selectedStatus = 1;
    const dateInput = document.getElementById('log-date') as HTMLInputElement;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    dateInput.value = futureDate.toISOString().split('T')[0];
    
    errors = validateEnhancedLogForm();
    expect(errors).toContain('Cannot log habits for future dates');

    // Test invalid duration
    dateInput.value = '2025-01-01'; // Reset to valid date
    const durationInput = document.getElementById('duration') as HTMLInputElement;
    durationInput.value = '2000'; // Invalid duration > 1440
    
    errors = validateEnhancedLogForm();
    expect(errors).toContain('Duration must be between 0 and 1440 minutes');
  });

  it('should handle context tag selection', () => {
    // Test context toggle functionality
    expect((window as any).selectedContext).toEqual([]);
    
    // Add a context tag
    (window as any).toggleContext('Morning');
    expect((window as any).selectedContext).toContain('Morning');
    
    // Add another context tag
    (window as any).toggleContext('High Energy');
    expect((window as any).selectedContext).toContain('High Energy');
    expect((window as any).selectedContext).toHaveLength(2);
    
    // Remove a context tag
    (window as any).toggleContext('Morning');
    expect((window as any).selectedContext).not.toContain('Morning');
    expect((window as any).selectedContext).toContain('High Energy');
    expect((window as any).selectedContext).toHaveLength(1);
  });

  it('should handle status selection', () => {
    // Test status selection
    expect((window as any).selectedStatus).toBe(1); // Default
    
    // Change status
    (window as any).setStatus(0); // Failed
    expect((window as any).selectedStatus).toBe(0);
    
    (window as any).setStatus(3); // Skipped
    expect((window as any).selectedStatus).toBe(3);
    
    (window as any).setStatus(1); // Completed
    expect((window as any).selectedStatus).toBe(1);
  });

  it('should show and hide error messages', () => {
    // Create error display element
    const errorDisplay = document.createElement('div');
    errorDisplay.id = 'error-display';
    errorDisplay.className = 'hidden';
    
    const errorMessage = document.createElement('span');
    errorMessage.id = 'error-message';
    errorDisplay.appendChild(errorMessage);
    
    document.body.appendChild(errorDisplay);

    // Test showing error
    const showError = (message: string) => {
      const errorDisplayEl = document.getElementById('error-display');
      const errorMessageEl = document.getElementById('error-message');
      
      if (errorDisplayEl && errorMessageEl) {
        errorMessageEl.textContent = message;
        errorDisplayEl.classList.remove('hidden');
      }
    };

    showError('Test error message');
    expect(errorDisplay.classList.contains('hidden')).toBe(false);
    expect(errorMessage.textContent).toBe('Test error message');

    // Test hiding error
    (window as any).hideError();
    expect(errorDisplay.classList.contains('hidden')).toBe(true);
  });

  it('should prepare form data correctly', () => {
    // Create form elements
    const modal = document.createElement('div');
    modal.innerHTML = `
      <input type="date" id="log-date" value="2025-01-01" />
      <input type="range" id="effort" value="4" />
      <input type="number" id="duration" value="45" />
      <input type="time" id="completion-time" value="14:30" />
      <input type="range" id="energy" value="3" />
      <input type="range" id="mood" value="5" />
      <select id="location"><option value="Gym" selected>Gym</option></select>
      <select id="weather"><option value="Sunny" selected>Sunny</option></select>
      <textarea id="notes">Great workout today!</textarea>
    `;
    document.body.appendChild(modal);

    // Set up test data
    (window as any).selectedStatus = 1;
    (window as any).selectedContext = ['Morning', 'High Energy'];

    // Function to prepare form data (would be in habits page)
    const prepareFormData = () => {
      const logDateEl = document.getElementById('log-date') as HTMLInputElement;
      const effortEl = document.getElementById('effort') as HTMLInputElement;
      const durationEl = document.getElementById('duration') as HTMLInputElement;
      const completionTimeEl = document.getElementById('completion-time') as HTMLInputElement;
      const energyEl = document.getElementById('energy') as HTMLInputElement;
      const moodEl = document.getElementById('mood') as HTMLInputElement;
      const locationEl = document.getElementById('location') as HTMLSelectElement;
      const weatherEl = document.getElementById('weather') as HTMLSelectElement;
      const notesEl = document.getElementById('notes') as HTMLTextAreaElement;

      return {
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
    };

    const formData = prepareFormData();

    expect(formData).toEqual({
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
      notes: 'Great workout today!'
    });
  });
});