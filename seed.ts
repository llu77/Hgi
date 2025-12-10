import { getDb } from "./db";
import { branches, expenseCategories } from "../drizzle/schema";

/**
 * Seed initial data for the financial management system
 */
async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("🌱 Starting database seeding...");

  // Seed branches
  console.log("📍 Seeding branches...");
  const branchesData = [
    {
      code: "BR001",
      name: "Main Branch",
      nameAr: "الفرع الرئيسي",
      address: "123 Main Street, City Center",
      phone: "+966501234567",
      isActive: true,
    },
    {
      code: "BR002",
      name: "North Branch",
      nameAr: "الفرع الشمالي",
      address: "456 North Avenue",
      phone: "+966507654321",
      isActive: true,
    },
  ];

  for (const branch of branchesData) {
    try {
      await db.insert(branches).values(branch);
      console.log(`  ✓ Created branch: ${branch.name} (${branch.nameAr})`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⊘ Branch already exists: ${branch.name}`);
      } else {
        console.error(`  ✗ Error creating branch ${branch.name}:`, error.message);
      }
    }
  }

  // Seed expense categories (15 categories as specified)
  console.log("\n💰 Seeding expense categories...");
  const categoriesData = [
    {
      code: "electricity",
      name: "Electricity",
      nameAr: "كهرباء",
      icon: "Zap",
      color: "yellow",
      sortOrder: 1,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "internet",
      name: "Internet",
      nameAr: "انترنت",
      icon: "Wifi",
      color: "blue",
      sortOrder: 2,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "shop_supplies",
      name: "Shop Supplies",
      nameAr: "أغراض محل",
      icon: "ShoppingCart",
      color: "green",
      sortOrder: 3,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "improvements",
      name: "Improvements",
      nameAr: "تحسينات",
      icon: "Wrench",
      color: "purple",
      sortOrder: 4,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "weekly_bonus",
      name: "Weekly Bonus",
      nameAr: "بونص أسبوعي",
      icon: "Gift",
      color: "pink",
      sortOrder: 5,
      requiresEmployee: true,
      isActive: true,
    },
    {
      code: "paper",
      name: "Paper",
      nameAr: "ورق",
      icon: "FileText",
      color: "gray",
      sortOrder: 6,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "violation",
      name: "Violation",
      nameAr: "مخالفة",
      icon: "AlertTriangle",
      color: "red",
      sortOrder: 7,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "residency",
      name: "Residency Issuance/Renewal",
      nameAr: "إصدار/تجديد إقامات",
      icon: "CreditCard",
      color: "indigo",
      sortOrder: 8,
      requiresEmployee: true,
      isActive: true,
    },
    {
      code: "health_certificates",
      name: "Health Certificates",
      nameAr: "شهادات صحية",
      icon: "Heart",
      color: "red",
      sortOrder: 9,
      requiresEmployee: true,
      isActive: true,
    },
    {
      code: "government_fees",
      name: "Government Fees",
      nameAr: "رسوم حكومية",
      icon: "Building",
      color: "slate",
      sortOrder: 10,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "shop_permits",
      name: "Shop Permits",
      nameAr: "تصاريح محل",
      icon: "FileCheck",
      color: "teal",
      sortOrder: 11,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "housing_rent",
      name: "Housing Rent",
      nameAr: "إيجار سكن",
      icon: "Home",
      color: "orange",
      sortOrder: 12,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "shop_rent",
      name: "Shop Rent",
      nameAr: "إيجار محل",
      icon: "Store",
      color: "brown",
      sortOrder: 13,
      requiresEmployee: false,
      isActive: true,
    },
    {
      code: "travel_tickets",
      name: "Travel Tickets",
      nameAr: "تذاكر سفر",
      icon: "Plane",
      color: "sky",
      sortOrder: 14,
      requiresEmployee: true,
      isActive: true,
    },
    {
      code: "advance_payment",
      name: "Advance Payment",
      nameAr: "سلفة",
      icon: "HandCoins",
      color: "emerald",
      sortOrder: 15,
      requiresEmployee: true,
      isActive: true,
    },
  ];

  for (const category of categoriesData) {
    try {
      await db.insert(expenseCategories).values(category);
      console.log(`  ✓ Created category: ${category.name} (${category.nameAr})`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⊘ Category already exists: ${category.name}`);
      } else {
        console.error(`  ✗ Error creating category ${category.name}:`, error.message);
      }
    }
  }

  console.log("\n✅ Database seeding completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
