// src/components/landing/LandingPage.tsx - Enhanced landing page with Web3-inspired design
import React, { useState } from 'react';
import { WaitlistForm } from './WaitlistForm';
import type { WaitlistResponse } from '../../lib/waitlist/service';

interface LandingPageProps {
  onWaitlistSuccess?: (response: WaitlistResponse) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onWaitlistSuccess }) => {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleWaitlistSuccess = (response: WaitlistResponse) => {
    setNotification({
      type: 'success',
      message: response.message
    });
    
    // Auto-redirect to sign-in after 3 seconds
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
    
    onWaitlistSuccess?.(response);
  };

  const handleWaitlistError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    });
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative touch-manipulation">
      {/* Background Animation */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-blue-900/20"></div>
        <div className="absolute top-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border max-w-md ${
          notification.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <p className="text-sm">{notification.message}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative z-10 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl sm:text-2xl font-bold text-white">
            <span className="text-cyan-400">messy</span>OS
          </div>
          <div className="hidden sm:flex space-x-4">
            <a href="#features" className="text-gray-300 hover:text-white active:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/30 focus:outline-none focus:ring-2 focus:ring-cyan-500">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white active:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/30 focus:outline-none focus:ring-2 focus:ring-cyan-500">Pricing</a>
            <a href="/login" className="bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900">
              Sign In
            </a>
          </div>
          <div className="sm:hidden">
            <a href="/login" className="bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px] flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900">
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Stop managing your life.<br className="hidden sm:block"/>
            <span className="sm:hidden"> </span>
            <span className="text-cyan-400">Start optimizing it.</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
            The AI-powered everything app that learns from your data, understands your patterns, 
            and helps you optimize every aspect of your life - automatically.
          </p>
          
          {/* Waitlist Form */}
          <div className="max-w-md mx-auto mb-8">
            <WaitlistForm 
              onSuccess={handleWaitlistSuccess}
              onError={handleWaitlistError}
            />
          </div>

          <div className="text-gray-400">
            <p>✨ 100% customizable • 🔒 Your data, encrypted • 🤖 AI that actually understands you</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            One app. <span className="text-cyan-400">Infinite possibilities.</span>
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Smart Data Input */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-cyan-400 text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-white mb-3">Smart Data Dumping</h3>
              <p className="text-gray-300">
                Just talk naturally: "Spent $50 on groceries, worked out 45 mins, need to apply for visa" 
                - our AI structures everything automatically.
              </p>
            </div>

            {/* Customizable Modules */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-cyan-400 text-3xl mb-4">🎛️</div>
              <h3 className="text-xl font-semibold text-white mb-3">100% Customizable</h3>
              <p className="text-gray-300">
                Choose your modules, themes, and features. Your dashboard shows only what matters to you. 
                No bloatware, ever.
              </p>
            </div>

            {/* AI Agent */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-cyan-400 text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-white mb-3">Personal AI Coach</h3>
              <p className="text-gray-300">
                Your AI knows your patterns, suggests optimizations, and helps you achieve goals with 
                personalized strategies that actually work.
              </p>
            </div>

            {/* Integrations */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-cyan-400 text-3xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold text-white mb-3">Universal Integrations</h3>
              <p className="text-gray-300">
                Connect Gmail, GitHub, Notion, banking, fitness apps, shopping platforms - 
                everything in one intelligent dashboard.
              </p>
            </div>

            {/* Security */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-cyan-400 text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-white mb-3">Bank-Grade Security</h3>
              <p className="text-gray-300">
                End-to-end encryption, zero-knowledge architecture. Your data stays yours. 
                We can't see it, nobody can.
              </p>
            </div>

            {/* Cross-Domain Insights */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="text-cyan-400 text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-3">Cross-Domain Intelligence</h3>
              <p className="text-gray-300">
                Discover hidden connections: how sleep affects productivity, spending patterns during stress, 
                and optimization opportunities you never knew existed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-12">
            Perfect for <span className="text-cyan-400">ambitious people</span> who want more
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">📈 For Growth-Minded Individuals</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Track habits that actually matter to your goals</li>
                <li>• Optimize your health and energy levels</li>
                <li>• Make better financial decisions with data</li>
                <li>• Build systems that compound over time</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">🚀 For High Performers</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Manage complex projects and deadlines</li>
                <li>• Integrate all your productivity tools</li>
                <li>• Get AI-powered optimization suggestions</li>
                <li>• Focus on what moves the needle</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 px-6 py-20 bg-black/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Simple, honest pricing
          </h2>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">$1</div>
              <div className="text-gray-300 mb-6">per month</div>
              
              <div className="space-y-3 text-left mb-8">
                <div className="flex items-center text-gray-300">
                  <span className="text-green-400 mr-3">✓</span>
                  Unlimited data and AI analysis
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="text-green-400 mr-3">✓</span>
                  All integrations and modules
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="text-green-400 mr-3">✓</span>
                  Personal AI coach
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="text-green-400 mr-3">✓</span>
                  Bank-grade security
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="text-green-400 mr-3">✓</span>
                  30-day free trial
                </div>
              </div>
              
              <button 
                onClick={() => document.querySelector('.waitlist-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Start Free Trial
              </button>
              
              <p className="text-sm text-gray-400 mt-4">
                No credit card required • Cancel anytime • UPI autopay
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to optimize your life?
          </h2>
          <p className="text-gray-300 mb-8">
            Join the waitlist and be among the first to experience the future of personal optimization.
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Get Early Access
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center text-gray-400">
          <p>&copy; 2024 messyOS. Built for people who want to optimize everything.</p>
          <div className="mt-4 space-x-6">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hey@messyos.com" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};