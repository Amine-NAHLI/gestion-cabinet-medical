"use client";

import React, { useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type VisitData = {
  id: number;
  amountToPay: number;
  hasCustomAmount?: boolean;
  createdAt: string;
  patientAge: number;
  patientFirstName?: string;
  patientLastName?: string;
  disease?: string | null;
  paymentStatus?: string;
  status?: string;
};

export default function StatsCharts({ rawVisits }: { rawVisits: VisitData[] }) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Filtrer les consultations selon la période sélectionnée
  const filteredVisits = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return rawVisits.filter(v => {
      const visitDate = new Date(v.createdAt);
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
          const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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
          const hour = new Date(v.createdAt).getHours();
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
          const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          if (dateMap[key] !== undefined) {
            dateMap[key] += v.amountToPay;
          }
        }
      });
    } else {
      // 'all' : Grouper par date existante ou mois
      filteredVisits.forEach(v => {
        if (v.paymentStatus === 'paid') {
          const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          dateMap[key] = (dateMap[key] || 0) + v.amountToPay;
        }
      });
      Object.keys(dateMap).forEach(k => labels.push(k));
      if (labels.length === 0) {
        labels.push("Aujourd'hui");
        dateMap["Aujourd'hui"] = 0;
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

  // 6. Export PDF Professionnel (Facture / Relevé Global)
  const exportPDF = () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Bandeau supérieur
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 24, pageWidth, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("MEDICABINET", 14, 15);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text("RELEVÉ D'ACTIVITÉ & FACTURATION CABINET", pageWidth - 14, 15, { align: 'right' });

      // En-tête cabinet
      const startY = 36;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("Cabinet Médical Dr. Amine NAHLI", 14, startY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("Médecine Générale & Soins Cliniques", 14, startY + 5);
      doc.text("Boulevard d'Anfa, Casablanca, Maroc", 14, startY + 10);
      doc.text("Tél : +212 5 22 00 00 00 | IF : 40182910 | ICE : 002910293000041", 14, startY + 15);

      // Cartouche Facture
      const periodLabelMap: Record<string, string> = {
        day: "Aujourd'hui",
        week: "7 derniers jours",
        month: "Ce mois",
        all: "Historique global",
      };

      const invoiceBoxX = 120;
      const invoiceBoxW = 76;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(invoiceBoxX, startY - 4, invoiceBoxW, 26, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      const invoiceNum = `FAC-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      doc.text(`RELEVÉ N° ${invoiceNum}`, invoiceBoxX + 4, startY + 3);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, invoiceBoxX + 4, startY + 9);
      doc.text(`Période filtrée : ${periodLabelMap[period]}`, invoiceBoxX + 4, startY + 14);
      doc.text(`Total Actes : ${statsSummary.totalVisits} consultation(s)`, invoiceBoxX + 4, startY + 19);

      // 3 Blocs KPI
      const kpiY = startY + 28;
      const colW = (pageWidth - 28 - 8) / 3;

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, kpiY, colW, 14, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text("CONSULTATIONS TOTALES", 18, kpiY + 4.5);
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${statsSummary.totalVisits} acte(s)`, 18, kpiY + 11);

      doc.setFillColor(236, 253, 245);
      doc.roundedRect(14 + colW + 4, kpiY, colW, 14, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text("TOTAL NET ENCAISSÉ", 18 + colW + 4, kpiY + 4.5);
      doc.setFontSize(10.5);
      doc.setTextColor(4, 120, 87);
      doc.text(`${statsSummary.totalCollected.toLocaleString('fr-FR')} DH`, 18 + colW + 4, kpiY + 11);

      doc.setFillColor(240, 249, 255);
      doc.roundedRect(14 + (colW + 4) * 2, kpiY, colW, 14, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      doc.text("TARIF MOYEN / ACTE", 18 + (colW + 4) * 2, kpiY + 4.5);
      doc.setFontSize(10.5);
      doc.setTextColor(3, 105, 161);
      doc.text(`${statsSummary.averageFee} DH`, 18 + (colW + 4) * 2, kpiY + 11);

      // Tableau des prestations
      const tableData = filteredVisits.map((v, idx) => {
        const d = new Date(v.createdAt);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const patientName = [v.patientLastName, v.patientFirstName].filter(Boolean).join(' ').toUpperCase() || `Patient #${v.id}`;
        const ageStr = v.patientAge ? `${v.patientAge} ans` : "-";
        const motiveStr = v.disease || "Consultation standard";
        const isPaid = v.paymentStatus === 'paid';
        const amountStr = v.amountToPay > 0 ? `${v.amountToPay.toLocaleString('fr-FR')} DH` : "0 DH (Exonéré)";

        return [
          String(idx + 1).padStart(2, '0'),
          `${dateStr} ${timeStr}`,
          patientName,
          ageStr,
          motiveStr,
          isPaid ? "PAYÉ" : "EN ATTENTE",
          amountStr,
        ];
      });

      autoTable(doc, {
        startY: kpiY + 19,
        margin: { left: 14, right: 14 },
        head: [["N°", "Date & Heure", "Patient", "Âge", "Motif de Consultation", "Règlement", "Montant"]],
        body: tableData.length > 0 ? tableData : [["-", "-", "Aucune consultation enregistrée", "-", "-", "-", "0 DH"]],
        foot: [
          [
            {
              content: "TOTAL NET ENCAISSÉ (DH)",
              colSpan: 6,
              styles: { halign: "right", fontStyle: "bold", fontSize: 8.5, textColor: [15, 23, 42] },
            },
            {
              content: `${statsSummary.totalCollected.toLocaleString("fr-FR")} DH`,
              styles: { halign: "right", fontStyle: "bold", fontSize: 9, textColor: [5, 150, 105] },
            },
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: 2.8,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 2.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 28 },
          2: { cellWidth: 42, fontStyle: "bold" },
          3: { cellWidth: 14, halign: "center" },
          4: { cellWidth: 50 },
          5: { cellWidth: 20, halign: "center", fontStyle: "bold" },
          6: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
      const bottomY = finalY > pageHeight - 40 ? 20 : finalY;
      if (finalY > pageHeight - 40) {
        doc.addPage();
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text("Arrêté le présent relevé financier à la somme de :", 14, bottomY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${statsSummary.totalCollected.toLocaleString('fr-FR')} Dirhams Marocains.`, 14, bottomY + 5);

      const stampX = pageWidth - 65;
      doc.setDrawColor(203, 213, 225);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(stampX, bottomY - 2, 50, 22, 2, 2, 'S');
      doc.setLineDashPattern([], 0);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text("Signature & Cachet Médical", stampX + 25, bottomY + 3, { align: "center" });

      doc.save(`Releve_Medical_${period}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erreur génération PDF:", err);
      alert("Erreur lors de la génération du PDF: " + msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Barre de Contrôle des Périodes & Export */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: 'day', label: "Aujourd'hui" },
            { id: 'week', label: "7 derniers jours" },
            { id: 'month', label: "Ce mois" },
            { id: 'all', label: "Tout l'historique" }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id as any)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === p.id 
                  ? 'bg-white text-sky-700 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={exportPDF} 
          disabled={isExporting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">{isExporting ? 'hourglass_empty' : 'receipt_long'}</span>
          <span>{isExporting ? 'Génération...' : 'Télécharger le Bilan PDF'}</span>
        </motion.button>
      </div>

      <div ref={printRef} className="space-y-8">
        
        {/* 2. Cartes KPIs Exécutives (4 Indicateurs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Encaissé */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Total Encaissé</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {statsSummary.totalCollected.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-emerald-600">DH</span>
              </h3>
            </div>
          </motion.div>

          {/* Nombre de Consultations */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">medical_services</span>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Actes Réalisés</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {statsSummary.totalVisits} <span className="text-sm font-normal text-slate-400">patient{statsSummary.totalVisits > 1 ? 's' : ''}</span>
              </h3>
            </div>
          </motion.div>

          {/* Tarif Moyen */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Moyenne / Acte</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {statsSummary.averageFee} <span className="text-sm font-semibold text-indigo-600">DH</span>
              </h3>
            </div>
          </motion.div>

          {/* Taux de Recouvrement */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Taux de Règlement</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {statsSummary.paymentRate}%
              </h3>
            </div>
          </motion.div>

        </div>

        {/* 3. Graphiques d'Activité & de Pathologie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Graphique 1 : Évolution Temporelle Réelle */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Évolution du Chiffre d&apos;Affaires</h2>
                <p className="text-xs text-slate-400 mt-0.5">Progression journalière des encaissements sur la période.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold">
                {statsSummary.totalCollected} DH
              </span>
            </div>
            <div className="w-full h-72">
              <ReactECharts option={revenueTimelineOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </motion.div>

          {/* Graphique 2 : Motifs Cliniques & Pathologies */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Motifs & Diagnostics Cliniques</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fréquence des pathologies et consultations reçues.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                Pathologies
              </span>
            </div>
            <div className="w-full h-72">
              <ReactECharts option={diseaseDistributionOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </motion.div>

        </div>

        {/* 4. Démographie des Patients (Âge) */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Répartition des Patients par Tranche d&apos;Âge</h2>
            <p className="text-xs text-slate-400 mt-0.5">Profil démographique des patients examinés.</p>
          </div>
          <div className="w-full h-64">
            <ReactECharts option={ageOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

        {/* 5. Journal d'Audit Transparent (Tableau Vérifiable des Consultations) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <span className="material-symbols-outlined text-lg">receipt</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Registre des Consultations de la Période ({filteredVisits.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Vérification détaillée de chaque enregistrement pris en compte.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {filteredVisits.length} consultation{filteredVisits.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Patient</th>
                  <th className="py-3.5 px-4">Âge</th>
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Motif / Pathologie</th>
                  <th className="py-3.5 px-4 text-center">Règlement</th>
                  <th className="py-3.5 px-6 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucune consultation trouvée pour cette période.
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((visit) => {
                    const initials = `${visit.patientFirstName?.[0] || ""}${visit.patientLastName?.[0] || ""}`.toUpperCase();
                    const d = new Date(visit.createdAt);
                    const dateFormatted = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                    const timeFormatted = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const isPaid = visit.paymentStatus === 'paid';

                    return (
                      <tr key={visit.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {initials || "P"}
                          </div>
                          <span>{visit.patientLastName} {visit.patientFirstName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {visit.patientAge ? `${visit.patientAge} ans` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {dateFormatted} à {timeFormatted}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                            {visit.disease || "Consultation standard"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Payé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-slate-900">
                          {visit.amountToPay > 0 ? (
                            <span>{visit.amountToPay.toLocaleString('fr-FR')} DH</span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">0 DH (Exonéré)</span>
                          )}
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
