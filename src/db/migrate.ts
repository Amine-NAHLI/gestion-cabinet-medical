import { db } from "./index";
import { sql } from "drizzle-orm";

export async function ensureDatabaseSchema() {
  try {
    // 1. Clinic settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clinic_settings (
        id SERIAL PRIMARY KEY,
        clinic_name TEXT NOT NULL DEFAULT 'Cabinet Médical',
        doctor_name TEXT NOT NULL DEFAULT 'Dr. Amine Vance',
        specialty TEXT NOT NULL DEFAULT 'Médecine Générale',
        phone TEXT NOT NULL DEFAULT '05 22 00 00 00',
        email TEXT NOT NULL DEFAULT 'contact@cabinet.com',
        address TEXT NOT NULL DEFAULT '123 Boulevard Zerktouni',
        city TEXT NOT NULL DEFAULT 'Casablanca',
        order_number TEXT DEFAULT 'INPE: 123456789 • Ordre: 9876',
        tax_id TEXT DEFAULT 'ICE: 001234567000089 • IF: 12345678',
        default_fee NUMERIC(10, 2) DEFAULT 250.00,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 2. Insert default settings if empty
    await db.execute(sql`
      INSERT INTO clinic_settings (id, clinic_name, doctor_name, specialty, phone, email, address, city, order_number, tax_id, default_fee)
      SELECT 1, 'Cabinet Médical Dr. Vance', 'Dr. Amine Vance', 'Médecine Générale & Urgences', '05 22 45 67 89', 'contact@medicabinet.ma', '120 Boulevard d''Anfa, 4ème étage', 'Casablanca', 'INPE: 045812903 • Ordre: 14209', 'ICE: 002938475000012 • IF: 45091823', 250.00
      WHERE NOT EXISTS (SELECT 1 FROM clinic_settings WHERE id = 1)
    `);

    // 3. New columns in patients table (each in its own query)
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS cin TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'M'`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS antecedents TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT`);

    // 4. New columns in visits table (each in its own query)
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS blood_pressure TEXT`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS heart_rate INTEGER`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS temperature NUMERIC(4, 1)`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS weight NUMERIC(5, 1)`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS height NUMERIC(5, 1)`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`);

    // 5. New columns in appointments table (each in its own query)
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '09:00'`);
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Consultation générale'`);
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'`);

    // 6. Custom medications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_medications (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        dosage TEXT,
        form TEXT,
        default_instructions TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log("Database schema successfully verified and updated.");
  } catch (error) {
    console.error("Database migration check warning:", error);
    throw error;
  }
}
