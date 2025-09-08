export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  type: "build" | "break" | "maintain";
  measurement_type: "boolean" | "count" | "duration";
  target_value: number | null;
  target_unit: string | null;
  color: string | null;
  streak_count: number | null;
  best_streak: number | null;
  position: number | null;
  allows_skips: boolean | null;
  reminder_time: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
