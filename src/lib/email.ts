import { Resend } from "resend";

export interface SendOtpNotificationParams {
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  specialty: string;
  clinicName: string;
  clinicCity: string;
  assistantName?: string | null;
  assistantEmail?: string | null;
  otpCode: string;
  requestId: number;
}

export interface NewRegistrationNotificationParams {
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  specialty: string;
  clinicName: string;
  clinicCity: string;
  clinicAddress?: string | null;
  assistantName?: string | null;
  assistantEmail?: string | null;
  requestId?: number;
}

export async function sendNewRegistrationRequestNotification(params: NewRegistrationNotificationParams) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const receiverEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "nahli-ami@upf.ac.ma";
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXTAUTH_URL || "http://localhost:3000");

  console.log(`[EMAIL] Notification nouvelle inscription pour Dr. ${params.doctorName} (${params.clinicName}) vers ${receiverEmail}...`);

  if (!apiKey) {
    console.warn("[EMAIL WARN] Clé RESEND_API_KEY absente dans .env. La demande est disponible directement sur le Dashboard Super Admin (/admin).");
    return {
      success: false,
      warning: "Clé RESEND_API_KEY manquante dans .env. Demande visible sur /admin.",
    };
  }

  try {
    const resend = new Resend(apiKey);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #334155; }
          .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
          .header { background: linear-gradient(135deg, #070e1c 0%, #0c1f3d 100%); padding: 32px 28px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
          .content { padding: 32px 28px; }
          .badge-alert { display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.5px; }
          .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 18px 0; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .info-table td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; }
          .info-table tr:last-child td { border-bottom: none; }
          .info-table td.label { font-weight: 600; color: #64748b; width: 38%; }
          .info-table td.val { font-weight: 700; color: #0f172a; }
          .btn-container { text-align: center; margin-top: 26px; }
          .btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 13px 30px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.25); }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MonCabinet</h1>
            <p>Nouvelle Demande d'Inscription de Cabinet Médical</p>
          </div>
          <div class="content">
            <span class="badge-alert">✨ Nouvelle Inscription • Délai 24H</span>
            <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.5; color: #334155;">
              Un nouveau médecin a rempli le formulaire d'inscription sur MonCabinet et attend la création et l'activation de son compte sous 24h.
            </p>
            
            <div class="highlight-card">
              <table class="info-table">
                <tr>
                  <td class="label">Médecin Praticien</td>
                  <td class="val">${params.doctorName}</td>
                </tr>
                <tr>
                  <td class="label">Spécialité</td>
                  <td class="val">${params.specialty}</td>
                </tr>
                <tr>
                  <td class="label">Email de Connexion</td>
                  <td class="val"><a href="mailto:${params.doctorEmail}" style="color: #0284c7; text-decoration: none;">${params.doctorEmail}</a></td>
                </tr>
                <tr>
                  <td class="label">Téléphone Portable</td>
                  <td class="val"><a href="tel:${params.doctorPhone}" style="color: #0284c7; text-decoration: none;">${params.doctorPhone}</a></td>
                </tr>
                <tr>
                  <td class="label">Nom du Cabinet</td>
                  <td class="val">${params.clinicName}</td>
                </tr>
                <tr>
                  <td class="label">Ville</td>
                  <td class="val">${params.clinicCity}</td>
                </tr>
                ${params.clinicAddress ? `
                <tr>
                  <td class="label">Adresse</td>
                  <td class="val">${params.clinicAddress}</td>
                </tr>
                ` : ''}
                ${params.assistantName ? `
                <tr>
                  <td class="label">Assistante</td>
                  <td class="val">${params.assistantName} (${params.assistantEmail || 'Sans email'})</td>
                </tr>
                ` : `
                <tr>
                  <td class="label">Assistante</td>
                  <td class="val" style="color: #94a3b8; font-weight: normal;">Aucune assistante renseignée</td>
                </tr>
                `}
              </table>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 14px; line-height: 1.4;">
              Accédez à votre espace Super Admin pour créer son cabinet en 1 clic ou personnaliser son sous-domaine.
            </p>

            <div class="btn-container">
              <a href="${baseUrl}/admin" class="btn" target="_blank">Créer & Activer le Cabinet sur l'Admin</a>
            </div>
          </div>
          <div class="footer">
            MonCabinet Platform • Notification d'inscription sécurisée transmise à l'administrateur
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: receiverEmail,
      subject: `📋 [Nouvelle Inscription] Dr. ${params.doctorName} • ${params.clinicName} (${params.clinicCity})`,
      html: emailHtml,
    });

    if (error) {
      console.error("[RESEND ERROR]", error);
      return { success: false, error: error.message };
    }

    console.log(`[RESEND SUCCESS] Email d'inscription envoyé avec succès à ${receiverEmail}. ID: ${data?.id}`);
    return { success: true, data };
  } catch (err: any) {
    console.error("[EMAIL EXCEPTION]", err);
    return { success: false, error: err.message || "Erreur d'envoi d'email" };
  }
}

