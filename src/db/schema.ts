import { pgTable, text, serial, timestamp, integer, json, boolean, decimal } from "drizzle-orm/pg-core";

// Clinics table (Multi-Tenancy)
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(), // Identifiant sous-domaine unique (ex: 'dr-amine', 'amine')
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"), // Logo personnalisé du cabinet (Data URL ou lien)
  primaryColor: text("primary_color").default("#0f172a"), // Couleur d'accentuation du cabinet
  isCommunityMember: boolean("is_community_member").default(false).notNull(), // Accord réseau médical
  quickMessagesDoctor: json("quick_messages_doctor"), // Raccourcis personnalisés médecin (ex: ['Faites entrer le patient'])
  quickMessagesAssistant: json("quick_messages_assistant"), // Raccourcis personnalisés assistante
  status: text("status").notNull().default("active"), // 'active', 'suspended'
  plan: text("plan").default("pro").notNull(), // 'standard' | 'pro'
  billingCycle: text("billing_cycle").default("monthly").notNull(), // 'monthly' | 'quarterly' | 'yearly'
  planPrice: integer("plan_price").default(250).notNull(), // Montant en DH
  subscriptionExpiresAt: timestamp("subscription_expires_at"), // Échéance de l'abonnement
  subscriptionStatus: text("subscription_status").default("active").notNull(), // 'active', 'trial', 'expired'
  pendingPlanChange: json("pending_plan_change"), // Demande de changement d'abonnement en attente de validation admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table (Doctor, Assistant & Super Admin)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "set null" }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'superadmin' | 'doctor' | 'assistant'
  name: text("name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"), // Photo de profil praticien ou assistante
  bio: text("bio"), // Courte présentation confraternelle
  isOnboarded: boolean("is_onboarded").default(false).notNull(), // A complété le parcours d'accueil
  notificationPreferences: json("notification_preferences"), // Préférences alertes & notifications
  status: text("status").notNull().default("active"), // 'active', 'suspended'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Onboarding Requests table (Doctor sign-up + 6-digit OTP with 5 min TTL)
