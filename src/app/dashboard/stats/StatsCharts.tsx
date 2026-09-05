"use client";

import React, { useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type VisitData = {
  id: number;
  amountToPay: number;
  createdAt: string;
  patientAge: number;
  patientFirstName?: string;
  patientLastName?: string;
  disease?: string | null;
  paymentStatus?: string;
};

export default function StatsCharts({ rawVisits }: { rawVisits: VisitData[] }) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Filtrer les visites selon la période choisie
  const filteredVisits = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return rawVisits.filter(v => {
      const visitDate = new Date(v.createdAt);
      if (period === 'day') {
        return visitDate >= today;
      } else if (period === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        return visitDate >= lastWeek;
      } else if (period === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return visitDate >= lastMonth;
      }
      return true; // 'all'
    });
  }, [rawVisits, period]);

  // KPIs
  const totalVisits = filteredVisits.length;
  const totalRevenue = filteredVisits.reduce((sum, v) => sum + v.amountToPay, 0);

  // --- Graphique 1 : Évolution des revenus dans le temps ---
  const revenueTimelineOptions = useMemo(() => {
    // Agréger par date
    const aggregated: Record<string, number> = {};
    
    filteredVisits.forEach(v => {
      const d = new Date(v.createdAt);
      const key = period === 'day' 
        ? d.getHours() + "h" 
        : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        
      if (!aggregated[key]) aggregated[key] = 0;
      aggregated[key] += v.amountToPay;
    });

    // Si pas de données, afficher quelques jours à 0 pour faire joli
    if (Object.keys(aggregated).length === 0) {
      aggregated["Aujourd'hui"] = 0;
    }

    const labels = Object.keys(aggregated);
    const data = Object.values(aggregated);

    return {
      tooltip: { trigger: 'axis', formatter: '{b} : {c} DH' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b' }
      },
      yAxis: { 
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
      },
      series: [{
        data,
        type: 'line',
        smooth: true,
        symbolSize: 8,
        itemStyle: { color: '#0ea5e9' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14, 165, 233, 0.5)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0.05)' }
            ]
          }
        }
      }]
    };
  }, [filteredVisits, period]);

  // --- Graphique 2 : Répartition des prix (Tarification) ---
  const priceDistributionOptions = useMemo(() => {
    const distribution: Record<number, { count: number, total: number }> = {};
    
    filteredVisits.forEach(v => {
      const amount = v.amountToPay;
      if (!distribution[amount]) distribution[amount] = { count: 0, total: 0 };
      distribution[amount].count += 1;
      distribution[amount].total += amount;
    });

    const prices = Object.keys(distribution).sort((a, b) => Number(a) - Number(b));
    const counts = prices.map(p => distribution[Number(p)].count);
    const totals = prices.map(p => distribution[Number(p)].total);

    return {
      tooltip: { 
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const count = params[0].value;
          const total = params[1].value;
          const price = params[0].name;
          return `<b>${price} DH</b><br/>Patients : ${count}<br/>Total généré : ${total} DH`;
        }
      },
      legend: { data: ['Nombre de patients', 'Total généré (DH)'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: prices.map(p => `${p} DH`),
        axisLabel: { color: '#64748b', fontWeight: 'bold' }
      },
      yAxis: [
        { type: 'value', name: 'Patients', position: 'left' },
        { type: 'value', name: 'Revenu', position: 'right' }
      ],
      series: [
        {
          name: 'Nombre de patients',
          type: 'bar',
          data: counts,
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
          yAxisIndex: 0
        },
        {
          name: 'Total généré (DH)',
          type: 'bar',
          data: totals,
          itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
          yAxisIndex: 1
        }
      ]
    };
  }, [filteredVisits]);

  // --- Graphique 3 : Répartition par Âge ---
  const ageOptions = useMemo(() => {
    let child = 0, teen = 0, adult = 0, senior = 0;
    filteredVisits.forEach(v => {
      if (v.patientAge < 12) child++;
      else if (v.patientAge < 18) teen++;
      else if (v.patientAge < 60) adult++;
      else senior++;
    });
    
    const data = [
      { name: 'Enfants (<12)', value: child },
      { name: 'Ados (12-18)', value: teen },
      { name: 'Adultes (18-60)', value: adult },
      { name: 'Seniors (60+)', value: senior }
    ].filter(d => d.value > 0);

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} patients ({d}%)' },
      legend: { bottom: '0%', left: 'center' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        color: ['#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6'],
        data: data.length > 0 ? data : [{ name: 'Aucune donnée', value: 0 }]
      }]
    };
  }, [filteredVisits]);


  // Fonction d'export PDF sous forme de FACTURE OFFICIELLE & RELEVÉ D'ENCAISSEMENTS
  const exportPDF = () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. En-tête Médical Haut (Bannière)
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, pageWidth, 24, 'F');

      // Bandeau d'accentuation Turquoise
      doc.setFillColor(13, 148, 136); // Teal 600
      doc.rect(0, 24, pageWidth, 2, 'F');

      // Titre dans la bannière
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text("MEDICABINET", 14, 15);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225); // Slate 300
      doc.text("RELEVÉ D'ENCAISSEMENTS & FACTURATION GLOBALE", pageWidth - 14, 15, { align: 'right' });

      // 2. Coordonnées Cabinet (Gauche) & Détails Facture (Droite)
      const startY = 36;

      // Infos Cabinet
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text("Cabinet Médical Dr. Amine NAHLI", 14, startY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("Médecine Générale & Soins Cliniques", 14, startY + 5);
      doc.text("Boulevard d'Anfa, Casablanca, Maroc", 14, startY + 10);
      doc.text("Tél : +212 5 22 00 00 00 | Email : contact@medicabinet.ma", 14, startY + 15);
      doc.text("IF : 40182910 | ICE : 002910293000041", 14, startY + 20);

      // Cartouche Facture (Droite)
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
      doc.roundedRect(invoiceBoxX, startY - 4, invoiceBoxW, 28, 2.5, 2.5, 'FD');

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199); // Sky 600
      const invoiceNum = `FAC-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      doc.text(`FACTURE N° ${invoiceNum}`, invoiceBoxX + 4, startY + 3);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, invoiceBoxX + 4, startY + 10);
      doc.text(`Période : ${periodLabelMap[period]}`, invoiceBoxX + 4, startY + 15);
      doc.text(`Règlement : Espèces / Chèque (Encaissé)`, invoiceBoxX + 4, startY + 20);

      // 3. Encadré Synthèse Financière (3 colonnes KPI)
      const kpiY = startY + 30;
      const colW = (pageWidth - 28 - 8) / 3;

      // Box 1 : Total Actes
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, kpiY, colW, 15, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL CONSULTATIONS", 18, kpiY + 5);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalVisits} acte(s)`, 18, kpiY + 11.5);

      // Box 2 : Total Encaissé
      doc.setFillColor(236, 253, 245); // Emerald 50
      doc.roundedRect(14 + colW + 4, kpiY, colW, 15, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.text("TOTAL NET ENCAISSÉ", 18 + colW + 4, kpiY + 5);
      doc.setFontSize(11);
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.text(`${totalRevenue.toLocaleString('fr-FR')} DH`, 18 + colW + 4, kpiY + 11.5);

      // Box 3 : Tarif Moyen
      const avg = totalVisits > 0 ? Math.round(totalRevenue / totalVisits) : 0;
      doc.setFillColor(240, 249, 255); // Sky 50
      doc.roundedRect(14 + (colW + 4) * 2, kpiY, colW, 15, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 132, 199);
      doc.text("TARIF MOYEN / CONSULTATION", 18 + (colW + 4) * 2, kpiY + 5);
      doc.setFontSize(11);
      doc.setTextColor(3, 105, 161);
      doc.text(`${avg} DH`, 18 + (colW + 4) * 2, kpiY + 11.5);

      // 4. Tableau Détaillé des Prestations (Facture)
      const tableData = filteredVisits.map((v, idx) => {
        const d = new Date(v.createdAt);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const patientName = [v.patientLastName, v.patientFirstName].filter(Boolean).join(' ').toUpperCase() || `Patient #${v.id}`;
        const ageStr = v.patientAge ? `${v.patientAge} ans` : "-";
        const motiveStr = v.disease || "Consultation médicale";
        const amountStr = `${v.amountToPay.toLocaleString('fr-FR')} DH`;

        return [
          String(idx + 1).padStart(2, '0'),
          `${dateStr} ${timeStr}`,
          patientName,
          ageStr,
          motiveStr,
          "PAYÉ",
          amountStr,
        ];
      });

      autoTable(doc, {
        startY: kpiY + 20,
        margin: { left: 14, right: 14 },
        head: [["N°", "Date & Heure", "Patient", "Âge", "Désignation de la Consultation", "Statut", "Montant Net"]],
        body: tableData.length > 0 ? tableData : [["-", "-", "Aucune consultation sur cette période", "-", "-", "-", "0 DH"]],
        foot: [
          [
            {
              content: "TOTAL FACTURÉ NET À PAYER (DH)",
              colSpan: 6,
              styles: { halign: "right", fontStyle: "bold", fontSize: 9, textColor: [15, 23, 42] },
            },
            {
              content: `${totalRevenue.toLocaleString("fr-FR")} DH`,
              styles: { halign: "right", fontStyle: "bold", fontSize: 9.5, textColor: [5, 150, 105] },
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
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 2.8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 26 },
          2: { cellWidth: 42, fontStyle: "bold" },
          3: { cellWidth: 14, halign: "center" },
          4: { cellWidth: 50 },
          5: { cellWidth: 18, halign: "center", fontStyle: "bold", textColor: [5, 150, 105] },
          6: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        },
      });

      // 5. Bas de page : Arrêté de somme & Cachet
      const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
      
      const bottomY = finalY > pageHeight - 45 ? 20 : finalY;
      if (finalY > pageHeight - 45) {
        doc.addPage();
      }

      // Texte d'arrêté de la facture
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text("Arrêtée la présente facture globale à la somme de :", 14, bottomY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalRevenue.toLocaleString('fr-FR')} Dirhams Marocains (${totalVisits} consultation${totalVisits > 1 ? 's' : ''}).`, 14, bottomY + 5);

      // Cadre signature & cachet
      const stampX = pageWidth - 70;
      doc.setDrawColor(203, 213, 225);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(stampX, bottomY - 2, 56, 24, 2, 2, 'S');
      doc.setLineDashPattern([], 0);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text("Cachet & Signature du Cabinet", stampX + 28, bottomY + 3, { align: "center" });

      // Pied de page légal fixe
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Document officiel généré automatiquement par MediCabinet Système Médical — Certifié conforme.",
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" }
      );

      doc.save(`Facture_Cabinet_${period}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err: any) {
      console.error("Erreur lors de la génération de la facture PDF:", err);
      alert("Erreur lors de la génération de la facture: " + (err?.message || ""));
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      
      {/* Barre de Filtres et Export */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'day', label: "Aujourd'hui" },
            { id: 'week', label: "7 derniers jours" },
            { id: 'month', label: "Ce mois" },
            { id: 'all', label: "Tout le temps" }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === p.id ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={exportPDF} 
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined">{isExporting ? 'hourglass_empty' : 'download'}</span>
          {isExporting ? 'Génération...' : 'Télécharger PDF'}
        </button>
      </div>

      {/* Zone à exporter en PDF */}
      <div ref={printRef} className="space-y-6 p-2">
        
        {/* Cartes KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
              <span className="material-symbols-outlined text-3xl">groups</span>
            </div>
            <div>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Consultations Payées</p>
              <h3 className="text-4xl font-black text-slate-900 mt-1">{totalVisits}</h3>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-3xl">payments</span>
            </div>
            <div>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Revenu Total</p>
              <h3 className="text-4xl font-black text-slate-900 mt-1">{totalRevenue.toLocaleString('fr-FR')} DH</h3>
            </div>
          </motion.div>
        </div>

        {/* Graphiques principaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Évolution des revenus</h2>
            <div className="w-full h-72">
              <ReactECharts option={revenueTimelineOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Répartition des tarifs</h2>
            <div className="w-full h-72">
              <ReactECharts option={priceDistributionOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          </motion.div>

        </div>

        {/* Graphique secondaire (Âge) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Répartition des patients par âge</h2>
          <div className="w-full h-64">
            <ReactECharts option={ageOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
