// src/components/habits/accessibility/AccessibilityEnhancements.tsx
import React, { useEffect, useRef } from 'react';

// Keyboard navigation hook
export const useKeyboardNavigation = () => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Global keyboard shortcuts for habits
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'n':
                        event.preventDefault();
                        // Open new habit modal
                        const addButton = document.getElementById('add-habit-btn');
                        addButton?.click();
                        break;
                    case 'i':
                        event.preventDefault();
                        // Open import modal
                        const importButton = document.getElementById('import-btn');
                        importButton?.click();
                        break;
                    case '/':
                        event.preventDefault();
                        // Focus search if it exists
                        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                        searchInput?.focus();
                        break;
                }
            }

            // Arrow key navigation for habit cards
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                const focusedElement = document.activeElement;
                const habitCards = Array.from(document.querySelectorAll('[data-habit-id]'));
                const currentIndex = habitCards.indexOf(focusedElement as Element);

                if (currentIndex !== -1) {
                    event.preventDefault();
                    let nextIndex = currentIndex;

                    switch (event.key) {
                        case 'ArrowUp':
                            nextIndex = Math.max(0, currentIndex - 3); // Assuming 3 columns
                            break;
                        case 'ArrowDown':
                            nextIndex = Math.min(habitCards.length - 1, currentIndex + 3);
                            break;
                        case 'ArrowLeft':
                            nextIndex = Math.max(0, currentIndex - 1);
                            break;
                        case 'ArrowRight':
                            nextIndex = Math.min(habitCards.length - 1, currentIndex + 1);
                            break;
                    }

                    (habitCards[nextIndex] as HTMLElement)?.focus();
                }
            }

            // Enter/Space to activate focused habit
            if (event.key === 'Enter' || event.key === ' ') {
                const focusedElement = document.activeElement;
                if (focusedElement?.hasAttribute('data-habit-id')) {
                    event.preventDefault();
                    const habitId = focusedElement.getAttribute('data-habit-id');
                    const habitName = focusedElement.querySelector('h3, h4, .habit-name')?.textContent || 'Habit';
                    if (habitId && window.logHabit) {
                        window.logHabit(habitId, habitName);
                    }
                }
            }

            // Escape to close modals
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('.modal, [role="dialog"]');
                modals.forEach(modal => {
                    if (!modal.classList.contains('hidden')) {
                        const closeButton = modal.querySelector('[data-close], .close-btn, button[aria-label*="close"]');
                        (closeButton as HTMLElement)?.click();
                    }
                });
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
};

// Screen reader announcements
export const ScreenReaderAnnouncer: React.FC = () => {
    const announcerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Make announcer available globally
        window.announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
            if (announcerRef.current) {
                announcerRef.current.setAttribute('aria-live', priority);
                announcerRef.current.textContent = message;

                // Clear after announcement
                setTimeout(() => {
                    if (announcerRef.current) {
                        announcerRef.current.textContent = '';
                    }
                }, 1000);
            }
        };

        return () => {
            delete window.announceToScreenReader;
        };
    }, []);

    return (
        <div
            ref={announcerRef}
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            role="status"
        />
    );
};

// Focus management for modals
export const useFocusTrap = (isOpen: boolean, containerRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        // Focus first element when modal opens
        firstElement?.focus();

        document.addEventListener('keydown', handleTabKey);
        return () => document.removeEventListener('keydown', handleTabKey);
    }, [isOpen, containerRef]);
};

// High contrast mode detection
export const useHighContrastMode = () => {
    const [isHighContrast, setIsHighContrast] = React.useState(false);

    useEffect(() => {
        const checkHighContrast = () => {
            // Check for Windows high contrast mode
            const isWindowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

            // Check for forced colors (Windows high contrast)
            const isForcedColors = window.matchMedia('(forced-colors: active)').matches;

            setIsHighContrast(isWindowsHighContrast || isForcedColors);
        };

        checkHighContrast();

        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        const forcedColorsQuery = window.matchMedia('(forced-colors: active)');

        mediaQuery.addEventListener('change', checkHighContrast);
        forcedColorsQuery.addEventListener('change', checkHighContrast);

        return () => {
            mediaQuery.removeEventListener('change', checkHighContrast);
            forcedColorsQuery.removeEventListener('change', checkHighContrast);
        };
    }, []);

    return isHighContrast;
};

