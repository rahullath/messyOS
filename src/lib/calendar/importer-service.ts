import { supabase } from '../supabase/client';
import type { Database } from '../../types/supabase';
import type { CalendarEvent, CreateCalendarSourceRequest } from '../../types/calendar';

export const addCsvEvents = async (source: CreateCalendarSourceRequest, events: CalendarEvent[], userId: string) => {
  const { data: sourceData, error: sourceError } = await supabase
    .from('calendar_sources')
    .insert([{ ...source, user_id: userId }] as any)
    .select()
    .single<Database['public']['Tables']['calendar_sources']['Row']>();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  if (!sourceData) {
    throw new Error('Could not create calendar source.');
  }

  const eventsWithSource = events.map((event) => ({
    ...event,
    source_id: sourceData.id,
    user_id: userId,
  }));

  const { error: eventsError } = await supabase.from('calendar_events').insert(eventsWithSource as any);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  return { source: sourceData, events: eventsWithSource };
};
