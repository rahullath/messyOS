// src/components/dashboard/cards/ContentQueueCard.tsx - Content Queue
import React, { useState, useEffect } from 'react';

export default function ContentQueueCard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="messy-card h-40">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="flex space-x-3">
            <div className="w-16 h-24 bg-messy-border rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-messy-border rounded"></div>
              <div className="h-3 bg-messy-border rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messy-card h-40">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">🎬</span>
        <h3 className="text-messy-primary font-medium">Content Queue</h3>
      </div>
      
      <div className="flex space-x-4">
        <div className="w-16 h-24 bg-messy-border rounded-lg flex items-center justify-center">
          <span className="text-2xl">📺</span>
        </div>
        <div className="flex-1">
          <div className="text-messy-primary font-medium">The Bear</div>
          <div className="text-messy-secondary text-sm">S3 E2 • Drama</div>
          <div className="text-messy-muted text-xs mt-1">
            Continue watching • 23min left
          </div>
          <div className="w-full bg-messy-border rounded-full h-1 mt-2">
            <div className="bg-messy-primary h-1 rounded-full" style={{width: '65%'}}></div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-messy-secondary text-xs">5-day streak 🔥</div>
        <button className="messy-btn-ghost text-xs py-1 px-2">
          View Queue
        </button>
      </div>
    </div>
  );
}