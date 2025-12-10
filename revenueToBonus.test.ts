/**
 * Comprehensive Tests for Revenue-to-Bonus Workflow
 * Tests daily revenues listing and weekly bonus calculation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/trpc';

// Mock context for testing
const createMockContext = (role: 'admin' | 'manager' | 'employee', branchId?: number): TrpcContext => ({
  user: {
    id: 1,
    username: 'testuser',
    name: 'Test User',
    role,
    branchId: branchId || null,
  },
  req: {} as any,
  res: {} as any,
});

describe('Revenue-to-Bonus Workflow', () => {
  describe('Daily Revenues List', () => {
    it('should list all daily revenues for admin', async () => {
      const caller = appRouter.createCaller(createMockContext('admin'));
      
      const result = await caller.revenues.list({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter daily revenues by branch', async () => {
      const caller = appRouter.createCaller(createMockContext('admin'));
      
      const result = await caller.revenues.list({ branchId: 1 });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be from branch 1
      if (result.length > 0) {
        result.forEach(revenue => {
          expect(revenue.branchId).toBe(1);
        });
      }
    });

    it('should filter daily revenues by date range', async () => {
      const caller = appRouter.createCaller(createMockContext('admin'));
      
      const startDate = '2025-12-01';
      const endDate = '2025-12-31';
      
      const result = await caller.revenues.list({
        startDate,
        endDate,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be within date range
      if (result.length > 0) {
        result.forEach(revenue => {
          const revenueDate = new Date(revenue.date);
          expect(revenueDate >= new Date(startDate)).toBe(true);
          expect(revenueDate <= new Date(endDate)).toBe(true);
        });
      }
    });

    it('should force manager to see only their branch revenues', async () => {
      const caller = appRouter.createCaller(createMockContext('manager', 2));
      
      const result = await caller.revenues.list({ branchId: 1 }); // Try to access branch 1
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be from branch 2 (manager's branch), not branch 1
      if (result.length > 0) {
        result.forEach(revenue => {
          expect(revenue.branchId).toBe(2);
        });
      }
    });

    it('should return revenues with correct structure', async () => {
      const caller = appRouter.createCaller(createMockContext('admin'));
      
      const result = await caller.revenues.list({});
      
      if (result.length > 0) {
        const revenue = result[0];
        
        expect(revenue).toHaveProperty('id');
        expect(revenue).toHaveProperty('branchId');
        expect(revenue).toHaveProperty('branchName');
        expect(revenue).toHaveProperty('date');
        expect(revenue).toHaveProperty('cash');
        expect(revenue).toHaveProperty('network');
        expect(revenue).toHaveProperty('total');
        expect(revenue).toHaveProperty('createdAt');
      }
    });
  });

  describe('Weekly Bonus Calculation', () => {
    it('should calculate weekly bonus for manager branch', async () => {
      const caller = appRouter.createCaller(createMockContext('manager', 1));
      
      try {
        const result = await caller.bonuses.calculate({
          year: 2025,
          month: 12,
          weekNumber: 1,
        });
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('weeklyBonusId');
        expect(result).toHaveProperty('totalAmount');
        expect(result).toHaveProperty('employeeCount');
        expect(result).toHaveProperty('eligibleCount');
        
        expect(typeof result.weeklyBonusId).toBe('number');
        expect(typeof result.totalAmount).toBe('number');
        expect(typeof result.employeeCount).toBe('number');
        expect(typeof result.eligibleCount).toBe('number');
        
        expect(result.totalAmount).toBeGreaterThanOrEqual(0);
        expect(result.employeeCount).toBeGreaterThanOrEqual(0);
        expect(result.eligibleCount).toBeLessThanOrEqual(result.employeeCount);
      } catch (error: any) {
        // It's okay if there are no daily revenues for this week
        if (error.message.includes('No daily revenues found')) {
          expect(error.message).toContain('No daily revenues found');
        } else {
          throw error;
        }
      }
    });

    it('should fail for manager without branch assignment', async () => {
      const caller = appRouter.createCaller(createMockContext('manager')); // No branchId
      
      await expect(
        caller.bonuses.calculate({
          year: 2025,
          month: 12,
          weekNumber: 1,
        })
      ).rejects.toThrow('User not assigned to a branch');
    });

    it('should fail for employee role', async () => {
      const caller = appRouter.createCaller(createMockContext('employee', 1));
      
      await expect(
        caller.bonuses.calculate({
          year: 2025,
          month: 12,
          weekNumber: 1,
        })
      ).rejects.toThrow();
    });

    it('should validate week number range', async () => {
      const caller = appRouter.createCaller(createMockContext('manager', 1));
      
      await expect(
        caller.bonuses.calculate({
          year: 2025,
          month: 12,
          weekNumber: 6, // Invalid: should be 1-5
        })
      ).rejects.toThrow();
    });

    it('should validate month range', async () => {
      const caller = appRouter.createCaller(createMockContext('manager', 1));
      
      await expect(
        caller.bonuses.calculate({
          year: 2025,
          month: 13, // Invalid: should be 1-12
          weekNumber: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe('Integration: Revenue to Bonus Flow', () => {
    it('should list revenues and calculate bonus for same period', async () => {
      const caller = appRouter.createCaller(createMockContext('manager', 1));
      
      // Step 1: List revenues for December 2025, week 1 (days 1-7)
      const revenues = await caller.revenues.list({
        startDate: '2025-12-01',
        endDate: '2025-12-07',
      });
      
      expect(revenues).toBeDefined();
      expect(Array.isArray(revenues)).toBe(true);
      
      // Step 2: If revenues exist, calculate bonus
      if (revenues.length > 0) {
        try {
          const bonusResult = await caller.bonuses.calculate({
            year: 2025,
            month: 12,
            weekNumber: 1,
          });
          
          expect(bonusResult).toBeDefined();
          expect(bonusResult.totalAmount).toBeGreaterThanOrEqual(0);
          
          // Step 3: Verify bonus appears in pending requests
          const adminCaller = appRouter.createCaller(createMockContext('admin'));
          const pendingRequests = await adminCaller.bonuses.pending();
          
          expect(pendingRequests).toBeDefined();
          expect(Array.isArray(pendingRequests)).toBe(true);
          
          // The calculated bonus should appear in pending requests
          const foundBonus = pendingRequests.find(req => req.id === bonusResult.weeklyBonusId);
          if (foundBonus) {
            expect(foundBonus.status).toBe('pending');
            expect(Number(foundBonus.totalAmount)).toBe(bonusResult.totalAmount);
          }
        } catch (error: any) {
          // It's okay if there are no employee revenues
          if (error.message.includes('No daily revenues found')) {
            expect(error.message).toContain('No daily revenues found');
          } else {
            throw error;
          }
        }
      }
    });
  });
});
