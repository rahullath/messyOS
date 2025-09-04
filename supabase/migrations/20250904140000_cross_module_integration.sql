-- Cross-module integration and achievement system
-- This migration adds tables for tracking achievements, life optimization scores, and cross-module correlations

-- Life optimization score tracking
CREATE TABLE life_optimization_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  habits_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  tasks_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  health_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  productivity_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  content_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, score_date)
);

-- Achievement definitions
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'habits', 'tasks', 'health', 'productivity', 'cross_module'
  type TEXT NOT NULL, -- 'streak', 'completion', 'milestone', 'correlation'
  criteria JSONB NOT NULL, -- Conditions for earning the achievement
  reward_tokens INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements (earned achievements)
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_data JSONB DEFAULT '{}',
  is_celebrated BOOLEAN DEFAULT false,
  celebrated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, achievement_id)
);

-- Cross-module correlations
CREATE TABLE cross_module_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module1 TEXT NOT NULL, -- 'habits', 'tasks', 'health', 'productivity', 'content'
  module1_metric TEXT NOT NULL,
  module2 TEXT NOT NULL,
  module2_metric TEXT NOT NULL,
  correlation_score DECIMAL(3,2) NOT NULL, -- -1.0 to 1.0
  confidence DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
  sample_size INTEGER NOT NULL,
  insight TEXT,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module1, module1_metric, module2, module2_metric)
);

-- Progress sharing and summaries
CREATE TABLE progress_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary_type TEXT NOT NULL, -- 'weekly', 'monthly', 'milestone', 'custom'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL, -- Summary statistics and insights
  visual_data JSONB, -- Chart data, images, etc.
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_life_optimization_scores_user_date ON life_optimization_scores(user_id, score_date DESC);
CREATE INDEX idx_user_achievements_user_earned ON user_achievements(user_id, earned_at DESC);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX idx_cross_module_correlations_user ON cross_module_correlations(user_id);
CREATE INDEX idx_progress_summaries_user_type ON progress_summaries(user_id, summary_type);
CREATE INDEX idx_progress_summaries_share_token ON progress_summaries(share_token) WHERE share_token IS NOT NULL;

-- Insert default achievements
INSERT INTO achievements (name, description, category, type, criteria, reward_tokens, icon, color, rarity) VALUES
-- Habit achievements
('First Steps', 'Complete your first habit', 'habits', 'completion', '{"habits_completed": 1}', 10, '🎯', '#10B981', 'common'),
('Week Warrior', 'Maintain a 7-day streak', 'habits', 'streak', '{"streak_days": 7}', 25, '🔥', '#F59E0B', 'common'),
('Month Master', 'Maintain a 30-day streak', 'habits', 'streak', '{"streak_days": 30}', 100, '💪', '#EF4444', 'rare'),
('Habit Hero', 'Complete 100 habits', 'habits', 'completion', '{"habits_completed": 100}', 200, '🏆', '#8B5CF6', 'epic'),
('Consistency King', 'Maintain 5 habits for 30 days', 'habits', 'milestone', '{"concurrent_streaks": 5, "min_days": 30}', 300, '👑', '#F59E0B', 'legendary'),

-- Task achievements
('Task Tackler', 'Complete your first task', 'tasks', 'completion', '{"tasks_completed": 1}', 10, '✅', '#10B981', 'common'),
('Productivity Pro', 'Complete 50 tasks', 'tasks', 'completion', '{"tasks_completed": 50}', 100, '⚡', '#3B82F6', 'rare'),
('Priority Master', 'Complete 10 high-priority tasks', 'tasks', 'completion', '{"high_priority_completed": 10}', 150, '🎯', '#EF4444', 'epic'),

-- Cross-module achievements
('Life Optimizer', 'Achieve 80+ score in all modules', 'cross_module', 'milestone', '{"min_all_scores": 80}', 500, '🌟', '#8B5CF6', 'legendary'),
('Balance Master', 'Maintain consistent scores across modules for 30 days', 'cross_module', 'correlation', '{"consistent_days": 30, "score_variance": 10}', 250, '⚖️', '#10B981', 'epic'),
('Synergy Seeker', 'Discover 5 positive correlations between modules', 'cross_module', 'correlation', '{"positive_correlations": 5}', 200, '🔗', '#F59E0B', 'rare');

