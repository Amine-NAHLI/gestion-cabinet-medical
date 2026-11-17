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

export async function sendAdminOtpNotification(params: SendOtpNotificationParams) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const receiverEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "nahli-ami@upf.ac.ma";
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

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
