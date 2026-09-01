import { useEffect, useState } from 'react';
import { fetchNotificationSettings, saveNotificationSettings, NotificationSettings as Settings } from '../lib/dataApi';
import { PageSkeleton } from '../components/Skeleton';

const defaults: Settings = { enabled: true, notifyNearMiss: true, notifyMiss: true, notifyNoHarm: false, dailyReminder: true };
export default function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetchNotificationSettings().then(setSettings).catch(console.error).finally(() => setLoading(false)); }, []);
  const update = async (key: keyof Settings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next); setSaving(true);
    try { await saveNotificationSettings(next); } catch (error) { console.error(error); setSettings(settings); }
    finally { setSaving(false); }
  };
  if (loading) return <PageSkeleton label="กำลังโหลดการตั้งค่าการแจ้งเตือน" />;
  const options: [keyof Settings, string][] = [['enabled','เปิดใช้งานการแจ้งเตือน'], ['notifyNearMiss','แจ้งเตือน Near Miss'], ['notifyMiss','แจ้งเตือน Miss'], ['notifyNoHarm','แจ้งเตือน No Harm'], ['dailyReminder','แจ้งเตือนสรุปประจำวัน เวลา 08:00 น.']];
  return <div className="max-w-3xl space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[.18em] text-maroon-700">System preferences</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">การแจ้งเตือน</h2><p className="mt-1 text-sm text-slate-500">ค่ากลางของระบบ เก็บใน Google Sheets เพื่อให้ผู้ดูแลทุกคนใช้การตั้งค่าเดียวกัน</p></header><section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">{options.map(([key,label]) => <button key={key} disabled={saving} onClick={() => update(key)} className="flex w-full items-center justify-between rounded-xl p-4 text-left transition hover:bg-slate-50 disabled:opacity-60"><span><b className="block text-sm text-slate-800">{label}</b><small className="text-xs text-slate-400">บันทึกส่วนกลางลงแท็บ Settings</small></span><span className={`relative h-6 w-11 rounded-full transition ${settings[key] ? 'bg-maroon-600' : 'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${settings[key] ? 'left-6' : 'left-1'}`} /></span></button>)}</section><p className="rounded-xl bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800">สถานะ: {saving ? 'กำลังบันทึกลง Google Sheets…' : 'ซิงค์ค่ากลางเรียบร้อยแล้ว'}</p></div>;
}
