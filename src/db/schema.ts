import { pgTable, text, serial, timestamp, integer, json, boolean, decimal } from "drizzle-orm/pg-core";

// Users table (Doctor & Assistant)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'doctor' or 'assistant'
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  age: integer("age").notNull(),
  mutuelle: text("mutuelle"), // Optional
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Visits table (The core table for today's visits list and historical records)
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  status: text("status").notNull().default("waiting"), // 'waiting' (in list), 'consulting', 'finished'
  
  // Medical Info (filled by doctor)
  disease: text("disease"),
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  
  // Financial Info (filled by doctor, received by assistant)
  amountToPay: decimal("amount_to_pay", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => visits.id).notNull(),
  medicines: json("medicines").notNull(), // Array of { name, instructions }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointments table (Future appointments)
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
