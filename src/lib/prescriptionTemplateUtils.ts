import { jsPDF } from "jspdf";
import {
  PrescriptionTemplateLayout,
  DEFAULT_PRESCRIPTION_LAYOUT,
} from "./consultationConfig";

/**
 * Convertit une photo (PNG/JPG/WEBP) OU la page 1 d'un fichier PDF
 * en image haute définition optimisée (Data URL) prête pour l'aperçu,
 * l'impression et le remplissage PDF.
 */
export async function convertFileToTemplateImage(file: File): Promise<string> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return await renderPdfFirstPageToDataUrl(file);
  }

  if (file.type.startsWith("image/")) {
    return await optimizeImageFileToDataUrl(file);
  }

  throw new Error("Format non supporté. Veuillez choisir une image (PNG, JPG, WEBP) ou un fichier PDF.");
}

async function optimizeImageFileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });

  return await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1400;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const targetW = Math.round(img.width * scale);
      const targetH = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas non supporté par votre navigateur."));
        return;
      }

      // Fond blanc pour les PNG transparents
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => reject(new Error("Image invalide ou corrompue."));
    img.src = dataUrl;
  });
}

async function renderPdfFirstPageToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Chargement dynamique de PDF.js uniquement dans le navigateur lors de l'import d'un PDF
  const pdfjsCdn = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";
  const workerCdn = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

  // Import dynamique natif contournant le bundler serveur
  const pdfjsLib: any = await (new Function("u", "return import(u)"))(pdfjsCdn);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerCdn;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const baseViewport = page.getViewport({ scale: 1 });
  const targetWidth = 1400;
  const scale = Math.min(3, Math.max(1.5, targetWidth / baseViewport.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible d'initialiser le rendu PDF.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Génère et télécharge l'ordonnance remplie au format PDF
 * directement dans le template personnalisé du médecin (ou le modèle standard).
 */
export function downloadFilledPrescriptionPdf(params: {
  patient: {
    firstName: string;
    lastName: string;
    age: number;
    cin?: string | null;
    mutuelle?: string | null;
  };
  medicines: { name: string; instructions: string }[];
  date: Date;
  settings?: {
    clinicName?: string;
    doctorName?: string;
    specialty?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    orderNumber?: string | null;
    prescriptionTemplateUrl?: string | null;
    prescriptionTemplateLayout?: PrescriptionTemplateLayout | null;
  } | null;
}) {
  const { patient, medicines, date, settings } = params;
  const templateUrl = settings?.prescriptionTemplateUrl || null;
  const layout: PrescriptionTemplateLayout = {
    ...DEFAULT_PRESCRIPTION_LAYOUT,
    ...(settings?.prescriptionTemplateLayout || {}),
  };

  const paperFormat = templateUrl ? layout.paperSize.toLowerCase() : "a4";
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: paperFormat as "a4" | "a5",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const city = settings?.city?.trim() || "";
  const formattedPlaceDate = city ? `${city}, le ${dateStr}` : `Le ${dateStr}`;

  if (templateUrl) {
    // 1. Fond = Template personnalisé du médecin (Photo ou PDF converti)
    const imgFormat = templateUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(templateUrl, imgFormat, 0, 0, pageW, pageH);

    const ptScale = paperFormat === "a5" ? 0.72 : 0.82;
    const basePt = Math.max(8, Math.round(layout.fontSize * ptScale));

    // 2. Bloc Patient & Date aux coordonnées calibrées
    if (layout.showPatientInfo) {
      const px = (layout.patientLeft / 100) * pageW;
      const py = (layout.patientTop / 100) * pageH;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(basePt);
      doc.text(
        `Patient(e) : ${patient.lastName.toUpperCase()} ${patient.firstName} (${patient.age} ans)`,
        px,
        py
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(Math.max(8, basePt - 1.5));
      doc.setTextColor(51, 65, 85);
      doc.text(formattedPlaceDate, px, py + 5.5);
    }

    // 3. Liste des médicaments remplie dans la zone dédiée
    const mx = (layout.medsLeft / 100) * pageW;
    const maxWidth = pageW - mx - (layout.medsRight / 100) * pageW;
    let currentY = (layout.medsTop / 100) * pageH;

    medicines.forEach((med, index) => {
      if (currentY > pageH - 18) return;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(basePt + 0.5);

      const titleLines = doc.splitTextToSize(
        `${String(index + 1).padStart(2, "0")}. ${med.name.toUpperCase()}`,
        maxWidth
      );
      doc.text(titleLines, mx, currentY);
      currentY += titleLines.length * (basePt * 0.45) + 1.2;

      if (med.instructions) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(Math.max(8, basePt - 1));
        doc.setTextColor(71, 85, 105);
        const instLines = doc.splitTextToSize(med.instructions, maxWidth - 5);
        doc.text(instLines, mx + 5, currentY);
        currentY += instLines.length * (basePt * 0.4) + 4.5;
      } else {
        currentY += 3.5;
      }
    });
  } else {
    // Modèle standard officiel MonCabinet
    const doctorName = settings?.doctorName?.trim() || "";
    const specialty = settings?.specialty?.trim() || "";
    const clinicName = settings?.clinicName?.trim() || "Cabinet Médical";
    const address = settings?.address?.trim() || "";
    const phone = settings?.phone?.trim() || "";
    const orderNumber = settings?.orderNumber?.trim() || "";
    const locationLine = [address, city].filter(Boolean).join(", ");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text((doctorName || clinicName).toUpperCase(), 16, 20);

    let headerY = 26;
    if (specialty) {
      doc.setFontSize(10.5);
      doc.setTextColor(2, 132, 199);
      doc.text(specialty, 16, headerY);
      headerY += 5;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (doctorName && clinicName && clinicName !== doctorName) {
      doc.text(clinicName, 16, headerY);
      headerY += 4.5;
    }
    if (locationLine) {
      doc.text(locationLine, 16, headerY);
      headerY += 4.5;
    }
    if (phone) {
      doc.text(`Tél : ${phone}`, 16, headerY);
      headerY += 4.5;
    }
    if (orderNumber) {
      doc.text(orderNumber, 16, headerY);
      headerY += 4.5;
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(formattedPlaceDate, pageW - 16, 20, { align: "right" });

    const dividerY = Math.max(46, headerY + 2);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(16, dividerY, pageW - 16, dividerY);

    // Cartouche patient
    const boxY = dividerY + 6;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(16, boxY, pageW - 32, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Patient(e) : ${patient.lastName.toUpperCase()} ${patient.firstName}`, 21, boxY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`${patient.age} ans${patient.cin ? ` • CIN : ${patient.cin}` : ""}`, 21, boxY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("ORDONNANCE", pageW / 2, boxY + 31, { align: "center" });

    let y = boxY + 43;
    medicines.forEach((med, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const tLines = doc.splitTextToSize(`${String(i + 1).padStart(2, "0")}. ${med.name.toUpperCase()}`, pageW - 36);
      doc.text(tLines, 18, y);
      y += tLines.length * 5.2 + 1;

      if (med.instructions) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        const iLines = doc.splitTextToSize(med.instructions, pageW - 44);
        doc.text(iLines, 24, y);
        y += iLines.length * 4.6 + 5;
      } else {
        y += 4;
      }
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Signature et Cachet du Médecin", pageW - 55, pageH - 35, { align: "center" });
    doc.setDrawColor(148, 163, 184);
    doc.line(pageW - 82, pageH - 18, pageW - 28, pageH - 18);
  }

  const safeName = `${patient.lastName}_${patient.firstName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const isoDay = date.toISOString().slice(0, 10);
  doc.save(`Ordonnance_${safeName}_${isoDay}.pdf`);
}
