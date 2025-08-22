import React, { useState } from 'react';
import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth';

export const EmailLoginComponent: React.FC = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  
  const { ready, authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail({
    onSendCodeSuccess: () => {
      console.log('✅ Code sent successfully');
      setStep('code');
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('❌ Email login error:', error);
      setIsLoading(false);
    }
  });

  const handleSendCode = async () => {
    if (!email || isLoading) return;
    
    setIsLoading(true);
    try {
      await sendCode({ email });
    } catch (error) {
      console.error('Failed to send code:', error);
      setIsLoading(false);
    }
  };

  const handleLoginWithCode = async () => {
    if (!code || isLoading) return;
    
    setIsLoading(true);
    try {
      await loginWithCode({ code });
    } catch (error) {
      console.error('Failed to login with code:', error);
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setCode('');
    setStep('email');
    setIsLoading(false);
  };

  if (!ready) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  if (authenticated && user) {
    const emailAccount = user.linkedAccounts?.find(account => account.type === 'email');
    
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">✅ Welcome to meshOS!</h3>
          <p className="text-gray-300 mb-4">
            {emailAccount?.address || 'User authenticated'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
            <button
              onClick={logout}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Sign in to meshOS</h3>
        <p className="text-gray-300 text-sm">
          Enter your email to get started
        </p>
      </div>

      {step === 'email' ? (
        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendCode}
            disabled={!email || isLoading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Sending code...
              </>
            ) : (
              'Send verification code'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">
              Verification code sent to {email}
            </p>
            <input
              type="text"
              placeholder="Enter verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginWithCode()}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <button
            onClick={handleLoginWithCode}
            disabled={!code || isLoading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Verifying...
              </>
            ) : (
              'Verify and Sign In'
            )}
          </button>
          <button
            onClick={resetForm}
            className="w-full text-gray-400 hover:text-white transition-colors py-2"
            disabled={isLoading}
          >
            ← Back to email
          </button>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400 text-center">
        <p>• Secure email verification</p>
        <p>• No password required</p>
        <p>• Quick one-time code access</p>
      </div>
    </div>
  );
};

export default EmailLoginComponent;