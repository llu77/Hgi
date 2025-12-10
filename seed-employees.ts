import { getDb } from "./db";
import { employees } from "../drizzle/schema";

async function seedEmployees() {
  const db = await getDb();
  
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  try {
    // فرع لبن (Branch ID: 1)
    const labnEmployees = [
      { code: "EMP-L001", name: "عبدالحي جلال", branchId: 1, isActive: true },
      { code: "EMP-L002", name: "علاء ناصر", branchId: 1, isActive: true },
      { code: "EMP-L003", name: "محمود عمارة", branchId: 1, isActive: true },
      { code: "EMP-L004", name: "السيد محمد", branchId: 1, isActive: true },
      { code: "EMP-L005", name: "عمرو", branchId: 1, isActive: true },
    ];

    // فرع طويق (Branch ID: 2)
    const tuwaiqEmployees = [
      { code: "EMP-T001", name: "محمد إسماعيل", branchId: 2, isActive: true },
      { code: "EMP-T002", name: "محمد ناصر", branchId: 2, isActive: true },
      { code: "EMP-T003", name: "فارس", branchId: 2, isActive: true },
    ];

    const allEmployees = [...labnEmployees, ...tuwaiqEmployees];

    console.log("Inserting employees...");
    
    for (const employee of allEmployees) {
      await db.insert(employees).values(employee);
      console.log(`✓ Added: ${employee.name} (Branch ${employee.branchId})`);
    }

    console.log("\n✅ Employee seeding completed successfully!");
    console.log(`Total employees added: ${allEmployees.length}`);
    console.log(`- فرع لبن: ${labnEmployees.length} employees`);
    console.log(`- فرع طويق: ${tuwaiqEmployees.length} employees`);
    
  } catch (error) {
    console.error("Error seeding employees:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedEmployees();
