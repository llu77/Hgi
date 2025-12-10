import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import * as db from "./db";

// Simple password hashing using Web Crypto API (Node.js compatible)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ENV.cookieSecret); // Use cookie secret as salt
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export async function authenticateUser(username: string, password: string) {
  const user = await db.getUserByUsername(username);
  
  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }

  // Update last signed in
  await db.updateUserLastSignedIn(user.id);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    isActive: user.isActive,
  };
}

export async function createUserWithPassword(data: {
  username: string;
  password: string;
  name?: string;
  email?: string;
  role: "admin" | "manager" | "employee";
  branchId?: number;
}) {
  const passwordHash = await hashPassword(data.password);
  
  return await db.createUser({
    openId: `local-${data.username}`, // Use local prefix for non-OAuth users
    username: data.username,
    passwordHash,
    name: data.name,
    email: data.email,
    role: data.role,
    branchId: data.branchId,
    loginMethod: "password",
  });
}

export async function generateToken(user: {
  id: number;
  username: string;
  role: string;
  branchId?: number | null;
}) {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branchId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // 7 days
    .sign(secret);

  return token;
}

export async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      userId: number;
      username: string;
      role: string;
      branchId?: number | null;
    };
  } catch (error) {
    return null;
  }
}

// Export hash function for seed script
export { hashPassword };
