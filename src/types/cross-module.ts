// Cross-module integration types
export interface LifeOptimizationScore {
  id: string;
  user_id: string;
  overall_score: number;
  habits_score: number;
  tasks_score: number;
  health_score: number;
  productivity_score: number;
  content_score: number;
  score_date: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'habits' | 'tasks' | 'health' | 'productivity' | 'cross_module';
  type: 'streak' | 'completion' | 'milestone' | 'correlation';
  criteria: Record<string, any>;
  reward_tokens: number;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  progress_data: Record<string, any>;
  is_celebrated: boolean;
  celebrated_at?: string;
  achievement?: Achievement;
}

export interface CrossModuleCorrelation {
  id: string;
  user_id: string;
  module1: string;
  module1_metric: string;
  module2: string;
  module2_metric: string;
  correlation_score: number;
  confidence: number;
  sample_size: number;
  insight: string;
  last_calculated: string;
}

export interface ProgressSummary {
  id: string;
  user_id: string;
  title: string;
  summary_type: 'weekly' | 'monthly' | 'milestone' | 'custom';
  period_start: string;
  period_end: string;
  data: {
    habits: {
      completed: number;
      streaks: number[];
      categories: Record<string, number>;
    };
    tasks: {
      completed: number;
      by_priority: Record<string, number>;
      categories: Record<string, number>;
    };
    scores: LifeOptimizationScore[];
    achievements: UserAchievement[];
    insights: string[];
  };
  visual_data?: {
    charts: any[];
    images: string[];
  };
  is_public: boolean;
  share_token?: string;
  created_at: string;
}

export interface ModuleStats {
  habits: {
    total: number;
    active: number;
    completed_today: number;
    avg_streak: number;
    best_streak: number;
    completion_rate: number;
  };
  tasks: {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
    completion_rate: number;
    avg_completion_time: number;
  };
  health: {
    metrics_count: number;
    avg_score: number;
    trend: 'up' | 'down' | 'stable';
  };
  productivity: {
    focus_time: number;
    tasks_per_day: number;
    efficiency_score: number;
  };
  content: {
    consumed: number;
    completed: number;
    avg_rating: number;
  };
}

export interface CrossModuleInsight {
  type: 'correlation' | 'pattern' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  modules: string[];
  confidence: number;
  actionable: boolean;
  data: any;
  created_at: string;
}

export interface AchievementCelebration {
  achievement: Achievement;
  user_achievement: UserAchievement;
  animation_type: 'confetti' | 'fireworks' | 'glow' | 'bounce';
  sound_effect?: string;
  show_duration: number;
}

export interface ExportData {
  format: 'csv' | 'json' | 'pdf';
  modules: string[];
  date_range: {
    start: string;
    end: string;
  };
  include_insights: boolean;
  include_achievements: boolean;
  include_correlations: boolean;
}

export interface ShareableProgress {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  stats: {
    habits_completed: number;
    tasks_completed: number;
    current_streaks: number;
    achievements_earned: number;
    overall_score: number;
  };
  achievements: Achievement[];
  timeframe: string;
  share_url: string;
  created_at: string;
}

// API Response types
export interface LifeScoreResponse {
  success: boolean;
  data: LifeOptimizationScore;
  insights?: CrossModuleInsight[];
}

export interface AchievementCheckResponse {
  success: boolean;
  new_achievements: UserAchievement[];
  user_stats: Record<string, any>;
}

export interface CorrelationAnalysisResponse {
  success: boolean;
  correlations: CrossModuleCorrelation[];
  insights: CrossModuleInsight[];
}

export interface ExportResponse {
  success: boolean;
  download_url: string;
  filename: string;
  expires_at: string;
}

export interface ShareResponse {
  success: boolean;
  share_url: string;
  share_token: string;
  expires_at?: string;
}