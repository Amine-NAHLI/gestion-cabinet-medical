import { NextRequest, NextResponse } from "next/server";
import { getNeonClusterMetrics } from "@/lib/neonTelemetry";
import { sendNeonTelemetryReportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";
    const urlSecret = req.nextUrl.searchParams.get("key");

    // Sécurisation de l'endpoint : vérifier le token secret si configuré
    if (cronSecret) {
      const isValidBearer = authHeader === `Bearer ${cronSecret}`;
      const isValidParam = urlSecret === cronSecret;
      if (!isValidBearer && !isValidParam && !isVercelCron) {
        return NextResponse.json(
          { error: "Non autorisé. Jeton CRON_SECRET manquant ou invalide." },
          { status: 401 }
        );
      }
    }

    // Récupérer les métriques réelles du cluster Neon PostgreSQL
    const metrics = await getNeonClusterMetrics();

    // Déterminer si le seuil critique de 80% est dépassé
    const isStorageSaturated = metrics.storage.percentUsed >= 80;
    const isComputeSaturated = metrics.compute.percentUsed >= 80;
    const isCritical = isStorageSaturated || isComputeSaturated;

    // Expédier l'email de rapport (ou alerte critique)
    const emailResult = await sendNeonTelemetryReportEmail(metrics, isCritical);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      isCritical,
      saturation: {
        storagePercent: metrics.storage.percentUsed,
        computePercent: metrics.compute.percentUsed,
      },
      emailSent: emailResult.success,
      emailWarning: emailResult.warning,
      metrics: {
        storageUsedMB: metrics.storage.usedMB,
        storageTotalMB: metrics.storage.totalMB,
        computeUsedHours: metrics.compute.usedHours,
        computeMaxHours: metrics.compute.maxHours,
        pingMs: metrics.performance.pingMs,
        cacheHitRatio: metrics.performance.cacheHitRatio,
      },
    });
  } catch (error: any) {
    console.error("[CRON NEON-STATS ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne cron" },
      { status: 500 }
    );
  }
}
