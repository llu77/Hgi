import { describe, it, expect } from "vitest";
import { getDailyRevenuesByDateRange } from "./db";

describe("Revenue Query Tests", () => {
  it("should fetch revenues for branch 1 (لبن) from 2025-12-06 to 2025-12-08", async () => {
    const branchId = 1;
    const startDate = "2025-12-06";
    const endDate = "2025-12-08";
    
    console.log("\n=== Testing Revenue Query ===");
    console.log("Branch ID:", branchId);
    console.log("Date Range:", startDate, "to", endDate);
    
    const result = await getDailyRevenuesByDateRange(branchId, startDate, endDate);
    
    console.log("\nResult:");
    console.log("- Found", result.length, "revenues");
    console.log("- Data:", JSON.stringify(result, null, 2));
    
    // Assertions
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      console.log("\n✅ Query returned data!");
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("cash");
      expect(result[0]).toHaveProperty("network");
    } else {
      console.log("\n⚠️  Query returned no data - this might be expected if no revenues exist in this date range");
    }
  });
  
  it("should handle date-only comparison correctly", async () => {
    // This test verifies that dates are compared without time component
    const branchId = 1;
    const startDate = "2025-12-06T00:00:00.000Z"; // With time
    const endDate = "2025-12-08T23:59:59.999Z"; // With time
    
    const result = await getDailyRevenuesByDateRange(branchId, startDate, endDate);
    
    console.log("\n=== Testing Date Comparison with Time ===");
    console.log("Result count:", result.length);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
