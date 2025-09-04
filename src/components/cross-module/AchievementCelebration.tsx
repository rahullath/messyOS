// Achievement celebration component with animations
import React, { useState, useEffect } from 'react';
// Using CSS animations instead of framer-motion for better build compatibility
import confetti from 'canvas-confetti';
import type { UserAchievement } from '../../types/cross-module';

interface AchievementCelebrationProps {
  onClose: () => void;
  authToken: string;
}

export const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  onClose,
  authToken
}) => {
  const [newAchievements, setNewAchievements] = useState<UserAchievement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNewAchievements();
  }, []);

  useEffect(() => {
    if (newAchievements.length > 0) {
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Auto-advance through achievements
      const timer = setTimeout(() => {
        if (currentIndex < newAchievements.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Mark all as celebrated and close
          markAchievementsAsCelebrated();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, newAchievements]);

  const loadNewAchievements = async () => {
    try {
      const response = await fetch('/api/cross-module/achievements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'check' })
      });

      if (response.ok) {
        const data = await response.json();
        setNewAchievements(data.new_achievements || []);
      }
    } catch (error) {
      console.error('Failed to load new achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAchievementsAsCelebrated = async () => {
    try {
      for (const achievement of newAchievements) {
        await fetch('/api/cross-module/achievements', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'celebrate',
            achievement_id: achievement.achievement_id
          })
        });
      }
    } catch (error) {
      console.error('Failed to mark achievements as celebrated:', error);
    } finally {
      onClose();
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-green-500 to-emerald-500';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'shadow-yellow-500/50';
      case 'epic': return 'shadow-purple-500/50';
      case 'rare': return 'shadow-blue-500/50';
      default: return 'shadow-green-500/50';
    }
  };

  if (loading) {
    return null;
  }

  if (newAchievements.length === 0) {
    onClose();
    return null;
  }

  const currentAchievement = newAchievements[currentIndex];
  const achievement = currentAchievement.achievement;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Achievement Icon */}
        <div
          className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r ${getRarityColor(achievement?.rarity || 'common')} flex items-center justify-center text-4xl shadow-2xl ${getRarityGlow(achievement?.rarity || 'common')}`}
        >
          {achievement?.icon || '🏆'}
        </div>

        {/* Achievement Details */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Achievement Unlocked!
          </h2>
          
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {achievement?.name}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {achievement?.description}
          </p>

          {/* Rarity Badge */}
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getRarityColor(achievement?.rarity || 'common')} mb-4`}>
            {achievement?.rarity?.toUpperCase() || 'COMMON'}
          </div>

          {/* Token Reward */}
          {achievement?.reward_tokens && achievement.reward_tokens > 0 && (
            <div className="flex items-center justify-center gap-2 text-yellow-600 mb-4">
              <span className="text-xl">🪙</span>
              <span className="font-semibold">+{achievement.reward_tokens} tokens</span>
            </div>
          )}

          {/* Progress Indicator */}
          {newAchievements.length > 1 && (
            <div className="flex justify-center gap-2 mb-4">
              {newAchievements.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={markAchievementsAsCelebrated}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              {newAchievements.length > 1 ? 'Continue' : 'Awesome!'}
            </button>
            
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