export const onboardingRequests = pgTable("onboarding_requests", {
  id: serial("id").primaryKey(),
  clinicName: text("clinic_name").notNull(),
  clinicCity: text("clinic_city").notNull(),
  clinicAddress: text("clinic_address"),
  
  doctorName: text("doctor_name").notNull(),
  doctorEmail: text("doctor_email").notNull(),
  doctorPassword: text("doctor_password").notNull(), // Hash bcrypt
  doctorPhone: text("doctor_phone").notNull(),
  specialty: text("specialty").notNull(),
  
  assistantName: text("assistant_name"),
  assistantEmail: text("assistant_email"),
  assistantPassword: text("assistant_password"), // Hash bcrypt
  
  otpCode: text("otp_code").notNull(), // Code 6 chiffres
  expiresAt: timestamp("expires_at").notNull(), // Date.now() + 5 minutes
  status: text("status").notNull().default("pending"), // 'pending', 'verified', 'approved', 'expired', 'rejected'
  attempts: integer("attempts").default(0).notNull(), // Limité à 5 tentatives
  selectedPlan: text("selected_plan").default("pro"), // 'standard' | 'pro'
  selectedCycle: text("selected_cycle").default("monthly"), // 'monthly' | 'quarterly' | 'yearly'
  selectedPrice: integer("selected_price").default(250), // DH
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clinic Settings table (Dynamic branding, doctor info, address, tax IDs)
export const clinicSettings = pgTable("clinic_settings", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
  clinicName: text("clinic_name").notNull().default("Cabinet Médical"),
  doctorName: text("doctor_name").notNull().default(""),
  specialty: text("specialty").notNull().default("Médecine Générale"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  orderNumber: text("order_number").default(""),
  taxId: text("tax_id").default(""),
  defaultFee: decimal("default_fee", { precision: 10, scale: 2 }).default("250.00"),
  consultationFields: json("consultation_fields"), // Custom doctor form builder fields
  prescriptionTemplateUrl: text("prescription_template_url"), // Uploaded photo/PDF rendered as data URL
  prescriptionTemplateName: text("prescription_template_name"), // Original file name
  prescriptionTemplateLayout: json("prescription_template_layout"), // Calibration coordinates & paper size
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Patients table (Permanent Patient Record / Dossier Médical Partagé)
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  age: integer("age").notNull(),
  mutuelle: text("mutuelle"), // CNSS, CNOPS, Saham, RMA, AXA, etc.
  cin: text("cin"), // Carte d'Identité Nationale (e.g. BE123456)
  gender: text("gender").default("M"), // 'M' | 'F'
  bloodGroup: text("blood_group"), // A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies: text("allergies"), // e.g. Pénicilline, Aspirine, etc.
  antecedents: text("antecedents"), // e.g. Diabète type 2, HTA, Asthme, etc.
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Visits table (The core table for consultations & records)
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  status: text("status").notNull().default("waiting"), // 'waiting', 'ready', 'consulting', 'finished', 'cancelled'
  isAppointment: boolean("is_appointment").default(false).notNull(),
  
  // Medical Info (filled by doctor)
  disease: text("disease"),
  diagnosis: text("diagnosis"),
  notes: text("notes"),

  // Clinical Vitals
  bloodPressure: text("blood_pressure"), // e.g. "12/8"
  heartRate: integer("heart_rate"), // e.g. 72 bpm
  temperature: decimal("temperature", { precision: 4, scale: 1 }), // e.g. 37.2 °C
  weight: decimal("weight", { precision: 5, scale: 1 }), // e.g. 70.5 kg
  height: decimal("height", { precision: 5, scale: 1 }), // e.g. 175 cm
  customData: json("custom_data"), // Custom doctor consultation fields snapshot
  
  // Financial Info (filled by doctor, received by assistant)
  amountToPay: decimal("amount_to_pay", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid'
  paymentMethod: text("payment_method").default("cash"), // 'cash', 'card', 'check', 'insurance', 'free'
  paidAt: timestamp("paid_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
  visitId: integer("visit_id").references(() => visits.id, { onDelete: "cascade" }).notNull(),
  medicines: json("medicines").notNull(), // Array of { name, instructions }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointments table (Future & Scheduled appointments)
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  time: text("time").default("09:00"), // e.g. "10:30"
  reason: text("reason").default("Consultation générale"),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'admitted', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom Clinic Medications table (Persisted for the entire practice)
export const customMedications = pgTable("custom_medications", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  form: text("form"),
  defaultInstructions: text("default_instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clinic Messages table (Live interphone chat between Doctor & Assistant in the same clinic)
export const clinicMessages = pgTable("clinic_messages", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull(), // 'doctor' | 'assistant'
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Community Posts table (Feed / Blog / Clinical cases & peer requests strictly for doctors)
export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").references(() => clinics.id, { onDelete: "cascade" }).notNull(),
  authorDoctorId: integer("author_doctor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  authorName: text("author_name").notNull(),
  authorSpecialty: text("author_specialty").notNull(),
  authorCity: text("author_city").notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  category: text("category").notNull().default("general"), // 'general', 'cas_clinique', 'remplacement', 'orientation', 'materiel'
  title: text("title").notNull(),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Community Messages table (Private 1-on-1 WhatsApp-style chat between doctors in the network)
export const communityMessages = pgTable("community_messages", {
  id: serial("id").primaryKey(),
  senderDoctorId: integer("sender_doctor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverDoctorId: integer("receiver_doctor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Platform Settings table (Global Admin Settings: WhatsApp support, emails, hotline)
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  supportWhatsapp: text("support_whatsapp").default("+212600000000").notNull(),
  supportWhatsappMessage: text("support_whatsapp_message")
    .default("Bonjour, je vous contacte concernant l'abonnement de mon cabinet MonCabinet.")
    .notNull(),
  supportEmail: text("support_email").default("contact@toncabinet.me").notNull(),
  supportPhone: text("support_phone").default("+212600000000"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
