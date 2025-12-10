import { drizzle } from "drizzle-orm/mysql2";
// Import schema directly without TypeScript
const { users, branches } = await import("../drizzle/schema.ts");
import { eq } from "drizzle-orm";

// Simple password hashing using Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const secret = process.env.JWT_SECRET || "default-secret";
  const data = encoder.encode(password + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function seedUsers() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("🌱 Seeding predefined user accounts...");

  // Get branches
  const allBranches = await db.select().from(branches);
  const labnBranch = allBranches.find(b => b.code === "BR001" || b.nameAr.includes("الرئيسي"));
  const tuwaiqBranch = allBranches.find(b => b.code === "BR002" || b.nameAr.includes("الشمالي"));

  if (!labnBranch || !tuwaiqBranch) {
    console.error("❌ Branches not found. Please ensure branches are seeded first.");
    console.log("Available branches:", allBranches);
    process.exit(1);
  }

  // Define predefined users
  const predefinedUsers = [
    {
      username: "Admin",
      password: "Omar101010",
      name: "المدير العام",
      role: "admin",
      branchId: null, // Admin can access all branches
    },
    {
      username: "Aa123",
      password: "Aa1234",
      name: "مشرف فرع لبن",
      role: "manager",
      branchId: labnBranch.id,
    },
    {
      username: "Mm123",
      password: "Mm1234",
      name: "مشرف فرع طويق",
      role: "manager",
      branchId: tuwaiqBranch.id,
    },
  ];

  for (const userData of predefinedUsers) {
    try {
      const passwordHash = await hashPassword(userData.password);
      
      // Check if user exists
      const existing = await db.select().from(users).where(eq(users.username, userData.username)).limit(1);
      
      if (existing.length > 0) {
        // Update existing user
        await db.update(users)
          .set({
            passwordHash,
            name: userData.name,
            role: userData.role,
            branchId: userData.branchId,
            loginMethod: "password",
            isActive: true,
          })
          .where(eq(users.username, userData.username));
        
        console.log(`✅ Updated user: ${userData.username} (${userData.name})`);
      } else {
        // Create new user
        await db.insert(users).values({
          openId: `local-${userData.username}`,
          username: userData.username,
          passwordHash,
          name: userData.name,
          role: userData.role,
          branchId: userData.branchId,
          loginMethod: "password",
          isActive: true,
        });
        
        console.log(`✅ Created user: ${userData.username} (${userData.name})`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed user ${userData.username}:`, error);
    }
  }

  console.log("\n🎉 User seeding completed!");
  console.log("\n📋 Login Credentials:");
  console.log("Admin: Username=Admin, Password=Omar101010");
  console.log("Manager Labn: Username=Aa123, Password=Aa1234");
  console.log("Manager Tuwaiq: Username=Mm123, Password=Mm1234");
  
  process.exit(0);
}

seedUsers().catch(error => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
