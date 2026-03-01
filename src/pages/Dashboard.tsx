import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function Dashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('incident_date', { ascending: true });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(incidents.map(inc => ({
      'วันที่': inc.incident_date,
      'ประเภทความเสี่ยง': inc.risk_type,
      'ขั้นตอน': inc.process_type || '-',
      'รายการความเสี่ยง': inc.risk_items.join(', ') + (inc.other_risk_item ? `, ${inc.other_risk_item}` : ''),
      'รายละเอียด': inc.incident_details,
      'การแก้ไข': inc.initial_response,
      'ระดับผลกระทบ': inc.impact_level,
      'กลุ่ม': inc.group_type,
      'แนวทางปฏิบัติ': inc.guideline
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidents");
    XLSX.writeFile(wb, `สรุปอุบัติการณ์_${filterYear}.xlsx`);
  };

  // --- Data Processing for Charts ---
  const filteredData = incidents.filter(inc => inc.incident_date.startsWith(filterYear));

  // 1. Process Type Distribution (Pie Chart)
  const processData = [
    { name: 'Pre-analytical', value: filteredData.filter(i => i.process_type === 'Pre-analytical').length },
    { name: 'Analytical', value: filteredData.filter(i => i.process_type === 'Analytical').length },
    { name: 'Post-analytical', value: filteredData.filter(i => i.process_type === 'Post-analytical').length },
    { name: 'อื่นๆ (Non-clinic)', value: filteredData.filter(i => i.risk_type === 'Non-clinic').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#64748b'];

  // 2. Miss vs Near Miss (Pie Chart)
  const groupData = [
    { name: 'Miss', value: filteredData.filter(i => i.group_type === 'Miss').length },
    { name: 'Near Miss', value: filteredData.filter(i => i.group_type === 'Near Miss').length },
  ].filter(d => d.value > 0);
  const GROUP_COLORS = ['#ef4444', '#f59e0b'];

  // 3. Monthly Trend (Line Chart)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthStr = (i + 1).toString().padStart(2, '0');
    return {
      name: `เดือน ${i + 1}`,
      จำนวน: filteredData.filter(inc => inc.incident_date.startsWith(`${filterYear}-${monthStr}`)).length
    };
  });

  // 4. Risk Items Count (Bar Chart)
  const riskItemsCount: Record<string, number> = {};
  filteredData.forEach(inc => {
    inc.risk_items.forEach((item: string) => {
      const shortName = item.substring(0, 30) + (item.length > 30 ? '...' : '');
      riskItemsCount[shortName] = (riskItemsCount[shortName] || 0) + 1;
    });
  });
  const riskItemsData = Object.keys(riskItemsCount).map(key => ({
    name: key,
    จำนวน: riskItemsCount[key]
  })).sort((a, b) => b.จำนวน - a.จำนวน).slice(0, 10); // Top 10

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-500 flex flex-col items-center gap-3">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl"></i>
          <p className="font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <i className="fa-solid fa-chart-pie text-blue-600"></i>
            สรุปรายงานอุบัติการณ์
          </h1>
          <p className="text-slate-500 mt-1">ข้อมูลสถิติและกราฟแสดงแนวโน้มความเสี่ยง</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>ปี ค.ศ. {year}</option>
            ))}
          </select>
          <button 
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-excel"></i>
            Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Type Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">สัดส่วนประเภทขั้นตอนอุบัติการณ์</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} ครั้ง`, 'จำนวน']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Miss vs Near Miss Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">อัตราส่วนระหว่าง Miss : Near Miss</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={groupData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {groupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} ครั้ง`, 'จำนวน']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">กราฟแนวโน้มอุบัติการณ์รายเดือน (ปี {filterYear})</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="จำนวน" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Risk Items Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">10 อันดับรายการความเสี่ยงที่พบมากที่สุด</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskItemsData} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={190} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value} ครั้ง`, 'จำนวน']}
                />
                <Bar dataKey="จำนวน" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
