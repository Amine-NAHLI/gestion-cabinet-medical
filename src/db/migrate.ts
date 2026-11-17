import { db } from "./index";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function ensureDatabaseSchema() {
  try {
    // 0. Clinics table (Multi-Tenancy)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clinics (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Insert Default Clinic 1 if not exists
    await db.execute(sql`
      INSERT INTO clinics (id, name, city, address, phone, status)
      SELECT 1, 'Cabinet Médical Dr. Vance', 'Casablanca', '120 Boulevard d''Anfa, 4ème étage', '05 22 45 67 89', 'active'
      WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE id = 1)
    `);

    // Synchronize sequence for clinics table
    await db.execute(sql`
      SELECT setval(pg_get_serial_sequence('clinics', 'id'), (SELECT COALESCE(MAX(id), 1) FROM clinics))
    `);

    // 0.1 Onboarding Requests table (Doctor Registration & 6-digit OTP)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS onboarding_requests (
        id SERIAL PRIMARY KEY,
        clinic_name TEXT NOT NULL,
        clinic_city TEXT NOT NULL,
        clinic_address TEXT,
        doctor_name TEXT NOT NULL,
        doctor_email TEXT NOT NULL,
        doctor_password TEXT NOT NULL,
        doctor_phone TEXT NOT NULL,
        specialty TEXT NOT NULL,
        assistant_name TEXT,
        assistant_email TEXT,
        assistant_password TEXT,
        otp_code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 0.2 Users table alterations (clinic_id, phone, status)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);

    // Set clinic_id = 1 for existing doctor and assistant
    await db.execute(sql`UPDATE users SET clinic_id = 1 WHERE clinic_id IS NULL AND role != 'superadmin'`);

    // 0.3 Ensure Super Admin account exists (nahliamine95@gmail.com)
    const superAdminHash = await bcrypt.hash("nahliamine95@gmail.com", 10);
    await db.execute(sql`
      INSERT INTO users (email, password, role, name, phone, status)
      VALUES ('nahliamine95@gmail.com', ${superAdminHash}, 'superadmin', 'Amine Nahli (Super Admin)', '0627135764', 'active')
      ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'active'
    `);

    // 1. Clinic settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clinic_settings (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
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

    // Add clinic_id to clinic_settings if it existed previously
    await db.execute(sql`ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE`);
    await db.execute(sql`UPDATE clinic_settings SET clinic_id = 1 WHERE clinic_id IS NULL`);

    // 2. Insert default settings if empty
    await db.execute(sql`
      INSERT INTO clinic_settings (id, clinic_id, clinic_name, doctor_name, specialty, phone, email, address, city, order_number, tax_id, default_fee)
      SELECT 1, 1, 'Cabinet Médical Dr. Vance', 'Dr. Amine Vance', 'Médecine Générale & Urgences', '05 22 45 67 89', 'contact@medicabinet.ma', '120 Boulevard d''Anfa, 4ème étage', 'Casablanca', 'INPE: 045812903 • Ordre: 14209', 'ICE: 002938475000012 • IF: 45091823', 250.00
      WHERE NOT EXISTS (SELECT 1 FROM clinic_settings WHERE id = 1)
    `);

    // Synchronize sequence for clinic_settings table
    await db.execute(sql`
      SELECT setval(pg_get_serial_sequence('clinic_settings', 'id'), (SELECT COALESCE(MAX(id), 1) FROM clinic_settings))
    `);

    // 3. New columns in patients table
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS cin TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'M'`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS antecedents TEXT`);
    await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT`);
    await db.execute(sql`UPDATE patients SET clinic_id = 1 WHERE clinic_id IS NULL`);

    // 4. New columns in visits table
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS blood_pressure TEXT`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS heart_rate INTEGER`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS temperature NUMERIC(4, 1)`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS weight NUMERIC(5, 1)`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS height NUMERIC(5, 1)`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'`);
    await db.execute(sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`);
    await db.execute(sql`UPDATE visits SET clinic_id = 1 WHERE clinic_id IS NULL`);

    // 5. New columns in appointments table
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '09:00'`);
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Consultation générale'`);
    await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'`);
    await db.execute(sql`UPDATE appointments SET clinic_id = 1 WHERE clinic_id IS NULL`);

    // 5.1 Prescriptions table
    await db.execute(sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE`);
    await db.execute(sql`UPDATE prescriptions SET clinic_id = 1 WHERE clinic_id IS NULL`);

    // 6. Custom medications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_medications (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        dosage TEXT,
        form TEXT,
        default_instructions TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE custom_medications ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE`);
    await db.execute(sql`UPDATE custom_medications SET clinic_id = 1 WHERE clinic_id IS NULL`);

    console.log("Database schema successfully verified, migrated and seeded with Super Admin.");
  } catch (error) {
    console.error("Database migration check warning:", error);
    throw error;
  }
}
