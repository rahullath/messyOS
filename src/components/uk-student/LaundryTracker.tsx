import React, { useState, useEffect } from 'react';
import { LaundryService, type ClothingItem, type LaundrySession } from '../../lib/uk-student/laundry-service';
import { createClient } from '@supabase/supabase-js';

interface LaundryTrackerProps {
  userId: string;
}

export const LaundryTracker: React.FC<LaundryTrackerProps> = ({ userId }) => {
  const [laundryService, setLaundryService] = useState<LaundryService | null>(null);
  const [clothingInventory, setClothingInventory] = useState<ClothingItem[]>([]);
  const [laundryNeed, setLaundryNeed] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<LaundrySession[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    const initService = async () => {
      try {
        const supabase = createClient(
          process.env.REACT_APP_SUPABASE_URL || '',
          process.env.REACT_APP_SUPABASE_ANON_KEY || ''
        );
        const service = new LaundryService(supabase, userId);
        setLaundryService(service);
      } catch (err) {
        setError('Failed to initialize laundry service');
      }
    };

    initService();
  }, [userId]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!laundryService) return;

      try {
        setLoading(true);
        const [inventory, need, sessions, reminders] = await Promise.all([
          laundryService.getClothingInventory(),
          laundryService.predictLaundryNeed(),
          laundryService.getLaundrySessions('scheduled'),
          laundryService.getUpcomingReminders(),
        ]);

        setClothingInventory(inventory);
        setLaundryNeed(need);
        setUpcomingSessions(sessions);
        setReminders(reminders);
      } catch (err) {
        setError('Failed to load laundry data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [laundryService]);

  const handleAddClothingItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!laundryService) return;

    const formData = new FormData(e.currentTarget);
    try {
      await laundryService.addClothingItem(
        formData.get('name') as string,
        formData.get('category') as ClothingItem['category'],
        parseInt(formData.get('quantity') as string),
        formData.get('washFrequency') as ClothingItem['wash_frequency']
      );

      // Reload inventory
      const inventory = await laundryService.getClothingInventory();
      setClothingInventory(inventory);
      e.currentTarget.reset();
    } catch (err) {
      setError('Failed to add clothing item');
    }
  };

  const handleScheduleLaundry = async (date: Date, startTime: string) => {
    if (!laundryService) return;

    try {
      await laundryService.scheduleLaundrySession(date, startTime);
      const sessions = await laundryService.getLaundrySessions('scheduled');
      setUpcomingSessions(sessions);
    } catch (err) {
      setError('Failed to schedule laundry');
    }
  };

  if (loading) {
    return <div className="p-4">Loading laundry tracker...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Laundry Need Status */}
      {laundryNeed && (
        <div
          className={`p-4 rounded-lg ${
            laundryNeed.urgency === 'urgent'
              ? 'bg-red-100 border-l-4 border-red-500'
              : laundryNeed.urgency === 'soon'
                ? 'bg-yellow-100 border-l-4 border-yellow-500'
                : 'bg-green-100 border-l-4 border-green-500'
          }`}
        >
          <h3 className="font-semibold mb-2">Laundry Status</h3>
          <p className="text-sm">{laundryNeed.reason}</p>
          {laundryNeed.daysUntilNeeded && (
            <p className="text-xs mt-2">Needed in approximately {laundryNeed.daysUntilNeeded} day(s)</p>
          )}
        </div>
      )}

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Reminders</h3>
          {reminders.map((reminder, idx) => (
            <div
              key={idx}
              className={`p-3 rounded text-sm ${
                reminder.urgency === 'high'
                  ? 'bg-red-50 border border-red-200'
                  : reminder.urgency === 'medium'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {reminder.message}
            </div>
          ))}
        </div>
      )}

      {/* Clothing Inventory */}
      <div>
        <h3 className="font-semibold mb-3">Clothing Inventory</h3>
        <div className="space-y-2 mb-4">
          {clothingInventory.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-gray-600">
                  {item.quantity} × {item.category} • {item.condition}
                </p>
              </div>
              <span className="text-sm font-semibold">{item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Add Clothing Item Form */}
        <form onSubmit={handleAddClothingItem} className="space-y-3 p-3 bg-gray-50 rounded">
          <input
            type="text"
            name="name"
            placeholder="Item name (e.g., T-shirts)"
            required
            className="w-full px-3 py-2 border rounded text-sm"
          />
          <select name="category" required className="w-full px-3 py-2 border rounded text-sm">
            <option value="">Select category</option>
            <option value="underwear">Underwear</option>
            <option value="gym">Gym Clothes</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
            <option value="sleepwear">Sleepwear</option>
            <option value="other">Other</option>
          </select>
          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            min="1"
            required
            className="w-full px-3 py-2 border rounded text-sm"
          />
          <select name="washFrequency" className="w-full px-3 py-2 border rounded text-sm">
            <option value="after_each_use">After each use</option>
            <option value="after_2_uses">After 2 uses</option>
            <option value="after_3_uses">After 3 uses</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="submit"
            className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Upcoming Laundry Sessions */}
      <div>
        <h3 className="font-semibold mb-3">Scheduled Laundry Sessions</h3>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-2">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="font-medium">
                  {new Date(session.scheduled_date).toLocaleDateString()} at {session.scheduled_start_time}
                </p>
                <p className="text-xs text-gray-600">
                  Duration: {session.estimated_duration} minutes • Cost: £{(session.cost_estimate / 100).toFixed(2)}
                </p>
                <p className="text-xs mt-1">Status: {session.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No scheduled sessions</p>
        )}
      </div>

      {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">{error}</div>}
    </div>
  );
};

export default LaundryTracker;
