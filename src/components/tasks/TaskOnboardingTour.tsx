import React, { useState } from 'react';

const tourSteps = [
  {
    target: '.task-creation-modal', // CSS selector for the target element
    content: 'Create new tasks using this form. You can also use natural language!',
  },
  {
    target: '.unified-calendar-view',
    content: 'See all your tasks and events in one place.',
  },
  {
    target: '.analytics-dashboard',
    content: 'Track your productivity and progress over time.',
  },
  {
    target: '.mobile-task-view',
    content: 'Manage your tasks on the go with our mobile-friendly view.',
  },
];

export const TaskOnboardingTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsActive(false);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
  };

  if (!isActive) {
    return null;
  }

  const { target, content } = tourSteps[currentStep];

  return (
    <div className="onboarding-tour-overlay">
      <div className="onboarding-tour-step" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <p>{content}</p>
        <div className="tour-navigation">
          <button onClick={handleNext}>
            {currentStep < tourSteps.length - 1 ? 'Next' : 'Finish'}
          </button>
          <button onClick={handleSkip} className="skip-button">Skip</button>
        </div>
      </div>
    </div>
  );
};
