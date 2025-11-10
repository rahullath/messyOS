// src/components/demo/UXDemo.tsx - UX Polish demonstration component
import React, { useState } from 'react';
import { EnhancedLayout } from '../layout/EnhancedLayout';
import { LoadingState, LoadingButton, PageTransition } from '../ui/LoadingStates';
import { SuccessAnimation, Toast, FeedbackButton, ProgressIndicator } from '../ui/SuccessAnimations';
import { UXOptimizer } from '../ux/UXOptimizer';
import { analytics } from '../../lib/analytics/tracking';

export function UXDemo() {
  const [currentDemo, setCurrentDemo] = useState<'loading' | 'animations' | 'feedback' | 'optimization'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [progress, setProgress] = useState(0);

  const demoSections = [
    { id: 'loading', title: 'Loading States', icon: '⏳' },
    { id: 'animations', title: 'Success Animations', icon: '✨' },
    { id: 'feedback', title: 'User Feedback', icon: '💬' },
    { id: 'optimization', title: 'UX Optimization', icon: '🚀' }
  ] as const;

  const handleLoadingDemo = () => {
    setIsLoading(true);
    analytics.trackEngagement('demo_interaction', 'loading_demo');
    
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 2000);
  };

  const handleProgressDemo = () => {
    setProgress(0);
    analytics.trackEngagement('demo_interaction', 'progress_demo');
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleToastDemo = () => {
    setShowToast(true);
    analytics.trackEngagement('demo_interaction', 'toast_demo');
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <EnhancedLayout pageName="ux-demo" showPerformanceMonitor={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-white">UX Polish Demonstration</h1>
            <p className="text-gray-400 mt-1">Interactive showcase of enhanced user experience features</p>
          </div>
        </header>

        {/* Navigation */}
        <nav className="border-b border-slate-700 bg-slate-800/30">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex space-x-1 py-2">
              {demoSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setCurrentDemo(section.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentDemo === section.id
                      ? 'bg-cyan-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <PageTransition isLoading={false} pageName={`ux-demo-${currentDemo}`}>
            
            {/* Loading States Demo */}
            {currentDemo === 'loading' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Loading States & Transitions</h2>
                  <p className="text-gray-400 mb-6">Various loading indicators and smooth transitions for better user experience.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Spinner */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Spinner</h3>
                    <LoadingState type="spinner" size="lg" />
                  </div>

                  {/* Skeleton */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Skeleton</h3>
                    <LoadingState type="skeleton" />
                  </div>

                  {/* Dots */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Dots</h3>
                    <LoadingState type="dots" />
                  </div>

                  {/* Progress */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Progress</h3>
                    <LoadingState type="progress" progress={progress} />
                    <button
                      onClick={handleProgressDemo}
                      className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm py-2 rounded transition-colors"
                    >
                      Start Progress
                    </button>
                  </div>
                </div>

                {/* Interactive Loading Demo */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Interactive Loading Demo</h3>
                  <div className="flex items-center space-x-4">
                    <LoadingButton
                      isLoading={isLoading}
                      onClick={handleLoadingDemo}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg"
                    >
                      {isLoading ? 'Processing...' : 'Start Loading Demo'}
                    </LoadingButton>
                    
                    {showSuccess && (
                      <SuccessAnimation 
                        type="checkmark" 
                        message="Demo completed successfully!" 
                        size="md"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Animations Demo */}
            {currentDemo === 'animations' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Success Animations & Feedback</h2>
                  <p className="text-gray-400 mb-6">Delightful animations and visual feedback for user actions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Animation Types */}
                  {['checkmark', 'confetti', 'pulse', 'slide', 'bounce'].map(type => (
                    <div key={type} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                      <h3 className="text-sm font-medium text-white mb-4 capitalize">{type}</h3>
                      <div className="flex justify-center mb-4">
                        <SuccessAnimation 
                          type={type as any} 
                          message={`${type} animation!`}
                          size="md"
                          duration={3000}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Indicator */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Progress Indicator</h3>
                  <ProgressIndicator
                    steps={['Start', 'Processing', 'Validation', 'Complete']}
                    currentStep={2}
                    completedSteps={[0, 1]}
                    className="max-w-md"
                  />
                </div>
              </div>
            )}

            {/* User Feedback Demo */}
            {currentDemo === 'feedback' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">User Feedback & Interactions</h2>
                  <p className="text-gray-400 mb-6">Interactive feedback systems and micro-interactions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Feedback Buttons */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Feedback Buttons</h3>
                    <div className="space-y-4">
                      <FeedbackButton
                        feedbackMessage="Success! ✓"
                        feedbackType="success"
                        variant="primary"
                        className="w-full"
                      >
                        Success Action
                      </FeedbackButton>
                      
                      <FeedbackButton
                        feedbackMessage="Error occurred ✗"
                        feedbackType="error"
                        variant="secondary"
                        className="w-full"
                      >
                        Error Action
                      </FeedbackButton>
                      
                      <FeedbackButton
                        feedbackMessage="Info message ℹ"
                        feedbackType="info"
                        variant="ghost"
                        className="w-full"
                      >
                        Info Action
                      </FeedbackButton>
                    </div>
                  </div>

                  {/* Toast Notifications */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Toast Notifications</h3>
                    <div className="space-y-4">
                      <button
                        onClick={handleToastDemo}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                      >
                        Show Toast Notification
                      </button>
                      
                      <p className="text-sm text-gray-400">
                        Click to see a toast notification appear in the top-right corner.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Toast Component */}
                {showToast && (
                  <Toast
                    type="success"
                    message="This is a demo toast notification! 🎉"
                    duration={4000}
                    onClose={() => setShowToast(false)}
                    position="top-right"
                  />
                )}
              </div>
            )}

            {/* UX Optimization Demo */}
            {currentDemo === 'optimization' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">UX Optimization & Performance</h2>
                  <p className="text-gray-400 mb-6">Automatic optimizations based on device capabilities and user preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Device Detection */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Device Capabilities</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">CPU Cores:</span>
                        <span className="text-cyan-400">{navigator.hardwareConcurrency || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Memory:</span>
                        <span className="text-cyan-400">{(navigator as any).deviceMemory || 'Unknown'} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Connection:</span>
                        <span className="text-cyan-400">{(navigator as any).connection?.effectiveType || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accessibility Features */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Accessibility Features</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Reduced Motion:</span>
                        <span className="text-cyan-400">
                          {typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">High Contrast:</span>
                        <span className="text-cyan-400">
                          {typeof window !== 'undefined' && window.matchMedia?.('(prefers-contrast: high)').matches ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Dark Mode:</span>
                        <span className="text-cyan-400">
                          {typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Performance Monitoring</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Real-time performance monitoring and optimization recommendations are active.
                    Check the performance monitor in the bottom-right corner for detailed metrics.
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-400">Performance Monitor Active</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-blue-400">Analytics Tracking Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </PageTransition>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-700 bg-slate-800/30 mt-16">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-white mb-2">UX Polish Implementation Complete</h3>
              <p className="text-gray-400 text-sm">
                All UX enhancement features are now integrated and working together to provide a seamless user experience.
              </p>
              <div className="flex justify-center space-x-6 mt-4 text-sm text-gray-500">
                <span>✓ Loading States & Transitions</span>
                <span>✓ Success Animations & Feedback</span>
                <span>✓ Performance Optimization</span>
                <span>✓ Analytics Tracking</span>
              </div>
            </div>
          </div>
        </footer>

        {/* UX Optimizer (always active) */}
        <UXOptimizer />
      </div>
    </EnhancedLayout>
  );
}