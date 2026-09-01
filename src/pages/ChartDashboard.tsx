import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchIncidents as fetchIncidentsFromSheet } from '../lib/dataApi';
import Swal from 'sweetalert2';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '../lib/utils';
import { PageSkeleton } from '../components/Skeleton';

const COLORS = ['#800000', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5'];

const MONTHS_TH = [
  'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 
  'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'
];

// Helper: Get Fiscal Year (Oct - Sep)
const getFiscalYear = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear() + 543;
  const month = date.getMonth(); // 0-11
  return month >= 9 ? year + 1 : year;
};

// Helper: Get Month Index for Fiscal Year (Oct = 0, Sep = 11)
const getFiscalMonthIndex = (dateString: string) => {
  const month = new Date(dateString).getMonth();
  return month >= 9 ? month - 9 : month + 3;
};

export default function ChartDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Interactive Table State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidentsFromSheet();
      setData(data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้", "error");
    } finally { setLoading(false); }
  };

  // Filter Options
  const years = useMemo(() => Array.from(new Set(data.map(d => getFiscalYear(d.incident_date).toString()))).sort().reverse(), [data]);
  const categories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach(d => {
      if (d.risk_type === 'Clinic' && d.process_type) cats.add(d.process_type);
      else if (d.risk_type) cats.add(d.risk_type);
    });
    return Array.from(cats).sort();
  }, [data]);

  // Apply Filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const fy = getFiscalYear(item.incident_date).toString();
      const fm = getFiscalMonthIndex(item.incident_date).toString();
      const cat = item.risk_type === 'Clinic' ? item.process_type : item.risk_type;

      if (selectedYear !== 'all' && fy !== selectedYear) return false;
      if (selectedMonth !== 'all' && fm !== selectedMonth) return false;
      if (selectedCategory !== 'all' && cat !== selectedCategory) return false;
      return true;
    });
  }, [data, selectedYear, selectedMonth, selectedCategory]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedCategory]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // --- KPI Calculations ---
  
  // 1. Total Incidents & YoY Comparison
  const totalIncidents = filteredData.length;
  const previousYearData = useMemo(() => {
    if (selectedYear === 'all') return [];
    const prevYear = (parseInt(selectedYear) - 1).toString();
    return data.filter(item => getFiscalYear(item.incident_date).toString() === prevYear);
  }, [data, selectedYear]);
  
  const yoyChange = selectedYear !== 'all' && previousYearData.length > 0 
    ? ((totalIncidents - previousYearData.length) / previousYearData.length) * 100 
    : null;

  // 2. Top 3 Incidents
  const topIncidents = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      if (Array.isArray(d.risk_items)) {
        d.risk_items.forEach((item: string) => {
          if (item !== 'อื่นๆ') counts[item] = (counts[item] || 0) + 1;
        });
      }
      if (d.other_risk_item) {
        counts[d.other_risk_item] = (counts[d.other_risk_item] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [filteredData]);

  // --- Chart Data Calculations ---

  // 1. Monthly Trend (Bar Chart)
  const monthlyTrendData = useMemo(() => {
    const trend = MONTHS_TH.map((month, index) => ({ month, count: 0, index }));
    filteredData.forEach(d => {
      const mIndex = getFiscalMonthIndex(d.incident_date);
      if (trend[mIndex]) {
        trend[mIndex].count += 1;
      }
    });
    return trend;
  }, [filteredData]);

  // 3. Miss vs Near Miss vs No Harm
  const groupTypeData = useMemo(() => {
    const counts: Record<string, number> = { 'Miss': 0, 'Near Miss': 0, 'No Harm': 0 };
    filteredData.forEach(d => {
      const gt = (d.group_type || '').trim();
      if (gt.toLowerCase() === 'miss') counts['Miss']++;
      else if (gt.toLowerCase() === 'near miss') counts['Near Miss']++;
      else if (gt.toLowerCase() === 'no harm') counts['No Harm']++;
      else if (gt) counts[gt] = (counts[gt] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ 
        name, 
        value, 
        fill: name.toLowerCase() === 'miss' ? '#ef4444' : name.toLowerCase() === 'near miss' ? '#f59e0b' : name.toLowerCase() === 'no harm' ? '#10b981' : '#64748b' 
      }))
      .filter(item => item.value > 0);
  }, [filteredData]);

  // 4. Top Reporters
  const topReporters = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const person = (d.responsible_person || '').trim();
      if (person) {
        counts[person] = (counts[person] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // 4.5 Top Causing Departments
  const topDepartments = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const dept = (d.causing_department || '').trim();
      if (dept) {
        counts[dept] = (counts[dept] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // 5. Risk Items (Pie Chart)
  const riskItemsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      if (Array.isArray(d.risk_items)) {
        d.risk_items.forEach((item: string) => {
          if (item !== 'อื่นๆ') counts[item] = (counts[item] || 0) + 1;
        });
      }
      if (d.other_risk_item) {
        counts[d.other_risk_item] = (counts[d.other_risk_item] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // 6. Impact Level Heatmap
  const impactLevelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const level = (d.impact_level || '').trim();
      if (level) {
        counts[level] = (counts[level] || 0) + 1;
      }
    });
    return counts;
  }, [filteredData]);

  // Determine max count for heatmap intensity
  const maxImpactCount = Math.max(...(Object.values(impactLevelData) as number[]), 1);

  // KPI Counts
  const clinicCount = filteredData.filter(d => d.risk_type === 'Clinic').length;
  const nonClinicCount = filteredData.filter(d => d.risk_type === 'Non-clinic').length;
  const preCount = filteredData.filter(d => d.process_type === 'Pre-analytical').length;
  const analyticalCount = filteredData.filter(d => d.process_type === 'Analytical').length;
  const postCount = filteredData.filter(d => d.process_type === 'Post-analytical').length;
  const uniqueReporters = new Set(filteredData.map(d => d.responsible_person).filter(Boolean)).size;
  const nearMissRate = totalIncidents ? (filteredData.filter(d => d.group_type === 'Near Miss').length / totalIncidents) * 100 : 0;

  const decisionMetrics = useMemo(() => {
    const today = new Date();
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    const todayKey = iso(today);
    const start30 = new Date(today); start30.setDate(today.getDate() - 29);
    const start60 = new Date(today); start60.setDate(today.getDate() - 59);
    const current30 = filteredData.filter(item => String(item.incident_date).slice(0, 10) >= iso(start30) && String(item.incident_date).slice(0, 10) <= todayKey);
    const previous30 = data.filter(item => String(item.incident_date).slice(0, 10) >= iso(start60) && String(item.incident_date).slice(0, 10) < iso(start30));
    const currentNear = current30.filter(item => item.group_type === 'Near Miss').length;
    const previousNear = previous30.filter(item => item.group_type === 'Near Miss').length;
    const unresolved = filteredData.filter(item => !item.resolution_status || item.resolution_status === 'Open' || item.resolution_status === 'In Progress');
    const todayItems = filteredData.filter(item => String(item.incident_date).slice(0, 10) === todayKey).length;
    const overdue = unresolved.filter(item => { const age = (today.getTime() - new Date(`${String(item.incident_date).slice(0, 10)}T00:00:00`).getTime()) / 86400000; return age > 7; }).length;
    const verified = filteredData.filter(item => item.resolution_status === 'Verified').length;
    const topDepartment = Object.entries(filteredData.reduce((acc: Record<string, number>, item) => { const dept = item.causing_department || 'ไม่ระบุหน่วยงาน'; acc[dept] = (acc[dept] || 0) + 1; return acc; }, {})).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const nearChange = previousNear ? ((currentNear - previousNear) / previousNear) * 100 : null;
    const median = (values: number[]) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
    const resolvedDurations = filteredData.filter(item => item.resolved_at && item.created_at).map(item => (new Date(item.resolved_at).getTime() - new Date(item.created_at).getTime()) / 86400000).filter(value => value >= 0);
    const verifyDurations = filteredData.filter(item => item.verified_at && item.resolved_at).map(item => (new Date(item.verified_at).getTime() - new Date(item.resolved_at).getTime()) / 86400000).filter(value => value >= 0);
    const slaRows = filteredData.filter(item => item.target_resolution_date);
    const slaRate = slaRows.length ? (slaRows.filter(item => item.resolved_at && String(item.resolved_at).slice(0, 10) <= String(item.target_resolution_date).slice(0, 10) || (!item.resolved_at && String(item.target_resolution_date).slice(0, 10) >= todayKey)).length / slaRows.length) * 100 : null;
    return { todayItems, overdue, unresolved, verified, topDepartment, nearChange, currentNear, previousNear, medianResolve: median(resolvedDurations), medianVerify: median(verifyDurations), slaRate };
  }, [data, filteredData]);

  // 2. Proportion (Donut Chart)
  const proportionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const cat = d.risk_type === 'Clinic' ? (d.process_type || 'Clinic Other') : 'Non-clinic';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl">
          <p className="font-bold text-slate-800 mb-1">{label || payload[0].name}</p>
          <p className="text-maroon-600 font-medium">
            จำนวน: {payload[0].value} ครั้ง
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <PageSkeleton label="กำลังโหลด executive dashboard" />;
  }

  return (
    <div className="bento-dashboard space-y-6 max-w-7xl mx-auto">
      {/* Header & Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Executive Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">สรุปภาพรวมอุบัติการณ์ความเสี่ยง (Lab Incident Management)</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex-1 md:w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">ปีงบประมาณ</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-maroon-500 focus:border-maroon-500 bg-slate-50"
              >
                <option value="all">ทุกปีงบประมาณ</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 md:w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">เดือน</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-maroon-500 focus:border-maroon-500 bg-slate-50"
              >
                <option value="all">ทุกเดือน</option>
                {MONTHS_TH.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1 md:w-48">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">หมวดหมู่ (Category)</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-maroon-500 focus:border-maroon-500 bg-slate-50"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="rounded-2xl bg-[#4a0e18] p-5 text-white shadow-lg shadow-maroon-900/10">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-200">Decision brief</p>
          <h2 className="mt-2 text-xl font-bold">สิ่งที่ผู้บริหารควรตัดสินใจวันนี้</h2>
          <p className="mt-2 text-sm leading-6 text-maroon-100">{decisionMetrics.nearChange === null ? 'กำลังสะสมข้อมูลเพื่อเปรียบเทียบแนวโน้ม Near Miss' : `Near Miss ${decisionMetrics.nearChange < 0 ? 'ลดลง' : decisionMetrics.nearChange > 0 ? 'เพิ่มขึ้น' : 'ทรงตัว'} ${Math.abs(decisionMetrics.nearChange).toFixed(0)}% เมื่อเทียบกับ 30 วันก่อน`} และมี {decisionMetrics.unresolved.length} ประเด็นที่ยังไม่ปิด โดยหน่วยงานที่มีเหตุการณ์สูงสุดคือ {decisionMetrics.topDepartment?.[0] || 'ยังไม่มีข้อมูล'}</p>
          <Link to="/data?date=today" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"><i className="fa-solid fa-arrow-right" />ดำเนินการวันนี้ ({decisionMetrics.todayItems})</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['ความเสี่ยงที่ต้องดำเนินการวันนี้', decisionMetrics.todayItems, 'fa-solid fa-calendar-day', 'bg-rose-50 text-rose-700'], ['ค้างเกิน SLA 7 วัน', decisionMetrics.overdue, 'fa-solid fa-hourglass-end', 'bg-amber-50 text-amber-700'], ['หน่วยงานที่มีเหตุการณ์สูงสุด', decisionMetrics.topDepartment?.[0] || '—', 'fa-solid fa-building', 'bg-violet-50 text-violet-700'], ['อัตราการปิดประเด็น', `${filteredData.length ? ((decisionMetrics.verified / filteredData.length) * 100).toFixed(0) : 0}%`, 'fa-solid fa-circle-check', 'bg-emerald-50 text-emerald-700']].map(([label, value, icon, tone]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><p className="max-w-[75%] text-sm font-semibold text-slate-500">{label}</p><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><i className={String(icon)} /></span></div><p className="mt-5 truncate text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">จากข้อมูลตามตัวกรองปัจจุบัน</p></div>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[['Median Time to Resolution', decisionMetrics.medianResolve === null ? '—' : `${decisionMetrics.medianResolve.toFixed(1)} วัน`, 'fa-solid fa-stopwatch'], ['Median Time to Verify', decisionMetrics.medianVerify === null ? '—' : `${decisionMetrics.medianVerify.toFixed(1)} วัน`, 'fa-solid fa-user-check'], ['SLA Compliance Rate', decisionMetrics.slaRate === null ? '—' : `${decisionMetrics.slaRate.toFixed(0)}%`, 'fa-solid fa-gauge-high']].map(([label, value, icon]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500"><i className="fa-solid fa-circle-info mr-1 text-slate-400" />{label}</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900"><i className={`${icon} text-maroon-600 text-base`} />{value}</p><p className="mt-1 text-[11px] text-slate-400">คำนวณจาก timestamp ที่มีจริง</p></div>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-700">Open queue</p><h3 className="mt-1 text-lg font-bold text-slate-900">รายการที่สถานะยังเป็น Open</h3></div><span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">{filteredData.filter(item => !item.resolution_status || item.resolution_status === 'Open').length}</span></div><div className="mt-4 space-y-2">{filteredData.filter(item => !item.resolution_status || item.resolution_status === 'Open').slice(0, 3).map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><span className="truncate text-slate-700">{item.risk_type || 'Incident'} · {item.causing_department || 'ไม่ระบุหน่วยงาน'}</span><span className="font-mono text-[10px] text-slate-400">{String(item.incident_date).slice(0, 10)}</span></div>)}{!filteredData.some(item => !item.resolution_status || item.resolution_status === 'Open') && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">ไม่มีรายการ Open ในตัวกรองนี้</p>}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-700">Verification queue</p><h3 className="mt-1 text-lg font-bold text-slate-900">รายการที่รอการ Verify</h3></div><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">{filteredData.filter(item => item.resolution_status === 'Resolved').length}</span></div><div className="mt-4 space-y-2">{filteredData.filter(item => item.resolution_status === 'Resolved').slice(0, 3).map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><span className="truncate text-slate-700">{item.risk_type || 'Incident'} · {item.responsible_person || 'ไม่ระบุผู้รับผิดชอบ'}</span><span className="font-mono text-[10px] text-slate-400">รอตรวจ</span></div>)}{!filteredData.some(item => item.resolution_status === 'Resolved') && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">ไม่มีรายการรอ Verify ในตัวกรองนี้</p>}</div></div>
        </div>
        <p className="text-xs text-slate-400"><i className="fa-solid fa-circle-info mr-1" />Median Time to Resolution: ยังไม่แสดง เนื่องจากข้อมูลปัจจุบันยังไม่มี timestamp ตอน Resolved — ควรเพิ่มฟิลด์ resolved_at เพื่อให้ตัวชี้วัดนี้แม่นยำ</p>
      </section>

      {/* Part 1: Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Total Incidents */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
          className="bg-gradient-to-br from-maroon-700 to-maroon-900 rounded-2xl p-5 text-white shadow-lg shadow-maroon-200 relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-1"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-maroon-100 text-sm font-medium">อุบัติการณ์ทั้งหมด</p>
              <p className="text-xs text-maroon-200/80">Total Incidents</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              <i className="fa-solid fa-chart-line"></i>
            </div>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <h3 className="text-4xl font-bold">{totalIncidents}</h3>
            <span className="text-maroon-200 mb-1 text-sm">ครั้ง</span>
          </div>
          
          {selectedYear !== 'all' && (
            <div className="mt-3 pt-3 border-t border-maroon-500/30 flex items-center gap-2 text-xs">
              {yoyChange !== null ? (
                <>
                  <span className={cn("px-2 py-0.5 rounded-full font-medium flex items-center gap-1", yoyChange > 0 ? "bg-red-500/20 text-red-100" : yoyChange < 0 ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-500/20 text-slate-100")}>
                    {yoyChange > 0 ? <i className="fa-solid fa-arrow-trend-up"></i> : yoyChange < 0 ? <i className="fa-solid fa-arrow-trend-down"></i> : <i className="fa-solid fa-minus"></i>}
                    {Math.abs(yoyChange).toFixed(1)}%
                  </span>
                  <span className="text-maroon-100 opacity-80">เทียบปีก่อน</span>
                </>
              ) : (
                <span className="text-maroon-100 opacity-80">ไม่มีข้อมูลปีก่อน</span>
              )}
            </div>
          )}
        </motion.div>

        {/* KPI: Clinic vs Non-clinic */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-bold">ประเภทความเสี่ยง</p>
              <p className="text-xs text-slate-400">Clinic / Non-clinic</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-stethoscope"></i>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Clinic</p>
              <p className="text-xl font-bold text-slate-800">{clinicCount}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Non-clinic</p>
              <p className="text-xl font-bold text-slate-800">{nonClinicCount}</p>
            </div>
          </div>
        </motion.div>

        {/* KPI: Process Types */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-bold">ขั้นตอน (Clinic)</p>
              <p className="text-xs text-slate-400">Process Types</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-vials"></i>
            </div>
          </div>
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="text-center px-2 border-r border-slate-200 flex-1">
              <p className="text-[10px] text-slate-500 uppercase">Pre</p>
              <p className="text-lg font-bold text-slate-800">{preCount}</p>
            </div>
            <div className="text-center px-2 border-r border-slate-200 flex-1">
              <p className="text-[10px] text-slate-500 uppercase">Analyt</p>
              <p className="text-lg font-bold text-slate-800">{analyticalCount}</p>
            </div>
            <div className="text-center px-2 flex-1">
              <p className="text-[10px] text-slate-500 uppercase">Post</p>
              <p className="text-lg font-bold text-slate-800">{postCount}</p>
            </div>
          </div>
        </motion.div>

        {/* KPI: Reporters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-bold">ผู้รายงานทั้งหมด</p>
              <p className="text-xs text-slate-400">Unique Reporters</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-slate-800">{uniqueReporters}</h3>
            <span className="text-slate-500 mb-1 text-sm font-medium">คน</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-400">สัดส่วน Near Miss</span><span className="font-bold text-maroon-700">{nearMissRate.toFixed(1)}%</span></div>
        </motion.div>
      </div>

      {/* Part 2: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2"
        >
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">แนวโน้มอุบัติการณ์รายเดือน</h3>
              <p className="text-xs text-slate-500 mt-1">ปีงบประมาณ ต.ค. - ก.ย.</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-chart-column"></i>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#800000" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {monthlyTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#800000' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Proportion Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col"
        >
          <div className="mb-2 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">สรุปการรายงาน</h3>
              <p className="text-xs text-slate-500 mt-1">แยกตามหมวดหมู่</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
          </div>
          <div className="min-h-[250px] w-full relative flex-1">
            {proportionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={proportionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {proportionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
            )}
            {/* Center Text for Donut */}
            {proportionData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-800">{totalIncidents}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Miss vs Near Miss Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col"
        >
          <div className="mb-2 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">อัตราส่วนการจัดกลุ่ม</h3>
              <p className="text-xs text-slate-500 mt-1">Miss vs Near Miss</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
          </div>
          <div className="min-h-[250px] w-full relative flex-1">
            {groupTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {groupTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
            )}
          </div>
        </motion.div>

        {/* Risk Items Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:col-span-2"
        >
          <div className="mb-2 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">รายการความเสี่ยง</h3>
              <p className="text-xs text-slate-500 mt-1">สัดส่วนของรายการความเสี่ยงที่พบ</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
          </div>
          <div className="min-h-[300px] w-full relative flex-1">
            {riskItemsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskItemsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => percent > 0.05 ? `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={true}
                  >
                    {riskItemsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
            )}
          </div>
        </motion.div>

        {/* Top Reporters Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Top 5 ผู้รายงาน</h3>
              <p className="text-xs text-slate-500 mt-1">ความถี่ในการบันทึกข้อมูล</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-medal"></i>
            </div>
          </div>
          <div className="h-[250px] w-full">
            {topReporters.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topReporters} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" fill="#800000" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
            )}
          </div>
        </motion.div>

        {/* Top Causing Departments Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Top 5 หน่วยงาน</h3>
              <p className="text-xs text-slate-500 mt-1">ที่ทำให้เกิดอุบัติการณ์</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-building-circle-exclamation"></i>
            </div>
          </div>
          <div className="h-[250px] w-full">
            {topDepartments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDepartments} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" fill="#800000" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
            )}
          </div>
        </motion.div>

        {/* Impact Level Heatmap */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1"
        >
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">ระดับความรุนแรง (Heat map)</h3>
              <p className="text-xs text-slate-500 mt-1">Impact Level ความเสี่ยงสูงสุด</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-temperature-full"></i>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Clinic (A-I)</p>
              <div className="grid grid-cols-5 gap-2">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(level => {
                  const count = impactLevelData[level] || 0;
                  const intensity = count > 0 ? 0.2 + (count / maxImpactCount) * 0.8 : 0;
                  return (
                    <div 
                      key={level} 
                      className="relative h-14 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden group cursor-pointer"
                      title={`${level}: ${count} ครั้ง`}
                    >
                      <div 
                        className="absolute inset-0 bg-maroon-600 transition-opacity" 
                        style={{ opacity: intensity }}
                      ></div>
                      <div className="relative z-10 flex flex-col items-center justify-center leading-none gap-0.5">
                        <span className={cn("font-bold text-lg", count > 0 ? (intensity > 0.5 ? "text-white" : "text-maroon-900") : "text-slate-400")}>
                          {level}
                        </span>
                        <span className={cn("text-[11px] font-semibold", count > 0 ? (intensity > 0.5 ? "text-maroon-100" : "text-maroon-700") : "text-slate-300")}>
                          {count} ครั้ง
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Non-clinic (0-4)</p>
              <div className="grid grid-cols-5 gap-2">
                {['0', '1', '2', '3', '4'].map(level => {
                  const count = impactLevelData[level] || 0;
                  const intensity = count > 0 ? 0.2 + (count / maxImpactCount) * 0.8 : 0;
                  return (
                    <div 
                      key={level} 
                      className="relative h-14 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden group cursor-pointer"
                      title={`${level}: ${count} ครั้ง`}
                    >
                      <div 
                        className="absolute inset-0 bg-teal-600 transition-opacity" 
                        style={{ opacity: intensity }}
                      ></div>
                      <div className="relative z-10 flex flex-col items-center justify-center leading-none gap-0.5">
                        <span className={cn("font-bold text-lg", count > 0 ? (intensity > 0.5 ? "text-white" : "text-teal-900") : "text-slate-400")}>
                          {level}
                        </span>
                        <span className={cn("text-[11px] font-semibold", count > 0 ? (intensity > 0.5 ? "text-teal-100" : "text-teal-700") : "text-slate-300")}>
                          {count} ครั้ง
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top 3 Incidents List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} 
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Top 3 อุบัติการณ์</h3>
              <p className="text-xs text-slate-500 mt-1">ที่พบบ่อยที่สุด (Area of Focus)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center">
              <i className="fa-solid fa-fire"></i>
            </div>
          </div>
          
          <div className="space-y-4">
            {topIncidents.length > 0 ? topIncidents.map((incident, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm",
                  idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-orange-400" : "bg-amber-400"
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate pr-2" title={incident.name}>{incident.name}</span>
                    <span className="text-sm font-bold text-slate-900 shrink-0">{incident.count} <span className="text-xs font-normal text-slate-500">ครั้ง</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(incident.count / topIncidents[0].count) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                      className={cn("h-full rounded-full", idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-orange-400" : "bg-amber-400")} 
                    ></motion.div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-400">ไม่มีข้อมูล</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Part 3: Interactive Detail Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} 
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">รายละเอียดการแก้ไขและแนวทางป้องกัน</h3>
            <p className="text-xs text-slate-500 mt-1">คลิกที่แถวเพื่อดูรายละเอียดเพิ่มเติม (Correction & Practical Action)</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 pl-6 w-32">วันที่เกิดเหตุ</th>
                <th className="p-4 w-48">หมวดหมู่</th>
                <th className="p-4">รายการความเสี่ยง (Incident)</th>
                <th className="p-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? paginatedData.map((item) => {
                const isExpanded = expandedRowId === item.id;
                const category = item.risk_type === 'Clinic' ? item.process_type : item.risk_type;
                
                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-maroon-50/50",
                        isExpanded ? "bg-maroon-50/30" : "bg-white"
                      )}
                    >
                      <td className="p-4 pl-6 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(item.incident_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium",
                          item.risk_type === 'Clinic' ? "bg-maroon-100 text-maroon-700" : "bg-teal-100 text-teal-700"
                        )}>
                          {category}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-800">
                        <div className="line-clamp-1 group-hover:line-clamp-none transition-all">
                          {item.risk_items?.join(', ') || item.other_risk_item || '-'}
                        </div>
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        <motion.i 
                          animate={{ rotate: isExpanded ? 180 : 0 }} 
                          className="fa-solid fa-chevron-down"
                        ></motion.i>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="p-0 border-0">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-slate-50 border-b border-slate-200"
                            >
                              <div className="p-6 pl-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-wrench text-orange-500"></i> การแก้ไขเบื้องต้น (Correction)
                                  </h4>
                                  <p className="text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                                    {item.initial_response || <span className="text-slate-400 italic">ไม่มีข้อมูล</span>}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-shield-halved text-emerald-500"></i> แนวทางปฏิบัติ (Practical Action)
                                  </h4>
                                  <p className="text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                                    {item.guideline || <span className="text-slate-400 italic">ไม่มีข้อมูล</span>}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    ไม่พบข้อมูลอุบัติการณ์ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500">
              แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredData.length)} จากทั้งหมด {filteredData.length} รายการ
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors text-sm font-medium"
              >
                <i className="fa-solid fa-chevron-left mr-1"></i> ก่อนหน้า
              </button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                      currentPage === page 
                        ? "bg-maroon-600 text-white" 
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors text-sm font-medium"
              >
                ถัดไป <i className="fa-solid fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
