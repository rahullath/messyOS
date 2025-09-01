// src/components/ui/TouchOptimized.tsx - Touch-optimized UI components
import React, { useState, useRef, useEffect } from 'react';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  haptic?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

export function TouchButton({ 
  variant = 'primary', 
  size = 'md', 
  haptic = 'light',
  className = '', 
  children, 
  onTouchStart,
  onTouchEnd,
  onClick,
  ...props 
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const baseClasses = 'font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation select-none';
  
  const variantClasses = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800 focus:ring-cyan-500',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 active:bg-slate-800 focus:ring-slate-500',
    ghost: 'text-gray-400 hover:text-white hover:bg-slate-700/50 active:bg-slate-700/70 focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px] min-w-[40px]',
    md: 'px-4 py-3 text-base min-h-[44px] min-w-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[48px] min-w-[48px]'
  };

  const hapticClasses = {
    light: 'haptic-light',
    medium: 'haptic-medium',
    heavy: 'haptic-medium' // Using medium for heavy as well
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    
    // Trigger haptic feedback if available
    if ('vibrate' in navigator && !props.disabled) {
      const vibrationPattern = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(vibrationPattern[haptic]);
    }
    
    onTouchStart?.(e);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    setIsPressed(false);
    onTouchEnd?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Add visual feedback for non-touch devices
    if (!('ontouchstart' in window)) {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);
    }
    
    onClick?.(e);
  };

  const pressedStyle = isPressed ? { transform: 'scale(0.98)' } : {};

  return (
    <button
      ref={buttonRef}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${hapticClasses[haptic]} ${className}`}
      style={pressedStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function TouchInput({ 
  label, 
  error, 
  helpText, 
  className = '', 
  ...props 
}: TouchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors text-base min-h-[44px] touch-manipulation ${
          error ? 'border-red-500' : 'border-slate-600'
        } ${isFocused ? 'ring-2 ring-cyan-500' : ''} ${className}`}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className = '' 
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    setCurrentX(e.touches[0].clientX);
    const diff = e.touches[0].clientX - startX;
    
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px)`;
      cardRef.current.style.opacity = `${1 - Math.abs(diff) / 300}`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = currentX - startX;
    const threshold = 100;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // Reset position
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateX(0)';
      cardRef.current.style.opacity = '1';
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  return (
    <div
      ref={cardRef}
      className={`transition-transform duration-300 ease-out touch-manipulation ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className = '' 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0) {
      setPullDistance(Math.min(diff, 100));
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setStartY(0);
  };

  return (
    <div
      ref={containerRef}
      className={`pull-to-refresh ${isRefreshing ? 'refreshing' : ''} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullDistance * 0.5}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none'
      }}
    >
      {pullDistance > 0 && (
        <div 
          className="text-center py-2 text-sm text-gray-400"
          style={{ opacity: pullDistance / 60 }}
        >
          {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}
      {children}
    </div>
  );
}

// Hook for detecting touch device
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  return isTouchDevice;
}

// Hook for viewport height with mobile keyboard handling
export function useViewportHeight(): number {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      setViewportHeight(window.innerHeight);
      // Update CSS custom property for mobile browsers
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return viewportHeight;
}