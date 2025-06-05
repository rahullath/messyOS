import { createServerClient } from '../supabase/server';

export async function importLoopHabitsCSV(csvContent: string, userId: string) {
  const supabase = createServerClient();
  
  // Parse CSV and convert to habits format
  const lines = csvContent.split('\n');
  const habits = lines.slice(1).map(line => {
    const [name, category, type] = line.split(',');
    return {
      name: name.trim(),
      category: category.trim() || 'General',
      type: type.trim().toLowerCase() === 'positive' ? 'positive' : 'negative',
      user_id: userId,
      color: '#39ff14',
      goal: 1,
      streak: 0,
      is_active: true
    };
  });
  
  const { data, error } = await supabase
    .from('habits')
    .insert(habits);
    
  return { data, error };
}
