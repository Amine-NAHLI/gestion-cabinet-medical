"use client";

import React, { useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

type VisitData = {
  id: number;
  amountToPay: number;
  createdAt: string;
  patientAge: number;
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


  // Fonction d'export PDF compatible Tailwind v4 (oklch)
  const exportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    try {
      const dataUrl = await toPng(printRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const contentHeight = (img.height * contentWidth) / img.width;

      if (contentHeight > pageHeight - (margin * 2)) {
        // Ajuster l'échelle pour tout faire tenir sur une page A4 propre
        const scale = (pageHeight - (margin * 2)) / contentHeight;
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        const xOffset = margin + (contentWidth - scaledWidth) / 2;
        pdf.addImage(dataUrl, 'PNG', xOffset, margin, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, contentHeight);
      }

      pdf.save(`Rapport_Statistiques_${period}.pdf`);
    } catch (err: any) {
      console.error("Erreur lors de l'export PDF:", err);
      alert("Une erreur s'est produite lors de la génération du PDF: " + (err?.message || ""));
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
