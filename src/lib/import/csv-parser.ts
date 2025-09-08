import type { CalendarEvent } from '../../types/calendar';
import { v4 as uuidv4 } from 'uuid';

export const parseCsvData = (data: any[]): CalendarEvent[] => {
  return data.map((row) => {
    const startDate = new Date(row['Start date'] + ' ' + row['Start time']);
    const endDate = new Date(row['End date'] + ' ' + row['End time']);

    return {
      id: uuidv4(),
      title: row['Description'],
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      event_type: mapEventType(row['Type']?.toLowerCase()),
      location: row['Location(s)'],
      description: row['Additional info'],
      source_id: 'csv-import',
      user_id: '', // This will be set by the backend
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      flexibility: 'fixed',
      importance: 'medium',
    };
  });
};

const mapEventType = (type: string | undefined): 'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal' => {
  switch (type) {
    case 'lecture':
    case 'laboratory practical':
      return 'class';
    case 'seminar':
      return 'meeting';
    default:
      return 'personal';
  }
};