// Accessible habit card component
export const AccessibleHabitCard: React.FC<{
    habit: any;
    onComplete: (habitId: string, habitName: string) => void;
    children: React.ReactNode;
}> = ({ habit, onComplete, children }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!habit.completedToday) {
                onComplete(habit.id, habit.name);
            }
        }
    };

    const getAriaLabel = () => {
        const status = habit.completedToday ? 'completed' : 'not completed';
        const streak = habit.realCurrentStreak || 0;
        return `${habit.name}, ${status} today, ${streak} day streak, ${habit.category} habit`;
    };

    return (
        <div
            ref={cardRef}
            data-habit-id={habit.id}
            role="button"
            tabIndex={0}
            aria-label={getAriaLabel()}
            aria-describedby={`habit-${habit.id}-details`}
            onKeyDown={handleKeyDown}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
            {children}
            <div id={`habit-${habit.id}-details`} className="sr-only">
                {habit.description && `Description: ${habit.description}. `}
                Weekly progress: {habit.weekStreak} out of 7 days completed.
                {habit.allows_skips ? ' This habit allows skips.' : ' This is a strict habit.'}
                {habit.completedToday
                    ? ' Already completed today.'
                    : ' Press Enter or Space to mark as complete.'
                }
            </div>
        </div>
    );
};

// Skip link component
export const SkipLink: React.FC<{ href: string; children: React.ReactNode }> = ({
    href,
    children
}) => {
    return (
        <a
            href={href}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {children}
        </a>
    );
};

// Accessible progress indicator
export const AccessibleProgress: React.FC<{
    value: number;
    max: number;
    label: string;
    className?: string;
}> = ({ value, max, label, className = '' }) => {
    const percentage = Math.round((value / max) * 100);

    return (
        <div className={className}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-gray-500">{percentage}%</span>
            </div>
            <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={`${label}: ${value} out of ${max}, ${percentage} percent complete`}
                className="w-full bg-gray-200 rounded-full h-2"
            >
                <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// Accessible button with loading state
export const AccessibleButton: React.FC<{
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    children: React.ReactNode;
    className?: string;
    ariaLabel?: string;
    type?: 'button' | 'submit' | 'reset';
}> = ({
    onClick,
    disabled = false,
    loading = false,
    children,
    className = '',
    ariaLabel,
    type = 'button'
}) => {
        return (
            <button
                type={type}
                onClick={onClick}
                disabled={disabled || loading}
                aria-label={ariaLabel}
                aria-busy={loading}
                className={`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                {loading && (
                    <span className="sr-only">Loading...</span>
                )}
                {children}
            </button>
        );
    };

// Accessible form field
export const AccessibleFormField: React.FC<{
    id: string;
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    description?: string;
}> = ({ id, label, error, required = false, children, description }) => {
    return (
        <div className="space-y-1">
            <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-700"
            >
                {label}
                {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </label>

            {description && (
                <p id={`${id}-description`} className="text-sm text-gray-500">
                    {description}
                </p>
            )}

            <div>
                {React.cloneElement(children as React.ReactElement, {
                    id,
                    'aria-describedby': [
                        description ? `${id}-description` : '',
                        error ? `${id}-error` : ''
                    ].filter(Boolean).join(' ') || undefined,
                    'aria-invalid': error ? 'true' : undefined,
                    'aria-required': required
                })}
            </div>

            {error && (
                <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

// Accessible modal wrapper
export const AccessibleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}> = ({ isOpen, onClose, title, children, className = '' }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useFocusTrap(isOpen, modalRef);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Announce modal opening
            window.announceToScreenReader?.(`${title} dialog opened`, 'assertive');
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, title]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 ${className}`}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 id="modal-title" className="text-lg font-semibold">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Global accessibility enhancements
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useKeyboardNavigation();
    const isHighContrast = useHighContrastMode();

    useEffect(() => {
        // Add high contrast class to body
        if (isHighContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }, [isHighContrast]);

    return (
        <>
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <ScreenReaderAnnouncer />
            {children}
        </>
    );
};

// Declare global functions for TypeScript
declare global {
    interface Window {
        announceToScreenReader?: (message: string, priority?: 'polite' | 'assertive') => void;
        logHabit?: (habitId: string, habitName: string) => void;
    }
}