export async function sendAdminOtpNotification(params: SendOtpNotificationParams) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const receiverEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "nahli-ami@upf.ac.ma";
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const baseUrl = process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXTAUTH_URL || "http://localhost:3000");

  console.log(`[EMAIL] Préparation envoi OTP ${params.otpCode} pour Dr. ${params.doctorName} vers ${receiverEmail}...`);

  if (!apiKey) {
    console.warn("[EMAIL WARN] Clé RESEND_API_KEY absente dans .env. Le code OTP est disponible directement sur le Dashboard Super Admin (/admin).");
    return {
      success: false,
      warning: "Clé RESEND_API_KEY manquante dans .env. Code visible sur /admin.",
    };
  }

  try {
    const resend = new Resend(apiKey);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #334155; }
          .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
          .header { background: linear-gradient(135deg, #070e1c 0%, #0c1f3d 100%); padding: 32px 28px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
          .content { padding: 32px 28px; }
          .badge-alert { display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
          .otp-box { background: #f8fafc; border: 2px dashed #0284c7; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #0284c7; font-family: monospace; display: block; margin: 8px 0; }
          .otp-timer { font-size: 12px; color: #e11d48; font-weight: 700; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
          .info-table td.label { font-weight: 600; color: #64748b; width: 35%; }
          .info-table td.val { font-weight: 700; color: #0f172a; }
          .btn-container { text-align: center; margin-top: 28px; }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MonCabinet</h1>
            <p>Demande d'Activation de Nouveau Cabinet Médical</p>
          </div>
          <div class="content">
            <span class="badge-alert">Action Requise • Code d'Activation</span>
            <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5;">
              Un nouveau médecin vient de s'inscrire sur la plateforme et attend la validation de son cabinet.
            </p>
            
            <div class="otp-box">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px;">Code de Confirmation (OTP)</span>
              <span class="otp-code">${params.otpCode}</span>
              <span class="otp-timer">⏱️ Valable 5 minutes</span>
            </div>

            <table class="info-table">
              <tr>
                <td class="label">Médecin Praticien</td>
                <td class="val">${params.doctorName} (${params.specialty})</td>
              </tr>
              <tr>
                <td class="label">Téléphone Portable</td>
                <td class="val"><a href="tel:${params.doctorPhone}" style="color: #0284c7; text-decoration: none;">${params.doctorPhone}</a></td>
              </tr>
              <tr>
                <td class="label">Email de Connexion</td>
                <td class="val">${params.doctorEmail}</td>
              </tr>
              <tr>
                <td class="label">Nom du Cabinet</td>
                <td class="val">${params.clinicName} — ${params.clinicCity}</td>
              </tr>
              ${params.assistantName ? `
              <tr>
                <td class="label">Compte Assistante</td>
                <td class="val">${params.assistantName} (${params.assistantEmail || 'Sans email'})</td>
              </tr>
              ` : ''}
            </table>

            <div class="btn-container">
              <a href="${baseUrl}/admin" class="btn" target="_blank">Ouvrir le Panneau Super Admin</a>
            </div>
          </div>
          <div class="footer">
            MonCabinet Platform • Notification sécurisée envoyée à l'administrateur
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: receiverEmail,
      subject: `🔔 [MonCabinet] Code OTP: ${params.otpCode} • Dr. ${params.doctorName} (${params.clinicCity})`,
      html: emailHtml,
    });

    if (error) {
      console.error("[RESEND ERROR]", error);
      return { success: false, error: error.message };
    }

    console.log(`[RESEND SUCCESS] Email envoyé avec succès à ${receiverEmail}. ID: ${data?.id}`);
    return { success: true, data };
  } catch (err: any) {
    console.error("[EMAIL EXCEPTION]", err);
    return { success: false, error: err.message || "Erreur d'envoi d'email" };
  }
}

export interface NeonTelemetryMetrics {
  storage: {
    usedMB: string;
    totalMB: number;
    remainingMB: string;
    percentUsed: number;
    tablesBreakdown?: {
      table: string;
      rowCount: number;
      totalSize: string;
      bytes: number;
    }[];
  };
  compute: {
    maxHours: number;
    usedHours: string;
    remainingHours: string;
    percentUsed: number;
  };
  performance: {
    cacheHitRatio: string;
    activeConnections: number;
    pingMs: number;
    uptime?: string;
    pgVersion?: string;
  };
  timestamp?: string;
}

export async function sendNeonTelemetryReportEmail(
  metrics: NeonTelemetryMetrics,
  isAlert: boolean = false
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const receiverEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "nahli-ami@upf.ac.ma";
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const baseUrl =
    process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
      ? process.env.NEXTAUTH_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!apiKey) {
    console.warn("[EMAIL WARN] Clé RESEND_API_KEY absente. Rapport Neon non envoyé par email.");
    return { success: false, warning: "RESEND_API_KEY manquante" };
  }

  const isCritical = isAlert || metrics.storage.percentUsed >= 80 || metrics.compute.percentUsed >= 80;

  const storageColor =
    metrics.storage.percentUsed >= 80 ? "#ef4444" : metrics.storage.percentUsed >= 60 ? "#f59e0b" : "#10b981";
  const computeColor =
    metrics.compute.percentUsed >= 80 ? "#ef4444" : metrics.compute.percentUsed >= 60 ? "#f59e0b" : "#0284c7";

  const dateFormatted = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormatted = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = isCritical
    ? `⚠️ [ALERTE CRITIQUE] Saturation Neon à ${Math.max(
        metrics.storage.percentUsed,
        metrics.compute.percentUsed
      )}% • MonCabinet`
    : `📊 [MonCabinet] Rapport Quotidien Infrastructure Neon (${timeFormatted})`;

  const topTables = (metrics.storage.tablesBreakdown || []).slice(0, 5);

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070e1a; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25); }
        .header { background: ${isCritical ? "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)" : "linear-gradient(135deg, #070e1c 0%, #0d2847 100%)"}; padding: 32px 28px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 23px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; color: ${isCritical ? "#fecaca" : "#94a3b8"}; }
        .content { padding: 30px 26px; }
        .status-badge { display: inline-block; background-color: ${isCritical ? "#fef2f2" : "#ecfdf5"}; color: ${isCritical ? "#b91c1c" : "#047857"}; border: 1px solid ${isCritical ? "#fecaca" : "#a7f3d0"}; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px; }
        .kpi-grid { display: table; width: 100%; margin-bottom: 20px; }
        .kpi-col { display: table-cell; width: 50%; padding: 6px; box-sizing: border-box; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
        .kpi-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        .progress-bg { background: #e2e8f0; height: 8px; border-radius: 9999px; overflow: hidden; }
        .progress-bar { height: 100%; border-radius: 9999px; }
        .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 10px; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .info-table td, .info-table th { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; }
        .info-table th { font-weight: 700; color: #64748b; font-size: 11px; text-transform: uppercase; background: #f8fafc; }
        .info-table td.val { font-weight: 700; color: #0f172a; text-align: right; }
        .btn-container { text-align: center; margin-top: 28px; }
        .btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 13px 30px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.25); }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isCritical ? "⚠️ ALERTE SATURATION NEON" : "MonCabinet • Télémétrie Neon"}</h1>
          <p>${isCritical ? "Seuil critique atteint ou dépassé (>= 80%)" : "Rapport automatique d'infrastructure & base de données"}</p>
        </div>
        <div class="content">
          <span class="status-badge">
            ${isCritical ? "🔴 Seuil d'Alerte Atteint (Action requise)" : "🟢 Santé Cluster : Excellente (Nominale)"}
          </span>
          <p style="margin: 0 0 18px; font-size: 13px; color: #475569;">
            Rapport généré le <strong>${dateFormatted} à ${timeFormatted}</strong>. Voici l'état de consommation de votre cluster PostgreSQL Serverless Neon :
          </p>

          <!-- GRILLE KPI STOCKAGE & COMPUTE -->
          <div class="kpi-grid">
            <div class="kpi-col">
              <div class="kpi-card">
                <div class="kpi-label">Stockage BDD (1 Go max)</div>
                <div class="kpi-val" style="color: ${storageColor};">${metrics.storage.usedMB} <span style="font-size: 13px; font-weight: 500; color: #64748b;">Mo</span></div>
                <div class="progress-bg">
                  <div class="progress-bar" style="width: ${Math.max(3, metrics.storage.percentUsed)}%; background-color: ${storageColor};"></div>
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                  <strong>${metrics.storage.percentUsed}%</strong> utilisé (${metrics.storage.remainingMB} Mo libres)
                </div>
              </div>
            </div>

            <div class="kpi-col">
              <div class="kpi-card">
                <div class="kpi-label">Calcul CU-h (100h max)</div>
                <div class="kpi-val" style="color: ${computeColor};">${metrics.compute.usedHours} <span style="font-size: 13px; font-weight: 500; color: #64748b;">CU-h</span></div>
                <div class="progress-bg">
                  <div class="progress-bar" style="width: ${Math.max(3, metrics.compute.percentUsed)}%; background-color: ${computeColor};"></div>
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                  <strong>${metrics.compute.percentUsed}%</strong> consommé (${metrics.compute.remainingHours} CU-h restantes)
                </div>
              </div>
            </div>
          </div>

          <!-- PERFORMANCES ET SANTÉ -->
          <div class="section-title">Performances & Disponibilité</div>
          <table class="info-table" style="margin-bottom: 18px;">
            <tr>
              <td>Cache Hit Ratio (Mémoire)</td>
              <td class="val">${metrics.performance.cacheHitRatio}%</td>
            </tr>
            <tr>
              <td>Latence Ping (Aller-retour)</td>
              <td class="val">${metrics.performance.pingMs} ms</td>
            </tr>
            <tr>
              <td>Connexions actives</td>
              <td class="val">${metrics.performance.activeConnections} active(s)</td>
            </tr>
            <tr>
              <td>Moteur & Version</td>
              <td class="val">${metrics.performance.pgVersion || "PostgreSQL 16 (Neon Serverless)"}</td>
            </tr>
            ${metrics.performance.uptime ? `
            <tr>
              <td>Disponibilité Instance</td>
              <td class="val">${metrics.performance.uptime}</td>
            </tr>
            ` : ""}
          </table>

          <!-- TOP 5 TABLES -->
          ${topTables.length > 0 ? `
          <div class="section-title">Top 5 des tables les plus volumineuses</div>
          <table class="info-table">
            <thead>
              <tr>
                <th>Table</th>
                <th style="text-align: right;">Lignes</th>
                <th style="text-align: right;">Taille Totale</th>
              </tr>
            </thead>
            <tbody>
              ${topTables.map(t => `
                <tr>
                  <td style="font-family: monospace; font-size: 12px; color: #0369a1; font-weight: 600;">${t.table}</td>
                  <td style="text-align: right; color: #64748b;">${t.rowCount.toLocaleString('fr-FR')}</td>
                  <td class="val">${t.totalSize}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ` : ""}

          <div class="btn-container">
            <a href="${baseUrl}/admin" class="btn" target="_blank">Ouvrir le Tableau de bord Admin</a>
          </div>
        </div>
        <div class="footer">
          MonCabinet Infrastructure Monitor • Surveillance automatisée Neon PostgreSQL
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: receiverEmail,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error("[RESEND NEON TELEMETRY ERROR]", error);
      return { success: false, error: error.message };
    }

    console.log(`[RESEND NEON TELEMETRY SUCCESS] Rapport envoyé à ${receiverEmail}. ID: ${data?.id}`);
    return { success: true, data };
  } catch (err: any) {
    console.error("[RESEND NEON TELEMETRY EXCEPTION]", err);
    return { success: false, error: err.message || "Erreur d'envoi d'email" };
  }
}
