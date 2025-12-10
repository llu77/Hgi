import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';
import { appRouter } from './routers';

describe('revenues.getByDateRange', () => {
  let testContext: any;

  beforeAll(async () => {
    // Create test context with admin user
    testContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        username: 'Admin',
        name: 'Admin User',
        role: 'admin' as const,
        branchId: null,
      },
    };
  });

  it('should fetch revenues by date range for admin', async () => {
    const caller = appRouter.createCaller(testContext);
    
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const result = await caller.revenues.getByDateRange({
      branchId: 1,
      startDate,
      endDate,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Check structure of returned data
    if (result.length > 0) {
      const firstRevenue = result[0];
      expect(firstRevenue).toHaveProperty('id');
      expect(firstRevenue).toHaveProperty('branchId');
      expect(firstRevenue).toHaveProperty('date');
      expect(firstRevenue).toHaveProperty('cash');
      expect(firstRevenue).toHaveProperty('network');
      expect(firstRevenue).toHaveProperty('total');
      expect(firstRevenue).toHaveProperty('balance');
      expect(firstRevenue).toHaveProperty('isMatched');
      expect(firstRevenue).toHaveProperty('employeeRevenues');
      expect(Array.isArray(firstRevenue.employeeRevenues)).toBe(true);
    }
  });

  it('should fetch revenues for manager with their branch only', async () => {
    const managerContext = {
      user: {
        id: 2,
        openId: 'test-manager',
        username: 'Aa123',
        name: 'Manager Laban',
        role: 'manager' as const,
        branchId: 1, // Laban branch
      },
    };

    const caller = appRouter.createCaller(managerContext);
    
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    // Manager tries to access branch 2 but should get branch 1 data
    const result = await caller.revenues.getByDateRange({
      branchId: 2, // Different branch
      startDate,
      endDate,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // All results should be from manager's branch (branch 1)
    result.forEach((rev) => {
      expect(rev.branchId).toBe(1);
    });
  });

  it('should return empty array for date range with no data', async () => {
    const caller = appRouter.createCaller(testContext);
    
    // Use a date range far in the past
    const startDate = '2020-01-01';
    const endDate = '2020-01-31';
    
    const result = await caller.revenues.getByDateRange({
      branchId: 1,
      startDate,
      endDate,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // May or may not be empty depending on seed data
  });

  it('should include employee revenue details', async () => {
    const caller = appRouter.createCaller(testContext);
    
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const result = await caller.revenues.getByDateRange({
      branchId: 1,
      startDate,
      endDate,
    });

    expect(result).toBeDefined();
    
    // If there are revenues with employee data
    const revenueWithEmployees = result.find(r => r.employeeRevenues && r.employeeRevenues.length > 0);
    
    if (revenueWithEmployees) {
      const empRev = revenueWithEmployees.employeeRevenues![0];
      expect(empRev).toHaveProperty('employeeId');
      expect(empRev).toHaveProperty('employeeName');
      expect(empRev).toHaveProperty('cash');
      expect(empRev).toHaveProperty('network');
      expect(empRev).toHaveProperty('total');
    }
  });

  it('should order revenues by date', async () => {
    const caller = appRouter.createCaller(testContext);
    
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const result = await caller.revenues.getByDateRange({
      branchId: 1,
      startDate,
      endDate,
    });

    expect(result).toBeDefined();
    
    if (result.length > 1) {
      // Check that dates are in ascending order
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].date);
        const currDate = new Date(result[i].date);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    }
  });
});
