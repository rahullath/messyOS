// src/lib/uk-student/laundry-service.ts
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Clothing inventory item for laundry tracking
 */
export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: 'underwear' | 'gym' | 'casual' | 'formal' | 'sleepwear' | 'other';
  quantity: number;
  wash_frequency: 'after_each_use' | 'after_2_uses' | 'after_3_uses' | 'weekly';
  last_washed?: Date;
  condition: 'clean' | 'worn_once' | 'worn_multiple' | 'dirty';
  created_at: Date;
  updated_at: Date;
}

/**
 * Laundry session tracking
 */
export interface LaundrySession {
  id: string;
  user_id: string;
  scheduled_date: Date;
  scheduled_start_time: string; // HH:MM format
  estimated_duration: number; // minutes (typically 120+)
  cost_estimate: number; // pence (600-700 for £6-7)
  status: 'scheduled' | 'in_progress' | 'washer_done' | 'dryer_done' | 'completed' | 'cancelled';
  items_to_wash: string[]; // clothing item IDs
  notes?: string;
  washer_transfer_reminder_sent?: boolean;
  completion_reminder_sent?: boolean;
  actual_cost?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Hand-washing suggestion for gym clothes
 */
export interface HandWashSuggestion {
  id: string;
  user_id: string;
  clothing_item_id: string;
  suggested_date: Date;
  reason: string;
  completed: boolean;
  created_at: Date;
}

/**
 * LaundryService manages laundry scheduling and clothing inventory
 * Helps predict laundry needs and optimize scheduling
 */
export class LaundryService {
  private supabase: SupabaseClient;
  private userId: string;
  private readonly LAUNDRY_COST_PENCE = 650; // £6.50 average
  private readonly MIN_LAUNDRY_DURATION = 120; // 2 hours minimum

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Add a clothing item to inventory
   */
  async addClothingItem(
    name: string,
    category: ClothingItem['category'],
    quantity: number,
    washFrequency: ClothingItem['wash_frequency'] = 'after_each_use'
  ): Promise<ClothingItem> {
    const { data, error } = await this.supabase
      .from('uk_student_clothing_inventory')
      .insert({
        user_id: this.userId,
        name,
        category,
        quantity,
        wash_frequency: washFrequency,
        condition: 'clean',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all clothing items in inventory
   */
  async getClothingInventory(): Promise<ClothingItem[]> {
    const { data, error } = await this.supabase
      .from('uk_student_clothing_inventory')
      .select('*')
      .eq('user_id', this.userId)
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update clothing item condition
   */
  async updateClothingCondition(
    clothingItemId: string,
    condition: ClothingItem['condition']
  ): Promise<ClothingItem> {
    const { data, error } = await this.supabase
      .from('uk_student_clothing_inventory')
      .update({
        condition,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clothingItemId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Predict when laundry is needed based on clothing inventory
   * Returns urgency level: 'not_needed' | 'soon' | 'urgent'
   */
  async predictLaundryNeed(): Promise<{
    urgency: 'not_needed' | 'soon' | 'urgent';
    reason: string;
    criticalItems: ClothingItem[];
    daysUntilNeeded: number;
  }> {
    const inventory = await this.getClothingInventory();

    // Check critical items (underwear and gym clothes)
    const underwear = inventory.filter((item) => item.category === 'underwear');
    const gymClothes = inventory.filter((item) => item.category === 'gym');

    const cleanUnderwear = underwear.filter((item) => item.condition === 'clean');
    const cleanGymClothes = gymClothes.filter((item) => item.condition === 'clean');

    // Calculate total clean items
    const totalCleanUnderwear = cleanUnderwear.reduce((sum, item) => sum + item.quantity, 0);
    const totalCleanGymClothes = cleanGymClothes.reduce((sum, item) => sum + item.quantity, 0);

    // Determine urgency
    let urgency: 'not_needed' | 'soon' | 'urgent' = 'not_needed';
    let reason = '';
    let daysUntilNeeded = 7;
    const criticalItems: ClothingItem[] = [];

    // Underwear check (typically need 5-7 pairs)
    if (totalCleanUnderwear <= 2) {
      urgency = 'urgent';
      reason = `Only ${totalCleanUnderwear} clean underwear remaining`;
      daysUntilNeeded = 1;
      criticalItems.push(...cleanUnderwear);
    } else if (totalCleanUnderwear <= 4) {
      urgency = 'soon';
      reason = `${totalCleanUnderwear} clean underwear remaining`;
      daysUntilNeeded = 2;
      criticalItems.push(...cleanUnderwear);
    }

    // Gym clothes check (typically need 2-3 pairs)
    if (totalCleanGymClothes <= 1) {
      if (urgency !== 'urgent') {
        urgency = 'soon';
        reason = `Only ${totalCleanGymClothes} clean gym outfit remaining`;
        daysUntilNeeded = 2;
      }
      criticalItems.push(...cleanGymClothes);
    }

    return {
      urgency,
      reason,
      criticalItems,
      daysUntilNeeded,
    };
  }

  /**
   * Schedule a laundry session
   */
  async scheduleLaundrySession(
    scheduledDate: Date,
    startTime: string, // HH:MM format
    itemsToWash: string[] = [] // clothing item IDs
  ): Promise<LaundrySession> {
    // Validate that the session is at least 2 hours long
    const { data: existingEvents } = await this.supabase
      .from('uk_student_academic_events')
      .select('*')
      .eq('user_id', this.userId)
      .gte('start_time', scheduledDate.toISOString())
      .lt('start_time', new Date(scheduledDate.getTime() + 86400000).toISOString());

    // Check for conflicts
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = startTimeMinutes + this.MIN_LAUNDRY_DURATION;

    const hasConflict = existingEvents?.some((event: any) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = event.end_time ? new Date(event.end_time) : new Date(eventStart.getTime() + 60 * 60000);
      const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();

      return !(endTimeMinutes <= eventStartMinutes || startTimeMinutes >= eventEndMinutes);
    });

    if (hasConflict) {
      throw new Error('Laundry session conflicts with existing calendar events');
    }

    const { data, error } = await this.supabase
      .from('uk_student_laundry_sessions')
      .insert({
        user_id: this.userId,
        scheduled_date: scheduledDate.toISOString(),
        scheduled_start_time: startTime,
        estimated_duration: this.MIN_LAUNDRY_DURATION,
        cost_estimate: this.LAUNDRY_COST_PENCE,
        status: 'scheduled',
        items_to_wash: itemsToWash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find optimal laundry days based on calendar availability
   */
  async findOptimalLaundryDays(
    daysToCheck: number = 7
  ): Promise<
    Array<{
      date: Date;
      availableSlots: Array<{ startTime: string; endTime: string }>;
      conflictCount: number;
    }>
  > {
    const optimalDays = [];
    const today = new Date();

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      checkDate.setHours(0, 0, 0, 0);

      // Get events for this day
      const { data: events } = await this.supabase
        .from('uk_student_academic_events')
        .select('*')
        .eq('user_id', this.userId)
        .gte('start_time', checkDate.toISOString())
        .lt('start_time', new Date(checkDate.getTime() + 86400000).toISOString());

      // Find available 2+ hour slots
      const availableSlots = this.findAvailableSlots(events || [], this.MIN_LAUNDRY_DURATION);

      if (availableSlots.length > 0) {
        optimalDays.push({
          date: checkDate,
          availableSlots,
          conflictCount: events?.length || 0,
        });
      }
    }

    // Sort by least conflicts
    return optimalDays.sort((a, b) => a.conflictCount - b.conflictCount);
  }

  /**
   * Find available time slots in a day
   */
  private findAvailableSlots(
    events: any[],
    requiredDuration: number
  ): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];
    const dayStart = 8 * 60; // 8 AM
    const dayEnd = 22 * 60; // 10 PM

    // Sort events by start time
    const sortedEvents = events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    let currentTime = dayStart;

    for (const event of sortedEvents) {
      const eventStart = new Date(event.start_time);
      const eventEnd = event.end_time ? new Date(event.end_time) : new Date(eventStart.getTime() + 60 * 60000);
      const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();

      // Check if there's a gap before this event
      if (eventStartMinutes - currentTime >= requiredDuration) {
        slots.push({
          startTime: this.minutesToTimeString(currentTime),
          endTime: this.minutesToTimeString(eventStartMinutes),
        });
      }

      currentTime = Math.max(currentTime, eventEndMinutes);
    }

    // Check if there's time after the last event
    if (dayEnd - currentTime >= requiredDuration) {
      slots.push({
        startTime: this.minutesToTimeString(currentTime),
        endTime: this.minutesToTimeString(dayEnd),
      });
    }

    return slots;
  }

  /**
   * Get all scheduled laundry sessions
   */
  async getLaundrySessions(status?: LaundrySession['status']): Promise<LaundrySession[]> {
    let query = this.supabase
      .from('uk_student_laundry_sessions')
      .select('*')
      .eq('user_id', this.userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update laundry session status
   */
  async updateLaundrySessionStatus(
    sessionId: string,
    status: LaundrySession['status'],
    actualCost?: number
  ): Promise<LaundrySession> {
    const { data, error } = await this.supabase
      .from('uk_student_laundry_sessions')
      .update({
        status,
        actual_cost: actualCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark washer-to-dryer transfer reminder as sent
   */
  async markWasherTransferReminderSent(sessionId: string): Promise<LaundrySession> {
    const { data, error } = await this.supabase
      .from('uk_student_laundry_sessions')
      .update({
        washer_transfer_reminder_sent: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark completion reminder as sent
   */
  async markCompletionReminderSent(sessionId: string): Promise<LaundrySession> {
    const { data, error } = await this.supabase
      .from('uk_student_laundry_sessions')
      .update({
        completion_reminder_sent: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Suggest hand-washing for gym clothes between full laundry sessions
   */
  async suggestHandWashing(): Promise<HandWashSuggestion[]> {
    const inventory = await this.getClothingInventory();
    const gymClothes = inventory.filter((item) => item.category === 'gym');

    const suggestions: HandWashSuggestion[] = [];

    for (const item of gymClothes) {
      // If gym clothes are worn but not dirty, suggest hand-washing
      if (item.condition === 'worn_once' || item.condition === 'worn_multiple') {
        const { data, error } = await this.supabase
          .from('uk_student_hand_wash_suggestions')
          .insert({
            user_id: this.userId,
            clothing_item_id: item.id,
            suggested_date: new Date().toISOString(),
            reason: `Hand-wash ${item.name} to extend wear between full laundry sessions`,
            completed: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          suggestions.push(data);
        }
      }
    }

    return suggestions;
  }

  /**
   * Mark hand-wash suggestion as completed
   */
  async completeHandWashSuggestion(suggestionId: string): Promise<HandWashSuggestion> {
    const { data, error } = await this.supabase
      .from('uk_student_hand_wash_suggestions')
      .update({
        completed: true,
      })
      .eq('id', suggestionId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get laundry statistics
   */
  async getLaundryStats(days: number = 30): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalCost: number;
    averageCostPerSession: number;
    frequency: number; // sessions per week
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sessions } = await this.supabase
      .from('uk_student_laundry_sessions')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', startDate.toISOString());

    const completedSessions = sessions?.filter((s) => s.status === 'completed') || [];
    const totalCost = completedSessions.reduce((sum, s) => sum + (s.actual_cost || s.cost_estimate), 0);

    return {
      totalSessions: sessions?.length || 0,
      completedSessions: completedSessions.length,
      totalCost,
      averageCostPerSession: completedSessions.length > 0 ? totalCost / completedSessions.length : 0,
      frequency: (completedSessions.length / days) * 7,
    };
  }

  /**
   * Get upcoming laundry reminders
   */
  async getUpcomingReminders(): Promise<
    Array<{
      type: 'laundry_needed' | 'washer_transfer' | 'completion' | 'hand_wash';
      message: string;
      urgency: 'low' | 'medium' | 'high';
      actionRequired: boolean;
    }>
  > {
    const reminders = [];

    // Check if laundry is needed
    const laundryNeed = await this.predictLaundryNeed();
    if (laundryNeed.urgency !== 'not_needed') {
      reminders.push({
        type: 'laundry_needed',
        message: laundryNeed.reason,
        urgency: laundryNeed.urgency === 'urgent' ? 'high' : 'medium',
        actionRequired: true,
      });
    }

    // Check for active laundry sessions
    const activeSessions = await this.getLaundrySessions('in_progress');
    if (activeSessions.length > 0) {
      const session = activeSessions[0];
      if (!session.washer_transfer_reminder_sent) {
        reminders.push({
          type: 'washer_transfer',
          message: `Transfer laundry from washer to dryer (started at ${session.scheduled_start_time})`,
          urgency: 'high',
          actionRequired: true,
        });
      }
    }

    // Check for hand-wash suggestions
    const { data: handWashSuggestions } = await this.supabase
      .from('uk_student_hand_wash_suggestions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('completed', false)
      .limit(1);

    if (handWashSuggestions && handWashSuggestions.length > 0) {
      reminders.push({
        type: 'hand_wash',
        message: 'Consider hand-washing gym clothes to extend wear',
        urgency: 'low',
        actionRequired: false,
      });
    }

    return reminders;
  }

  /**
   * Helper: Convert minutes to time string (HH:MM)
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Helper: Convert time string to minutes
   */
  private timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
