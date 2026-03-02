import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('*')
        .order('incident_date', { ascending: false });

      if (error) throw error;
      setData(incidents || []);
      
      // Set default year to latest available if data exists
      if (incidents && incidents.length > 0) {
        const latestYear = Math.max(...incidents.map(d => getFiscalYear(d.incident_date)));
        setSelectedYear(latestYear.toString());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
      d.risk_items?.forEach((item: string) => {
        counts[item] = (counts[item] || 0) + 1;
      });
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
          <p className="text-blue-600 font-medium">
            จำนวน: {payload[0].value} ครั้ง
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
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
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
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
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Part 1: Executive KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI: Total Incidents */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <p className="text-blue-100 text-sm font-medium mb-1">จำนวนอุบัติการณ์ทั้งหมด</p>
          <div className="flex items-end gap-3">
            <h3 className="text-5xl font-bold">{totalIncidents}</h3>
            <span className="text-blue-200 mb-1">ครั้ง</span>
          </div>
          
          {selectedYear !== 'all' && (
            <div className="mt-4 pt-4 border-t border-blue-500/30 flex items-center gap-2 text-sm">
              {yoyChange !== null ? (
                <>
                  <span className={cn("px-2 py-0.5 rounded-full font-medium text-xs", yoyChange > 0 ? "bg-red-500/20 text-red-100" : yoyChange < 0 ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-500/20 text-slate-100")}>
                    {yoyChange > 0 ? <i className="fa-solid fa-arrow-trend-up mr-1"></i> : yoyChange < 0 ? <i className="fa-solid fa-arrow-trend-down mr-1"></i> : <i className="fa-solid fa-minus mr-1"></i>}
                    {Math.abs(yoyChange).toFixed(1)}%
                  </span>
                  <span className="text-blue-100 opacity-80">เทียบกับปีที่แล้ว ({previousYearData.length} ครั้ง)</span>
                </>
              ) : (
                <span className="text-blue-100 opacity-80">ไม่มีข้อมูลปีที่แล้วสำหรับเปรียบเทียบ</span>
              )}
            </div>
          )}
        </motion.div>

        {/* KPI: Top 3 Incidents */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} 
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <i className="fa-solid fa-fire"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Top 3 อุบัติการณ์ที่พบบ่อยที่สุด</h3>
            <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Area of Focus</span>
          </div>
          
          <div className="space-y-3">
            {topIncidents.length > 0 ? topIncidents.map((incident, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                  idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-orange-400" : "bg-amber-400"
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate pr-4" title={incident.name}>{incident.name}</span>
                    <span className="text-sm font-bold text-slate-900">{incident.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div 
                      className={cn("h-1.5 rounded-full", idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-orange-400" : "bg-amber-400")} 
                      style={{ width: `${(incident.count / topIncidents[0].count) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-slate-400 text-sm">ไม่มีข้อมูลอุบัติการณ์</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Part 2: Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">แนวโน้มอุบัติการณ์รายเดือน (Monthly Trend)</h3>
            <p className="text-xs text-slate-500 mt-1">ปีงบประมาณ ต.ค. - ก.ย.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {monthlyTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3b82f6' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Proportion Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} 
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="mb-2">
            <h3 className="text-lg font-bold text-slate-800">สัดส่วนตามหมวดหมู่</h3>
            <p className="text-xs text-slate-500 mt-1">Proportion of Incident Types</p>
          </div>
          <div className="h-[300px] w-full relative">
            {proportionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={proportionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {proportionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
            )}
            {/* Center Text for Donut */}
            {proportionData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-slate-800">{totalIncidents}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
              </div>
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
                        "group cursor-pointer transition-colors hover:bg-blue-50/50",
                        isExpanded ? "bg-blue-50/30" : "bg-white"
                      )}
                    >
                      <td className="p-4 pl-6 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(item.incident_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium",
                          item.risk_type === 'Clinic' ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"
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
                        ? "bg-blue-600 text-white" 
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
