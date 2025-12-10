/**
 * Test: Revenue Sync and Audit Logging
 * Tests the three new features:
 * 1. Automatic revenue reflection from daily_revenues and employee_revenues
 * 2. Daily cron job synchronization
 * 3. Audit log for all changes
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { syncWeeklyRevenue, getWeekNumber, isLastDayOfWeek } from './utils/revenueSync';
import { triggerManualSync } from './jobs/syncRevenueCron';
import { logBonusRequest, logBonusApproval, logBonusRejection, getBonusAuditHistory } from './utils/bonusAudit';

describe('Revenue Sync System', () => {
  describe('Week Calculator', () => {
    it('should correctly calculate week numbers', () => {
      expect(getWeekNumber(1)).toBe(1);
      expect(getWeekNumber(7)).toBe(1);
      expect(getWeekNumber(8)).toBe(2);
      expect(getWeekNumber(15)).toBe(2);
      expect(getWeekNumber(16)).toBe(3);
      expect(getWeekNumber(22)).toBe(3);
      expect(getWeekNumber(23)).toBe(4);
      expect(getWeekNumber(29)).toBe(4);
      expect(getWeekNumber(30)).toBe(5);
      expect(getWeekNumber(31)).toBe(5);
    });

    it('should correctly identify last day of week', () => {
      const testCases = [
        { date: new Date(2025, 11, 7), expected: true, week: 1 },  // Dec 7
        { date: new Date(2025, 11, 8), expected: false, week: 2 }, // Dec 8
        { date: new Date(2025, 11, 15), expected: true, week: 2 }, // Dec 15
        { date: new Date(2025, 11, 22), expected: true, week: 3 }, // Dec 22
        { date: new Date(2025, 11, 29), expected: true, week: 4 }, // Dec 29
        { date: new Date(2025, 11, 31), expected: true, week: 5 }, // Dec 31 (last day of month)
      ];

      testCases.forEach(({ date, expected, week }) => {
        const result = isLastDayOfWeek(date);
        expect(result.isLast).toBe(expected);
        expect(result.weekNumber).toBe(week);
      });
    });
  });

  describe('Revenue Synchronization', () => {
    it('should sync weekly revenue for a branch', async () => {
      // Test with branch 1 (لبن), week 1, December 2025
      const result = await syncWeeklyRevenue(1, 1, 12, 2025);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully synced');
      
      if (result.data) {
        expect(result.data).toHaveProperty('weeklyBonusId');
        expect(result.data).toHaveProperty('totalRevenue');
        expect(result.data).toHaveProperty('employeeCount');
      }
    }, 30000); // 30 second timeout for database operations

    it('should handle non-existent branch gracefully', async () => {
      const result = await syncWeeklyRevenue(99999, 1, 12, 2025);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No active employees');
    });
  });

  describe('Manual Sync Trigger', () => {
    it('should manually trigger sync for all branches', async () => {
      const result = await triggerManualSync();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      
      console.log('Manual sync result:', result);
    }, 60000); // 60 second timeout for all branches
  });
});

describe('Audit Logging System', () => {
  let testWeeklyBonusId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Use existing data from the database
    testWeeklyBonusId = 1; // Assuming at least one weekly bonus exists
    testUserId = 1; // Assuming at least one user exists
  });

  describe('Bonus Action Logging', () => {
    it('should log bonus request action', async () => {
      const result = await logBonusRequest(testWeeklyBonusId, testUserId, {
        requestedAmount: 180,
        weekNumber: 1
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should log bonus approval action', async () => {
      const result = await logBonusApproval(testWeeklyBonusId, testUserId, {
        approvedAmount: 180,
        approvalNotes: 'Test approval'
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should log bonus rejection action', async () => {
      const result = await logBonusRejection(
        testWeeklyBonusId,
        testUserId,
        'Test rejection reason',
        { rejectedAmount: 180 }
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Audit History Retrieval', () => {
    it('should retrieve audit history for a bonus', async () => {
      const result = await getBonusAuditHistory(testWeeklyBonusId);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      
      if (result.data.length > 0) {
        const firstEntry = result.data[0];
        expect(firstEntry).toHaveProperty('id');
        expect(firstEntry).toHaveProperty('action');
        expect(firstEntry).toHaveProperty('performedBy');
        expect(firstEntry).toHaveProperty('performedAt');
      }
      
      console.log(`Found ${result.data.length} audit entries`);
    });

    it('should handle non-existent bonus gracefully', async () => {
      const result = await getBonusAuditHistory(99999);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});

describe('Integration Tests', () => {
  it('should sync revenue and log the action', async () => {
    // 1. Sync revenue
    const syncResult = await syncWeeklyRevenue(1, 1, 12, 2025);
    expect(syncResult.success).toBe(true);
    
    if (syncResult.data?.weeklyBonusId) {
      // 2. Log the sync action
      const { logRevenueSync } = await import('./utils/bonusAudit');
      const logResult = await logRevenueSync(
        syncResult.data.weeklyBonusId,
        1, // System user
        {
          totalRevenue: syncResult.data.totalRevenue,
          employeeCount: syncResult.data.employeeCount
        }
      );
      
      expect(logResult.success).toBe(true);
      
      // 3. Verify audit log was created
      const historyResult = await getBonusAuditHistory(syncResult.data.weeklyBonusId);
      expect(historyResult.success).toBe(true);
      expect(historyResult.data.length).toBeGreaterThan(0);
      
      const syncLog = historyResult.data.find(entry => entry.action === 'revenue_synced');
      expect(syncLog).toBeDefined();
    }
  }, 30000);
});