-- Function to calculate life optimization score
CREATE OR REPLACE FUNCTION calculate_life_optimization_score(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  habits_score DECIMAL(5,2) := 0;
  tasks_score DECIMAL(5,2) := 0;
  health_score DECIMAL(5,2) := 0;
  productivity_score DECIMAL(5,2) := 0;
  content_score DECIMAL(5,2) := 0;
  overall_score DECIMAL(5,2) := 0;
  result JSONB;
BEGIN
  -- Calculate habits score (based on completion rate and streaks)
  SELECT COALESCE(
    (
      SELECT 
        LEAST(100, 
          (COUNT(CASE WHEN he.value > 0 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 50) +
          (AVG(h.streak_count) * 2)
        )
      FROM habits h
      LEFT JOIN habit_entries he ON h.id = he.habit_id AND he.date = p_date
      WHERE h.user_id = p_user_id AND h.is_active = true
    ), 0
  ) INTO habits_score;

  -- Calculate tasks score (based on completion rate and priority)
  SELECT COALESCE(
    (
      SELECT 
        LEAST(100,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 60) +
          (COUNT(CASE WHEN status = 'completed' AND priority IN ('high', 'urgent') THEN 1 END) * 5)
        )
      FROM tasks
      WHERE user_id = p_user_id 
        AND (completed_at::DATE = p_date OR (status != 'completed' AND created_at::DATE <= p_date))
    ), 0
  ) INTO tasks_score;

  -- Calculate health score (based on health-related metrics)
  SELECT COALESCE(
    (
      SELECT LEAST(100, AVG(value))
      FROM metrics
      WHERE user_id = p_user_id 
        AND category = 'health'
        AND recorded_at::DATE = p_date
    ), 0
  ) INTO health_score;

  -- Calculate productivity score (based on task completion and time metrics)
  SELECT COALESCE(
    (
      SELECT 
        LEAST(100,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 70) +
          (AVG(CASE WHEN metadata->>'time_spent' IS NOT NULL THEN (metadata->>'time_spent')::INTEGER ELSE 0 END) / 60 * 0.5)
        )
      FROM tasks
      WHERE user_id = p_user_id 
        AND created_at::DATE = p_date
    ), tasks_score * 0.8
  ) INTO productivity_score;

  -- Calculate content score (based on content consumption and ratings)
  SELECT COALESCE(
    (
      SELECT 
        LEAST(100,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 40) +
          (AVG(COALESCE(rating, 0)) * 10)
        )
      FROM content_entries
      WHERE user_id = p_user_id 
        AND (completed_at::DATE = p_date OR started_at::DATE = p_date)
    ), 0
  ) INTO content_score;

  -- Calculate overall score (weighted average)
  overall_score := (
    habits_score * 0.3 +
    tasks_score * 0.25 +
    health_score * 0.2 +
    productivity_score * 0.15 +
    content_score * 0.1
  );

  -- Build result JSON
  result := jsonb_build_object(
    'overall_score', overall_score,
    'habits_score', habits_score,
    'tasks_score', tasks_score,
    'health_score', health_score,
    'productivity_score', productivity_score,
    'content_score', content_score,
    'calculation_date', p_date
  );

  -- Insert or update the score
  INSERT INTO life_optimization_scores (
    user_id, overall_score, habits_score, tasks_score, 
    health_score, productivity_score, content_score, score_date
  ) VALUES (
    p_user_id, overall_score, habits_score, tasks_score,
    health_score, productivity_score, content_score, p_date
  )
  ON CONFLICT (user_id, score_date) 
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    habits_score = EXCLUDED.habits_score,
    tasks_score = EXCLUDED.tasks_score,
    health_score = EXCLUDED.health_score,
    productivity_score = EXCLUDED.productivity_score,
    content_score = EXCLUDED.content_score,
    updated_at = NOW();

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  achievement RECORD;
  user_stats JSONB;
  new_achievements JSONB := '[]'::JSONB;
  achievement_data JSONB;
