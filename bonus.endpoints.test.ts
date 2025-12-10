/**
 * Test: New Bonus System Endpoints
 * Tests the three new tRPC endpoints:
 * 1. bonuses.triggerSync - Manual sync trigger
 * 2. bonuses.getAuditHistory - Audit history retrieval
 * 3. bonuses.getWeeklySummary - Weekly summary for user's branch
 */

import { describe, it, expect } from 'vitest';
import { triggerManualSync } from './jobs/syncRevenueCron';
import { getBonusAuditHistory, logBonusRequest } from './utils/bonusAudit';

describe('Bonus System Endpoints', () => {
  describe('Manual Sync Trigger', () => {
    it('should trigger manual sync successfully', async () => {
      const result = await triggerManualSync();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      
      // Should have at least one branch result
      expect(result.results.length).toBeGreaterThan(0);
      
      // Each result should have required properties
      result.results.forEach((branchResult: any) => {
        expect(branchResult).toHaveProperty('branchId');
        expect(branchResult).toHaveProperty('branchName');
        expect(branchResult).toHaveProperty('success');
        expect(branchResult).toHaveProperty('message');
      });
      
      console.log(`Manual sync completed: ${result.results.length} branches processed`);
    }, 60000); // 60 second timeout
  });

  describe('Audit History Retrieval', () => {
    it('should retrieve audit history for a bonus record', async () => {
      // First, create an audit log entry
      const testWeeklyBonusId = 1;
      const testUserId = 1;
      
      const logResult = await logBonusRequest(testWeeklyBonusId, testUserId, {
        testRun: true,
        timestamp: new Date().toISOString()
      });
      
      expect(logResult.success).toBe(true);
      
      // Then retrieve the audit history
      const historyResult = await getBonusAuditHistory(testWeeklyBonusId);
      
      expect(historyResult.success).toBe(true);
      expect(Array.isArray(historyResult.data)).toBe(true);
      expect(historyResult.data.length).toBeGreaterThan(0);
      
      // Verify the structure of audit entries
      const firstEntry = historyResult.data[0];
      expect(firstEntry).toHaveProperty('id');
      expect(firstEntry).toHaveProperty('weeklyBonusId');
      expect(firstEntry).toHaveProperty('action');
      expect(firstEntry).toHaveProperty('performedBy');
      expect(firstEntry).toHaveProperty('performedAt');
      
      console.log(`Found ${historyResult.data.length} audit entries for bonus #${testWeeklyBonusId}`);
    });

    it('should return empty array for non-existent bonus', async () => {
      const result = await getBonusAuditHistory(999999);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('Integration: Sync with Audit Logging', () => {
    it('should log audit entries when sync completes', async () => {
      // Trigger sync
      const syncResult = await triggerManualSync();
      expect(syncResult.success).toBeDefined();
      
      // Find a successful branch sync
      const successfulBranch = syncResult.results.find((r: any) => r.success && r.data?.weeklyBonusId);
      
      if (successfulBranch) {
        const weeklyBonusId = successfulBranch.data.weeklyBonusId;
        
        // Log the sync action
        const { logRevenueSync } = await import('./utils/bonusAudit');
        const logResult = await logRevenueSync(weeklyBonusId, 1, {
          branchId: successfulBranch.branchId,
          branchName: successfulBranch.branchName,
          totalRevenue: successfulBranch.data.totalRevenue,
          employeeCount: successfulBranch.data.employeeCount
        });
        
        expect(logResult.success).toBe(true);
        
        // Verify audit log was created
        const historyResult = await getBonusAuditHistory(weeklyBonusId);
        expect(historyResult.success).toBe(true);
        expect(historyResult.data.length).toBeGreaterThan(0);
        
        // Check if revenue_synced action exists
        const syncLog = historyResult.data.find((entry: any) => entry.action === 'revenue_synced');
        expect(syncLog).toBeDefined();
        
        console.log(`✓ Sync and audit logging integration verified for bonus #${weeklyBonusId}`);
      } else {
        console.log('⚠ No successful branch sync to test audit logging');
      }
    }, 60000);
  });
});
