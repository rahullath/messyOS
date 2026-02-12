// Unit tests for Daily Plan Sequencer
// Requirements: 3.1, 3.2, 3.3

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentBlock,
  getCurrentBlockFromPlan,
  getNextBlocks,
  getNextBlocksFromPlan,
  markBlockComplete,
  markBlockSkipped,
} from '../../lib/daily-plan/sequencer';
import type { DailyPlan, TimeBlock } from '../../types/daily-plan';

// Mock the database module
vi.mock('../../lib/daily-plan/database', () => ({
  getTimeBlocksByPlan: vi.fn(),
  updateTimeBlock: vi.fn(),
}));

import { getTimeBlocksByPlan, updateTimeBlock } from '../../lib/daily-plan/database';

describe('Sequencer Service', () => {
  const mockPlanId = 'test-plan-id';
  const mockSupabase = {} as any;

  // Helper to create mock time blocks
  const createMockTimeBlock = (
    id: string,
    sequenceOrder: number,
    status: 'pending' | 'completed' | 'skipped' = 'pending'
  ): TimeBlock => ({
    id,
    planId: mockPlanId,
    startTime: new Date('2026-01-18T08:00:00Z'),
    endTime: new Date('2026-01-18T09:00:00Z'),
    activityType: 'task',
    activityName: `Activity ${sequenceOrder}`,
    isFixed: false,
    sequenceOrder,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentBlock', () => {
    it('should return first pending block', async () => {
      // Requirement 3.1: Returns first pending block (status='pending')
      const mockBlocks: TimeBlock[] = [
        createMockTimeBlock('block-1', 1, 'completed'),
        createMockTimeBlock('block-2', 2, 'pending'),
        createMockTimeBlock('block-3', 3, 'pending'),
      ];

      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(mockBlocks);

      const result = await getCurrentBlock(mockSupabase, mockPlanId);

      expect(result).toEqual(mockBlocks[1]);
      expect(result?.id).toBe('block-2');
    });

    it('should return null when no pending blocks exist', async () => {
      // Requirement 3.1: Returns null when all blocks are completed/skipped
      const mockBlocks: TimeBlock[] = [
        createMockTimeBlock('block-1', 1, 'completed'),
        createMockTimeBlock('block-2', 2, 'completed'),
        createMockTimeBlock('block-3', 3, 'skipped'),
      ];

      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(mockBlocks);

      const result = await getCurrentBlock(mockSupabase, mockPlanId);

      expect(result).toBeNull();
    });

    it('should return null when no blocks exist', async () => {
      vi.mocked(getTimeBlocksByPlan).mockResolvedValue([]);

      const result = await getCurrentBlock(mockSupabase, mockPlanId);

      expect(result).toBeNull();
    });
  });

  describe('getCurrentBlockFromPlan', () => {
    it('should return first pending block from plan object', () => {
      // Requirement 3.1: Works with plan object that has timeBlocks loaded
      const mockPlan: DailyPlan = {
        id: mockPlanId,
        userId: 'user-1',
        planDate: new Date('2026-01-18'),
        wakeTime: new Date('2026-01-18T07:00:00Z'),
        sleepTime: new Date('2026-01-18T23:00:00Z'),
        energyState: 'medium',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        timeBlocks: [
          createMockTimeBlock('block-1', 1, 'completed'),
          createMockTimeBlock('block-2', 2, 'pending'),
          createMockTimeBlock('block-3', 3, 'pending'),
        ],
      };

      const result = getCurrentBlockFromPlan(mockPlan);

      expect(result?.id).toBe('block-2');
    });

    it('should return null when plan has no timeBlocks', () => {
      const mockPlan: DailyPlan = {
        id: mockPlanId,
        userId: 'user-1',
        planDate: new Date('2026-01-18'),
        wakeTime: new Date('2026-01-18T07:00:00Z'),
        sleepTime: new Date('2026-01-18T23:00:00Z'),
        energyState: 'medium',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = getCurrentBlockFromPlan(mockPlan);

      expect(result).toBeNull();
    });
  });

  describe('getNextBlocks', () => {
    it('should return next n pending blocks after current', async () => {
      // Requirement 3.2: Returns next n pending blocks after current
      const mockBlocks: TimeBlock[] = [
        createMockTimeBlock('block-1', 1, 'completed'),
        createMockTimeBlock('block-2', 2, 'pending'), // Current
        createMockTimeBlock('block-3', 3, 'pending'), // Next 1
        createMockTimeBlock('block-4', 4, 'skipped'),
        createMockTimeBlock('block-5', 5, 'pending'), // Next 2
        createMockTimeBlock('block-6', 6, 'pending'), // Next 3
      ];

      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(mockBlocks);

      const result = await getNextBlocks(mockSupabase, mockPlanId, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('block-3');
      expect(result[1].id).toBe('block-5');
    });

    it('should return empty array when no pending blocks exist', async () => {
      // Requirement 3.2: Returns empty array when no pending blocks
      const mockBlocks: TimeBlock[] = [
        createMockTimeBlock('block-1', 1, 'completed'),
        createMockTimeBlock('block-2', 2, 'completed'),
      ];

      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(mockBlocks);

      const result = await getNextBlocks(mockSupabase, mockPlanId, 2);

      expect(result).toEqual([]);
    });

    it('should return fewer blocks if not enough pending blocks exist', async () => {
      // Requirement 3.2: Returns correct count even if fewer than requested
      const mockBlocks: TimeBlock[] = [
        createMockTimeBlock('block-1', 1, 'pending'), // Current
        createMockTimeBlock('block-2', 2, 'pending'), // Next 1
        createMockTimeBlock('block-3', 3, 'completed'),
      ];

      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(mockBlocks);

      const result = await getNextBlocks(mockSupabase, mockPlanId, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('block-2');
    });
  });

  describe('getNextBlocksFromPlan', () => {
    it('should return next n pending blocks from plan object', () => {
      // Requirement 3.2: Works with plan object that has timeBlocks loaded
      const mockPlan: DailyPlan = {
        id: mockPlanId,
        userId: 'user-1',
        planDate: new Date('2026-01-18'),
        wakeTime: new Date('2026-01-18T07:00:00Z'),
        sleepTime: new Date('2026-01-18T23:00:00Z'),
        energyState: 'medium',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        timeBlocks: [
          createMockTimeBlock('block-1', 1, 'pending'), // Current
          createMockTimeBlock('block-2', 2, 'pending'), // Next 1
          createMockTimeBlock('block-3', 3, 'pending'), // Next 2
        ],
      };

      const result = getNextBlocksFromPlan(mockPlan, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('block-2');
      expect(result[1].id).toBe('block-3');
    });
  });

  describe('markBlockComplete', () => {
    it('should update block status to completed', async () => {
      // Requirement 3.3: Updates status to 'completed'
      const mockBlock = createMockTimeBlock('block-1', 1, 'completed');
      vi.mocked(updateTimeBlock).mockResolvedValue(mockBlock);

      const result = await markBlockComplete(mockSupabase, 'block-1');

      expect(updateTimeBlock).toHaveBeenCalledWith(mockSupabase, 'block-1', {
        status: 'completed',
      });
      expect(result.status).toBe('completed');
    });

    it('should allow sequence to advance automatically on next getCurrentBlock call', async () => {
      // Requirement 3.3: Sequence updates automatically after completion
      const mockBlocks: TimeBlock[] = [
        createMockTimeBlock('block-1', 1, 'pending'),
        createMockTimeBlock('block-2', 2, 'pending'),
      ];

      // First call - block-1 is current
      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(mockBlocks);
      let current = await getCurrentBlock(mockSupabase, mockPlanId);
      expect(current?.id).toBe('block-1');

      // Mark block-1 complete
      const updatedBlock = { ...mockBlocks[0], status: 'completed' as const };
      vi.mocked(updateTimeBlock).mockResolvedValue(updatedBlock);
      await markBlockComplete(mockSupabase, 'block-1');

      // Second call - block-2 is now current (sequence advanced automatically)
      const updatedBlocks = [
        { ...mockBlocks[0], status: 'completed' as const },
        mockBlocks[1],
      ];
      vi.mocked(getTimeBlocksByPlan).mockResolvedValue(updatedBlocks);
      current = await getCurrentBlock(mockSupabase, mockPlanId);
      expect(current?.id).toBe('block-2');
    });
  });

  describe('markBlockSkipped', () => {
    it('should update block status to skipped with reason', async () => {
      // Requirement 3.3: Updates status to 'skipped' with optional reason
      const mockBlock = createMockTimeBlock('block-1', 1, 'skipped');
      mockBlock.skipReason = 'Not enough time';
      vi.mocked(updateTimeBlock).mockResolvedValue(mockBlock);

      const result = await markBlockSkipped(
        mockSupabase,
        'block-1',
        'Not enough time'
      );

      expect(updateTimeBlock).toHaveBeenCalledWith(mockSupabase, 'block-1', {
        status: 'skipped',
        skip_reason: 'Not enough time',
      });
      expect(result.status).toBe('skipped');
      expect(result.skipReason).toBe('Not enough time');
    });

    it('should update block status to skipped without reason', async () => {
      const mockBlock = createMockTimeBlock('block-1', 1, 'skipped');
      vi.mocked(updateTimeBlock).mockResolvedValue(mockBlock);

      const result = await markBlockSkipped(mockSupabase, 'block-1');

      expect(updateTimeBlock).toHaveBeenCalledWith(mockSupabase, 'block-1', {
        status: 'skipped',
        skip_reason: undefined,
      });
      expect(result.status).toBe('skipped');
    });
  });
});
