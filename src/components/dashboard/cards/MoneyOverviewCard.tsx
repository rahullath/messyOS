// src/components/dashboard/cards/MoneyOverviewCard.tsx - Financial Overview
import React, { useState, useEffect } from 'react';

export default function MoneyOverviewCard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 900);
  }, []);

  if (isLoading) {
    return (
      <div className="messy-card h-40">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-messy-border rounded"></div>
            <div className="h-16 bg-messy-border rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messy-card h-40">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">💰</span>
        <h3 className="text-messy-primary font-medium">Money Overview</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-messy-warning">₹2,340</div>
          <div className="text-messy-muted text-sm">Today's spending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-messy-success">₹18,500</div>
          <div className="text-messy-muted text-sm">Monthly remaining</div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="text-messy-secondary text-sm">
          🔥 12% below average this week
        </div>
      </div>
    </div>
  );
}