import { describe, it, expect } from "vitest";
import { getDailyRevenuesByDateRange } from "./db";

describe("Revenue Query - Full Month Test", () => {
  it("should fetch all December revenues for branch 1 (لبن)", async () => {
    const branchId = 1;
    const startDate = "2025-12-01"; // Start of month
    const endDate = "2025-12-31"; // End of month
    
    console.log("\n=== Testing Full Month Revenue Query ===");
    console.log("Branch ID:", branchId);
    console.log("Date Range:", startDate, "to", endDate);
    
    const result = await getDailyRevenuesByDateRange(branchId, startDate, endDate);
    
    console.log("\nResult:");
    console.log("- Found", result.length, "revenues");
    
    if (result.length > 0) {
      console.log("\n✅ Revenues found:");
      result.forEach((rev, index) => {
        console.log(`\n  Revenue #${index + 1}:`);
        console.log(`    Date: ${rev.date}`);
        console.log(`    Cash: ${rev.cash}`);
        console.log(`    Network: ${rev.network}`);
        console.log(`    Total: ${rev.total}`);
        console.log(`    Matched: ${rev.isMatched ? '✓' : '✗'}`);
        console.log(`    Employees: ${rev.employeeRevenues?.length || 0}`);
      });
    } else {
      console.log("\n❌ No revenues found!");
    }
    
    // Assertions
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0); // Should have at least 1 revenue
  });
});
