"use client";

import React, { useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ClinicInfo = {
  clinicName?: string | null;
  doctorName?: string | null;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  orderNumber?: string | null;
  taxId?: string | null;
};

export type VisitData = {
  id: number;
  amountToPay: number;
  hasCustomAmount?: boolean;
  createdAt: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  patientAge: number;
  patientFirstName?: string;
  patientLastName?: string;
  disease?: string | null;
  diagnosis?: string | null;
  paymentStatus?: string;
  status?: string;
};

function formatPdfNumber(value: number): string {
  return value.toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');
}

export default function StatsCharts({
  rawVisits,
  clinicInfo,
}: {
  rawVisits: VisitData[];
  clinicInfo?: ClinicInfo | null;
}) {
  // Déterminer la période initiale : si aucune visite cette semaine, ouvrir sur 'all' pour afficher l'historique complet
  const initialPeriod = useMemo<'day' | 'week' | 'month' | 'all'>(() => {
    const now = new Date();
    const last7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const hasRecent = rawVisits.some(v => new Date(v.paidAt || v.createdAt) >= last7Days);
    return hasRecent ? 'week' : 'all';
  }, [rawVisits]);

  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>(initialPeriod);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Filtrer les consultations selon la période sélectionnée (en prenant en compte la date de paiement ou de visite)
  const filteredVisits = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return rawVisits.filter(v => {
      const visitDate = new Date(v.paidAt || v.createdAt);
      if (period === 'day') {
        return visitDate >= today;
      } else if (period === 'week') {
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 6);
        return visitDate >= last7Days;
      } else if (period === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return visitDate >= startOfMonth;
      }
      return true; // 'all'
    });
  }, [rawVisits, period]);

  // 2. Indicateurs Clés de Performance (KPIs)
  const statsSummary = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const paidVisits = filteredVisits.filter(v => v.paymentStatus === 'paid');
    const pendingVisits = filteredVisits.filter(v => v.paymentStatus !== 'paid');

    const totalCollected = paidVisits.reduce((sum, v) => sum + v.amountToPay, 0);
    const totalPending = pendingVisits.reduce((sum, v) => sum + v.amountToPay, 0);

    const paidWithFee = paidVisits.filter(v => v.amountToPay > 0);
    const averageFee = paidWithFee.length > 0 ? Math.round(totalCollected / paidWithFee.length) : 0;
    const paymentRate = totalVisits > 0 ? Math.round((paidVisits.length / totalVisits) * 100) : 100;

    return {
      totalVisits,
      paidCount: paidVisits.length,
      pendingCount: pendingVisits.length,
      totalCollected,
      totalPending,
      averageFee,
      paymentRate
    };
  }, [filteredVisits]);

  // 3. Graphique 1 : Évolution Temporelle Réelle et Continue du Revenu
  const revenueTimelineOptions = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const dateMap: Record<string, number> = {};

    if (period === 'week') {
      // Générer les 7 jours consécutifs jusqu'à aujourd'hui
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        labels.push(key);
        dateMap[key] = 0;
      }

      // Sommer les revenus payés
      filteredVisits.forEach(v => {
        if (v.paymentStatus === 'paid') {
          const effectiveDate = new Date(v.paidAt || v.createdAt);
          const key = effectiveDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          if (dateMap[key] !== undefined) {
            dateMap[key] += v.amountToPay;
          }
        }
      });
    } else if (period === 'day') {
      // Heures de la journée (8h à 20h)
      const hours = ['08h', '10h', '12h', '14h', '16h', '18h', '20h'];
      hours.forEach(h => {
        labels.push(h);
        dateMap[h] = 0;
      });

      filteredVisits.forEach(v => {
        if (v.paymentStatus === 'paid') {
          const effectiveDate = new Date(v.paidAt || v.createdAt);
          const hour = effectiveDate.getHours();
          const bucket = hours.find(h => parseInt(h) >= hour) || '20h';
          dateMap[bucket] = (dateMap[bucket] || 0) + v.amountToPay;
        }
      });
    } else if (period === 'month') {
      // Du 1er du mois à aujourd'hui
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysCount = now.getDate();
      for (let day = 1; day <= daysCount; day++) {
        const d = new Date(start.getFullYear(), start.getMonth(), day);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        labels.push(key);
        dateMap[key] = 0;
      }

      filteredVisits.forEach(v => {
        if (v.paymentStatus === 'paid') {
          const effectiveDate = new Date(v.paidAt || v.createdAt);
          const key = effectiveDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          if (dateMap[key] !== undefined) {
            dateMap[key] += v.amountToPay;
          }
        }
      });
    } else {
      // 'all' : Grouper par date réelle
      filteredVisits.forEach(v => {
        if (v.paymentStatus === 'paid') {
          const effectiveDate = new Date(v.paidAt || v.createdAt);
          const key = effectiveDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          dateMap[key] = (dateMap[key] || 0) + v.amountToPay;
        }
      });
      Object.keys(dateMap).forEach(k => labels.push(k));
      if (labels.length === 0) {
        labels.push("Historique");
        dateMap["Historique"] = 0;
      }
    }

    const dataSeries = labels.map(l => dateMap[l] || 0);

    return {
      tooltip: { 
        trigger: 'axis', 
        formatter: '{b} : <b>{c} DH</b>',
        backgroundColor: '#0f172a',
        textStyle: { color: '#ffffff', fontSize: 12 }
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '12%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: labels,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 11, fontWeight: '500' },
        axisTick: { show: false }
      },
      yAxis: { 
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: '{value} DH' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
      },
      series: [{
        data: dataSeries,
        type: 'line',
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        itemStyle: { color: '#0ea5e9', borderWidth: 2, borderColor: '#ffffff' },
        lineStyle: { width: 3, color: '#0ea5e9' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14, 165, 233, 0.35)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0.0)' }
            ]
          }
        }
      }]
    };
  }, [filteredVisits, period]);

  // 4. Graphique 2 : Motifs & Pathologies Fréquentes (Intelligence Médicale)
  const diseaseDistributionOptions = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredVisits.forEach(v => {
      const reason = (v.disease || "Médecine Générale").trim();
      counts[reason] = (counts[reason] || 0) + 1;
    });

    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const categories = sortedEntries.map(e => e[0]);
    const values = sortedEntries.map(e => e[1]);

    if (categories.length === 0) {
      categories.push("Aucune consultation");
      values.push(0);
    }

    return {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = params[0];
          return `<b>${item.name}</b><br/>Consultations : <b>${item.value}</b>`;
        }
      },
      grid: { left: '3%', right: '8%', bottom: '5%', top: '8%', containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#475569', fontWeight: 'bold', fontSize: 11 }
      },
      series: [{
        type: 'bar',
        data: values,
        barWidth: '40%',
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#8b5cf6' }
            ]
          }
        }
      }]
    };
  }, [filteredVisits]);

  // 5. Graphique 3 : Répartition Démographique par Tranches d'Âge
  const ageOptions = useMemo(() => {
    let pediatrics = 0; // < 12 ans
    let teens = 0;      // 12 - 17 ans
    let adults = 0;     // 18 - 59 ans
    let seniors = 0;    // 60+ ans

    filteredVisits.forEach(v => {
      const age = v.patientAge || 0;
      if (age < 12) pediatrics++;
      else if (age < 18) teens++;
      else if (age < 60) adults++;
      else seniors++;
    });

    const data = [
      { name: 'Pédiatrie (< 12 ans)', value: pediatrics },
      { name: 'Adolescents (12-17 ans)', value: teens },
      { name: 'Adultes (18-59 ans)', value: adults },
      { name: 'Seniors (60+ ans)', value: seniors }
    ].filter(d => d.value > 0);

    return {
      tooltip: { 
        trigger: 'item', 
        formatter: '{b} : <b>{c} patient(s)</b> ({d}%)' 
      },
      legend: { 
        bottom: '0%', 
        left: 'center', 
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 11 }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: '#ffffff', borderWidth: 2 },
        color: ['#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6'],
        data: data.length > 0 ? data : [{ name: 'Aucune donnée', value: 0 }]
      }]
    };
  }, [filteredVisits]);

  // 6. Export PDF Professionnel (Facture / Relevé Global Haute Définition)
  const exportPDF = () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Palette Couleurs Exécutive
      const primaryNavy = [15, 23, 42]; // #0f172a
      const accentEmerald = [5, 150, 105]; // #059669
      const accentSky = [2, 132, 199]; // #0284c7

      // 1. Bandeau supérieur d'accentuation haute définition
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 4, 'F');
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 4, pageWidth, 1.2, 'F');

      const clinicTitle = clinicInfo?.clinicName?.trim() || "Cabinet Médical";
      const doctorName = clinicInfo?.doctorName?.trim() || "";
      const specialty = clinicInfo?.specialty?.trim() || "";
      const addressCity = [clinicInfo?.address?.trim(), clinicInfo?.city?.trim()]
        .filter(Boolean)
        .join(", ");
      const contactParts = [
        clinicInfo?.phone?.trim() ? `Tél : ${clinicInfo.phone.trim()}` : "",
        clinicInfo?.email?.trim() || "",
      ].filter(Boolean);
      const fiscalParts = [
        clinicInfo?.orderNumber?.trim() ? `N° Ordre : ${clinicInfo.orderNumber.trim()}` : "",
        clinicInfo?.taxId?.trim() ? `IF : ${clinicInfo.taxId.trim()}` : "",
      ].filter(Boolean);

      // 2. En-tête Cabinet & Praticien (Gauche)
      const startY = 14;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(clinicTitle, 105);
      doc.text(titleLines, 14, startY);

      let infoY = startY + titleLines.length * 5;
      const doctorSpecLine = [doctorName ? `Dr. ${doctorName}` : "", specialty].filter(Boolean).join(" • ");
      if (doctorSpecLine) {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(2, 132, 199);
        const lines = doc.splitTextToSize(doctorSpecLine, 105);
        doc.text(lines, 14, infoY);
        infoY += lines.length * 4.2;
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      if (addressCity) {
        const lines = doc.splitTextToSize(addressCity, 105);
        doc.text(lines, 14, infoY);
        infoY += lines.length * 3.8;
      }
      if (contactParts.length > 0) {
        const lines = doc.splitTextToSize(contactParts.join("  |  "), 105);
        doc.text(lines, 14, infoY);
        infoY += lines.length * 3.8;
      }
      if (fiscalParts.length > 0) {
        const lines = doc.splitTextToSize(fiscalParts.join("  |  "), 105);
        doc.text(lines, 14, infoY);
        infoY += lines.length * 3.8;
      }

      // 3. Cartouche officiel du document (Droite)
      const periodLabelMap: Record<string, string> = {
        day: "Aujourd'hui",
        week: "7 derniers jours",
        month: "Ce mois en cours",
        all: "Historique global",
      };

      const invoiceBoxX = 124;
      const invoiceBoxW = 72;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(invoiceBoxX, startY - 2, invoiceBoxW, 30, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("BILAN FINANCIER & ACTIVITÉ", invoiceBoxX + 4, startY + 4);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      const invoiceNum = `FAC-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      doc.text(`RÉF : ${invoiceNum}`, invoiceBoxX + 4, startY + 9.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const now = new Date();
      doc.text(`Édité le : ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, invoiceBoxX + 4, startY + 15);
      doc.text(`Période : ${periodLabelMap[period]}`, invoiceBoxX + 4, startY + 20);
      doc.text(`Actes recensés : ${statsSummary.totalVisits} consultation(s)`, invoiceBoxX + 4, startY + 25);

      // 4. Ligne de séparation élégante
      const sepY = Math.max(startY + 32, infoY + 2);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, sepY, pageWidth - 14, sepY);

      // 5. Blocs KPI Exécutifs
      const kpiY = sepY + 4;
      const colW = (pageWidth - 28 - 8) / 3;

      // KPI 1 : Consultations
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, kpiY, colW, 16, 2, 2, 'FD');
      doc.setFillColor(100, 116, 139);
      doc.rect(14, kpiY + 2, 1.2, 12, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text("CONSULTATIONS RÉALISÉES", 18, kpiY + 5);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${statsSummary.totalVisits} acte(s)`, 18, kpiY + 11.5);

      // KPI 2 : Total Net Encaissé (Émeraude)
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(14 + colW + 4, kpiY, colW, 16, 2, 2, 'FD');
      doc.setFillColor(5, 150, 105);
      doc.rect(14 + colW + 4, kpiY + 2, 1.2, 12, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text("TOTAL NET ENCAISSÉ", 18 + colW + 4, kpiY + 5);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(`${formatPdfNumber(statsSummary.totalCollected)} DH`, 18 + colW + 4, kpiY + 11.5);

      // KPI 3 : Tarif Moyen / Acte (Bleu Ciel)
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
      doc.roundedRect(14 + (colW + 4) * 2, kpiY, colW, 16, 2, 2, 'FD');
      doc.setFillColor(2, 132, 199);
      doc.rect(14 + (colW + 4) * 2, kpiY + 2, 1.2, 12, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      doc.text("HONORAIRE MOYEN / ACTE", 18 + (colW + 4) * 2, kpiY + 5);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(3, 105, 161);
      doc.text(`${formatPdfNumber(statsSummary.averageFee)} DH`, 18 + (colW + 4) * 2, kpiY + 11.5);

      // 6. Tableau détaillé des prestations
      const tableData = filteredVisits.map((v, idx) => {
        const d = new Date(v.createdAt);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const patientName = [v.patientLastName, v.patientFirstName].filter(Boolean).join(' ').toUpperCase() || `Patient #${v.id}`;
        const ageStr = v.patientAge ? `${v.patientAge} ans` : "—";
        const motiveStr = v.disease || "Consultation médicale standard";
        const isPaid = v.paymentStatus === 'paid';
        const methodStr = v.paymentMethod === 'card' ? 'Carte' : v.paymentMethod === 'check' ? 'Chèque' : v.paymentMethod === 'insurance' ? 'Mutuelle' : 'Espèces';
        const amountStr = v.amountToPay > 0 ? `${formatPdfNumber(v.amountToPay)} DH` : "0 DH";

        return [
          String(idx + 1).padStart(2, '0'),
          `${dateStr}\n${timeStr}`,
          patientName,
          ageStr,
          motiveStr,
          isPaid ? `PAYÉ (${methodStr})` : "EN ATTENTE",
          amountStr,
        ];
      });

      autoTable(doc, {
        startY: kpiY + 21,
        margin: { left: 14, right: 14 },
        head: [["N°", "Date & Heure", "Patient", "Âge", "Motif de Consultation", "Règlement", "Montant"]],
        body: tableData.length > 0 ? tableData : [["—", "—", "Aucune consultation enregistrée sur la période", "—", "—", "—", "0.00 DH"]],
        foot: [
          [
            {
              content: "TOTAL DES ENCAISSEMENTS (NET) :",
              colSpan: 6,
              styles: { halign: "right", fontStyle: "bold", fontSize: 8, textColor: [15, 23, 42], fillColor: [241, 245, 249] },
            },
            {
              content: `${formatPdfNumber(statsSummary.totalCollected)} DH`,
              styles: { halign: "right", fontStyle: "bold", fontSize: 9, textColor: [4, 120, 87], fillColor: [236, 253, 245] },
            },
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 41, 59],
          cellPadding: 2.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 9, halign: "center" },
          1: { cellWidth: 26, fontSize: 6.5 },
          2: { cellWidth: 44, fontStyle: "bold" },
          3: { cellWidth: 13, halign: "center" },
          4: { cellWidth: 46 },
          5: { cellWidth: 24, halign: "center", fontStyle: "bold", fontSize: 6.5 },
          6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
        },
      });

      // 7. Ventilation des règlements & Attestation de clôture
      const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
      const bottomY = finalY > pageHeight - 48 ? 20 : finalY;
      if (finalY > pageHeight - 48) {
        doc.addPage();
      }

      // Ventilation par mode de règlement
      const cashTotal = filteredVisits.filter(v => v.paymentMethod === 'cash' && v.paymentStatus === 'paid').reduce((acc, v) => acc + (v.amountToPay || 0), 0);
      const cardTotal = filteredVisits.filter(v => v.paymentMethod === 'card' && v.paymentStatus === 'paid').reduce((acc, v) => acc + (v.amountToPay || 0), 0);
      const checkTotal = filteredVisits.filter(v => v.paymentMethod === 'check' && v.paymentStatus === 'paid').reduce((acc, v) => acc + (v.amountToPay || 0), 0);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, bottomY, 114, 11, 1.5, 1.5, 'FD');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text("RÉPARTITION :", 17, bottomY + 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`Espèces : ${formatPdfNumber(cashTotal)} DH  •  Carte : ${formatPdfNumber(cardTotal)} DH  •  Chèque : ${formatPdfNumber(checkTotal)} DH`, 38, bottomY + 6.5);

      // Texte d'attestation légale
      const certifY = bottomY + 16;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("Arrêté le présent relevé officiel à la somme nette perçue de :", 14, certifY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatPdfNumber(statsSummary.totalCollected)} Dirhams Marocains.`, 14, certifY + 5);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text("Document certifié conforme aux consultations enregistrées sur la plateforme MonCabinet.", 14, certifY + 10);

      // Cadre de Cachet & Signature Professionnel
      const stampX = pageWidth - 68;
      const stampW = 54;
      const stampH = 26;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(stampX, certifY - 3, stampW, stampH, 2, 2, 'FD');
      // Deuxième bordure intérieure fine
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(stampX + 1.5, certifY - 1.5, stampW - 3, stampH - 3, 1.5, 1.5, 'S');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text("Cachet Médical & Signature", stampX + stampW / 2, certifY + 3.5, { align: "center" });

      if (doctorName) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(203, 213, 225);
        doc.text(`Dr. ${doctorName}`, stampX + stampW / 2, certifY + 14, { align: "center" });
      }

      // 8. Pied de page discret sur la page courante
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text("MonCabinet Platform • Document confidentiel à usage interne et comptable", 14, pageHeight - 8);
      doc.text(`Page 1/1 • Imprimé le ${now.toLocaleDateString('fr-FR')}`, pageWidth - 14, pageHeight - 8, { align: "right" });

      doc.save(`Releve_Activite_${period}_${now.toISOString().split("T")[0]}.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erreur génération PDF:", err);
      alert("Erreur lors de la génération du PDF: " + msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Barre de Contrôle des Périodes & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:flex bg-slate-100 p-1 rounded-lg border border-slate-200/80 w-full sm:w-auto gap-1">
          {[
            { id: 'day', label: "Aujourd'hui" },
            { id: 'week', label: "7 jours" },
            { id: 'month', label: "Ce mois" },
            { id: 'all', label: "Tout" }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id as any)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                period === p.id
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={exportPDF}
          disabled={isExporting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs transition disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isExporting ? 'hourglass_empty' : 'picture_as_pdf'}
          </span>
          <span>{isExporting ? 'Génération...' : 'Exporter le bilan PDF'}</span>
        </button>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* 2. Bandeau KPI unifié (2x2 sur mobile, 4x1 sur desktop) */}
        <div className="bg-slate-200/80 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px">
          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Total encaissé</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {statsSummary.totalCollected.toLocaleString('fr-FR')}{" "}
              <span className="text-xs font-normal text-slate-500">DH</span>
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Consultations</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {statsSummary.totalVisits}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Tarif moyen</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {statsSummary.averageFee}{" "}
              <span className="text-xs font-normal text-slate-500">DH</span>
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Taux de règlement</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">
              {statsSummary.paymentRate}%
            </p>
          </div>
        </div>

        {/* 3. Graphiques d'Activité & de Pathologie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Évolution des encaissements</h2>
                <p className="text-xs text-slate-500 mt-0.5">Recettes perçues sur la période.</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                {statsSummary.totalCollected.toLocaleString('fr-FR')} DH
              </span>
            </div>
            <div className="w-full h-64 sm:h-72">
              <ReactECharts option={revenueTimelineOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Motifs & pathologies</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fréquence des consultations reçues.</p>
            </div>
            <div className="w-full h-64 sm:h-72">
              <ReactECharts option={diseaseDistributionOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* 4. Démographie des Patients (Âge) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] max-w-2xl mx-auto">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Répartition par tranche d&apos;âge</h2>
            <p className="text-xs text-slate-500 mt-0.5">Profil démographique des patients examinés.</p>
          </div>
          <div className="w-full h-60">
            <ReactECharts option={ageOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* 5. Registre détaillé des consultations */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Détail des consultations ({filteredVisits.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Enregistrements inclus dans cette période.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-medium text-[11px]">
                <tr>
                  <th className="py-3 px-5">Patient</th>
                  <th className="py-3 px-4">Âge</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Aucune consultation trouvée pour cette période.
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((visit) => {
                    const d = new Date(visit.createdAt);
                    const dateFormatted = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                    const timeFormatted = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const isPaid = visit.paymentStatus === 'paid';

                    return (
                      <tr key={visit.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-5 font-medium text-slate-900">
                          {visit.patientLastName} {visit.patientFirstName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">
                          {visit.patientAge ? `${visit.patientAge} ans` : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 tabular-nums">
                          {dateFormatted} · {timeFormatted}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {visit.disease || "Consultation"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium ${
                              isPaid ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaid ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {isPaid ? "Payé" : "En attente"}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right font-semibold text-slate-900 tabular-nums">
                          {visit.amountToPay > 0
                            ? `${visit.amountToPay.toLocaleString('fr-FR')} DH`
                            : "0 DH"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
