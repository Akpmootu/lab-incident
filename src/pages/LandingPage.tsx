import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchIncidents, IncidentRecord } from '../lib/dataApi';

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function formatThaiDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LandingPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchIncidents().then(setIncidents).catch(console.error).finally(() => setLoading(false)); }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = isoDate(now);
    const monthItems = incidents.filter(item => String(item.incident_date).startsWith(month));
    const nearMiss = monthItems.filter(item => item.group_type === 'Near Miss').length;
    const todayItems = incidents.filter(item => String(item.incident_date).slice(0, 10) === today).length;
    const recent = [...incidents].sort((a, b) => String(b.created_at || b.incident_date).localeCompare(String(a.created_at || a.incident_date))).slice(0, 5);
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (13 - index));
      const key = isoDate(date);
      return { key, value: incidents.filter(item => String(item.incident_date).slice(0, 10) === key).length };
    });
    const trendTotal = days.reduce((sum, item) => sum + item.value, 0);
    return { monthItems, nearMiss, todayItems, recent, days, trendTotal };
  }, [incidents]);

  const cards = [
    { label: 'Incident เดือนนี้', value: metrics.monthItems.length, caption: 'รายการที่บันทึกในเดือนปัจจุบัน', icon: 'fa-solid fa-chart-line', accent: 'text-maroon-700 bg-maroon-50' },
    { label: 'Near Miss', value: metrics.nearMiss, caption: 'เหตุการณ์เกือบเกิดผลกระทบ', icon: 'fa-solid fa-shield-heart', accent: 'text-violet-700 bg-violet-50' },
    { label: 'บันทึกวันนี้', value: metrics.todayItems, caption: 'รายการใหม่ของวันนี้', icon: 'fa-solid fa-calendar-check', accent: 'text-emerald-700 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[28px] bg-[#4a0e18] p-6 text-white shadow-xl shadow-maroon-900/10 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border-[28px] border-white/5" />
        <div className="pointer-events-none absolute bottom-[-100px] right-24 h-64 w-64 rounded-full bg-maroon-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-maroon-100"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Clinical Command Center</div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">ศูนย์บัญชาการ<br className="hidden sm:block" /> ความเสี่ยงห้องปฏิบัติการ</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-maroon-100 sm:text-base">ภาพรวมเพื่อการตัดสินใจที่รวดเร็ว ช่วยให้ทีมมองเห็นความเสี่ยง มองเห็นรูปแบบความเสี่ยงและยกระดับคุณภาพบริการได้ในที่เดียว</p>
          </div>
          <Link to="/report" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-maroon-800 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-maroon-50 focus:outline-none focus:ring-4 focus:ring-white/30"><i className="fa-solid fa-pen-to-square" /> บันทึกความเสี่ยงใหม่ <i className="fa-solid fa-arrow-right text-xs" /></Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวชี้วัดสำคัญ">
        {cards.map((card, index) => <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-sm font-semibold text-slate-500">{card.label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}><i className={card.icon} /></span></div><p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-100" /> : card.value}</p><p className="mt-1 text-xs text-slate-400">{card.caption}</p></motion.div>)}
      </section>

      <section className="grid gap-6 lg:grid-cols-1">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-700">Activity pulse</p><h2 className="mt-1 text-xl font-bold text-slate-950">แนวโน้มการบันทึก 14 วัน</h2></div><span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{metrics.trendTotal} รายการ</span></div><div className="mt-8 flex h-36 items-end gap-1.5 sm:gap-3">{metrics.days.map(day => <div key={day.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="relative w-full rounded-t-lg bg-maroon-100 transition group-hover:bg-maroon-500" style={{ height: `${Math.max(day.value ? (day.value / Math.max(...metrics.days.map(item => item.value), 1)) * 100 : 6, 6)}%` }}><span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">{day.value}</span></div><span className="text-[9px] text-slate-400">{day.key.slice(8)}</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-maroon-500" /> จำนวน Incident ที่บันทึกต่อวัน</div></div>

      </section>

      <section className="grid gap-6 lg:grid-cols-1">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-700">Recent activity</p><h2 className="mt-1 text-xl font-bold text-slate-950">กิจกรรมล่าสุด</h2></div><Link to="/charts" className="text-xs font-semibold text-maroon-700 hover:underline">รายงานผู้บริหาร</Link></div><div className="mt-4 divide-y divide-slate-100">{loading ? [1, 2, 3].map(item => <div key={item} className="flex animate-pulse gap-3 py-3"><span className="h-9 w-9 rounded-lg bg-slate-100" /><span className="h-4 flex-1 rounded bg-slate-100" /></div>) : metrics.recent.map((item, index) => <div key={item.id || index} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maroon-50 text-maroon-700"><i className="fa-solid fa-file-waveform" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.risk_type || 'Incident ใหม่'}</p><p className="text-xs text-slate-400">{formatThaiDate(String(item.incident_date).slice(0, 10))} · {item.group_type || 'ไม่ระบุประเภท'}</p></div></div>)}</div></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-4"><Link to="/report" className="quick-action"><i className="fa-solid fa-plus" /><span>บันทึกใหม่</span></Link><Link to="/data" className="quick-action"><i className="fa-solid fa-list" /><span>ดูรายการทั้งหมด</span></Link><Link to="/audit" className="quick-action"><i className="fa-solid fa-shield-halved" /><span>Audit Log</span></Link><Link to="/charts" className="quick-action"><i className="fa-solid fa-chart-pie" /><span>รายงานผู้บริหาร</span></Link></section>
    </div>
  );
}
