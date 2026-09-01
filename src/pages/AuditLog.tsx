import { useEffect, useState } from 'react';
import { fetchAuditLog, AuditEvent } from '../lib/dataApi';
import { PageSkeleton } from '../components/Skeleton';

export default function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchAuditLog().then(setEvents).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <PageSkeleton label="กำลังโหลด audit log" />;
  return <div className="bento-dashboard space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[.18em] text-maroon-700">Governance & accountability</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Audit Log</h2><p className="mt-1 text-sm text-slate-500">ประวัติการแก้ไขข้อมูล เพื่อการทบทวนและตัดสินใจอย่างโปร่งใส</p></header><section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><span className="text-sm font-semibold text-slate-800">กิจกรรมล่าสุด</span><span className="rounded-full bg-maroon-50 px-3 py-1 text-xs font-semibold text-maroon-700">{events.length} รายการ</span></div>{events.length === 0 ? <div className="px-5 py-16 text-center text-sm text-slate-400">ยังไม่มีประวัติการแก้ไข</div> : <div className="divide-y divide-slate-100">{events.slice().reverse().map(event => <article key={event.id} className="grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr_auto] md:items-center"><div><p className="text-xs font-mono text-slate-500">{new Date(event.edited_at).toLocaleString('th-TH')}</p><p className="mt-1 text-xs text-slate-400">โดย {event.edited_by || 'ระบบ'}</p></div><div><p className="text-sm font-semibold text-slate-800">แก้ไขเหตุการณ์ <span className="font-mono text-xs text-maroon-700">{event.incident_id.slice(0, 8)}</span></p><p className="mt-1 text-xs text-slate-500">เปลี่ยนแปลง {Object.keys(event.changes || {}).length} ฟิลด์</p></div><span className="justify-self-start rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 md:justify-self-end">ตรวจสอบแล้ว</span></article>)}</div>}</section></div>;
}