BEGIN
  -- Get user statistics for achievement checking
  SELECT jsonb_build_object(
    'habits_completed', (
      SELECT COUNT(*) FROM habit_entries 
      WHERE user_id = p_user_id AND value > 0
    ),
    'max_streak', (
      SELECT COALESCE(MAX(streak_count), 0) FROM habits 
      WHERE user_id = p_user_id
    ),
    'tasks_completed', (
      SELECT COUNT(*) FROM tasks 
      WHERE user_id = p_user_id AND status = 'completed'
    ),
    'high_priority_completed', (
      SELECT COUNT(*) FROM tasks 
      WHERE user_id = p_user_id AND status = 'completed' AND priority IN ('high', 'urgent')
    ),
    'concurrent_streaks', (
      SELECT COUNT(*) FROM habits 
      WHERE user_id = p_user_id AND streak_count >= 30
    ),
    'min_all_scores', (
      SELECT COALESCE(MIN(LEAST(habits_score, tasks_score, health_score, productivity_score, content_score)), 0)
      FROM life_optimization_scores 
      WHERE user_id = p_user_id 
      ORDER BY score_date DESC 
      LIMIT 1
    )
  ) INTO user_stats;

  -- Check each achievement
  FOR achievement IN 
    SELECT * FROM achievements 
    WHERE is_active = true 
    AND id NOT IN (
      SELECT achievement_id FROM user_achievements 
      WHERE user_id = p_user_id
    )
  LOOP
    -- Check if user meets criteria
    IF (
      (achievement.criteria->>'habits_completed' IS NULL OR 
       (user_stats->>'habits_completed')::INTEGER >= (achievement.criteria->>'habits_completed')::INTEGER) AND
      (achievement.criteria->>'streak_days' IS NULL OR 
       (user_stats->>'max_streak')::INTEGER >= (achievement.criteria->>'streak_days')::INTEGER) AND
      (achievement.criteria->>'tasks_completed' IS NULL OR 
       (user_stats->>'tasks_completed')::INTEGER >= (achievement.criteria->>'tasks_completed')::INTEGER) AND
      (achievement.criteria->>'high_priority_completed' IS NULL OR 
       (user_stats->>'high_priority_completed')::INTEGER >= (achievement.criteria->>'high_priority_completed')::INTEGER) AND
      (achievement.criteria->>'concurrent_streaks' IS NULL OR 
       (user_stats->>'concurrent_streaks')::INTEGER >= (achievement.criteria->>'concurrent_streaks')::INTEGER) AND
      (achievement.criteria->>'min_all_scores' IS NULL OR 
       (user_stats->>'min_all_scores')::DECIMAL >= (achievement.criteria->>'min_all_scores')::DECIMAL)
    ) THEN
      -- Award the achievement
      INSERT INTO user_achievements (user_id, achievement_id, progress_data)
      VALUES (p_user_id, achievement.id, user_stats);

      -- Add tokens if specified
      IF achievement.reward_tokens > 0 THEN
        UPDATE user_tokens 
        SET balance = balance + achievement.reward_tokens,
            total_earned = total_earned + achievement.reward_tokens
        WHERE user_id = p_user_id;

        -- Record token transaction
        INSERT INTO token_transactions (
          user_id, transaction_type, amount, description, 
          balance_before, balance_after
        )
        SELECT 
          p_user_id, 'earned', achievement.reward_tokens,
          'Achievement: ' || achievement.name,
          balance - achievement.reward_tokens, balance
        FROM user_tokens WHERE user_id = p_user_id;
      END IF;

      -- Add to new achievements list
      achievement_data := jsonb_build_object(
        'id', achievement.id,
        'name', achievement.name,
        'description', achievement.description,
        'category', achievement.category,
        'reward_tokens', achievement.reward_tokens,
        'icon', achievement.icon,
        'color', achievement.color,
        'rarity', achievement.rarity
      );
      
      new_achievements := new_achievements || achievement_data;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'new_achievements', new_achievements,
    'user_stats', user_stats
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update life optimization scores when habits are logged
CREATE OR REPLACE FUNCTION trigger_update_life_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update life optimization score for the user
  PERFORM calculate_life_optimization_score(NEW.user_id, NEW.date);
  
  -- Check for new achievements
  PERFORM check_and_award_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_life_score_on_habit_entry
  AFTER INSERT OR UPDATE ON habit_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_life_score();

-- Trigger for task completion
CREATE OR REPLACE FUNCTION trigger_update_life_score_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Update life optimization score for the user
  PERFORM calculate_life_optimization_score(NEW.user_id, CURRENT_DATE);
  
  -- Check for new achievements
  PERFORM check_and_award_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_life_score_on_task_completion
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION trigger_update_life_score_tasks();