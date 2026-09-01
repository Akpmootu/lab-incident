import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: 'fa-solid fa-grid-2', label: 'ภาพรวม' },
  { path: '/report', icon: 'fa-solid fa-pen-to-square', label: 'บันทึกเหตุการณ์' },
  { path: '/charts', icon: 'fa-solid fa-chart-pie', label: 'Executive Dashboard' },
  { path: '/dashboard', icon: 'fa-solid fa-table', label: 'สรุปแบบตาราง' },
  { path: '/data', icon: 'fa-solid fa-list-check', label: 'รายการทั้งหมด' },
  { path: '/audit', icon: 'fa-solid fa-clock-rotate-left', label: 'Audit Log' },
  { path: '/settings/notifications', icon: 'fa-solid fa-bell', label: 'การแจ้งเตือน' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const active = navItems.find(item => item.path === location.pathname) ?? navItems[0];
  const configuredVersion = import.meta.env.VITE_DEPLOY_VERSION || '';
  const deployVersion = /^\d+\.\d+\.\d+$/.test(configuredVersion) ? configuredVersion : '1.1.0';
  const deployRef = import.meta.env.VITE_DEPLOY_REF || 'local';

  const Nav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn('flex flex-col gap-1', mobile ? 'p-4' : 'p-3')}>
      <p className={cn('px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400', collapsed && !mobile && 'hidden')}>Workspace</p>
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={isActive ? 'page' : undefined}
            className={cn('group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200', isActive ? 'bg-maroon-50 text-maroon-800 shadow-sm ring-1 ring-maroon-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900', collapsed && !mobile && 'justify-center px-2')}>
            {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-maroon-600" />}
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-colors', isActive ? 'bg-maroon-600 text-white shadow-sm shadow-maroon-600/20' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200')}><i className={item.icon} /></span>
            <span className={cn('truncate font-medium', collapsed && !mobile && 'hidden')}>{item.label}</span>
            {collapsed && !mobile && <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-900">
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-[width] duration-200 md:flex md:flex-col', collapsed ? 'w-[84px]' : 'w-[264px]')}>
        <div className={cn('flex h-[76px] items-center border-b border-slate-100 px-4', collapsed ? 'justify-center' : 'justify-between')}>
          <Link to="/" className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-maroon-300 shadow-lg shadow-slate-900/15"><i className="fa-solid fa-microscope" /></span>
            {!collapsed && <span><span className="block text-sm font-bold tracking-tight text-slate-950">Lab Incident</span><span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Kongrha Laboratory</span></span>}
          </Link>
          {!collapsed && <button onClick={() => setCollapsed(true)} className="icon-button" aria-label="ย่อเมนู"><i className="fa-solid fa-sidebar" /></button>}
        </div>
        {collapsed && <button onClick={() => setCollapsed(false)} className="mx-auto mt-4 icon-button" aria-label="ขยายเมนู"><i className="fa-solid fa-sidebar-flip" /></button>}
        <div className="flex-1 overflow-y-auto py-5"><Nav /></div>
        <div className={cn('border-t border-slate-100 p-4', collapsed && 'px-3')}>
          <div className={cn('flex items-center gap-3 rounded-xl bg-slate-50 p-3', collapsed && 'justify-center p-2')}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon-100 text-maroon-700"><i className="fa-solid fa-user-doctor" /></span>
            {!collapsed && <span className="min-w-0"><b className="block truncate text-xs text-slate-800">กลุ่มงานเทคนิคการแพทย์</b><small className="text-[11px] text-slate-400">ผู้ใช้งานระบบ</small></span>}
          </div>
        </div>
      </aside>

      <AnimatePresence>{mobileOpen && <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden" /><motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: .2 }} className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white md:hidden"><div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-maroon-300"><i className="fa-solid fa-microscope" /></span><b>Lab Incident</b></div><button onClick={() => setMobileOpen(false)} className="icon-button" aria-label="ปิดเมนู"><i className="fa-solid fa-xmark" /></button></div><Nav mobile /></motion.aside></>}</AnimatePresence>

      <div className={cn('min-h-screen transition-[padding] duration-200 md:pl-[264px]', collapsed && 'md:pl-[84px]')}>
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="icon-button md:hidden" aria-label="เปิดเมนู"><i className="fa-solid fa-bars" /></button><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-maroon-700">Risk intelligence</p><h1 className="text-base font-semibold text-slate-900 sm:text-lg">{active.label}</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-4"><span className="status-live hidden sm:inline-flex"><span className="status-dot" /> Google Sheets synced</span><Link to="/report" className="primary-button"><i className="fa-solid fa-plus" /><span className="hidden sm:inline">บันทึกใหม่</span></Link></div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-76px)] max-w-[1440px] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8">{children}<footer className="mt-10 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-semibold text-slate-500">Powered by กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลกงหรา</p><p className="mt-0.5">Created by Mr.Akaporn Sripanrod</p></div><div className="text-left sm:text-right"><p className="font-mono font-semibold text-slate-500">Version {deployVersion}</p><p className="font-mono text-[10px] text-slate-400">Build {deployRef}</p></div></div></footer></main>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl md:hidden"><div className="mx-auto flex max-w-md justify-around">{navItems.slice(0, 4).map(item => <Link key={item.path} to={item.path} className={cn('flex min-w-0 flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium', location.pathname === item.path ? 'text-maroon-700' : 'text-slate-400')}><i className={cn(item.icon, 'text-base')} /><span className="max-w-[72px] truncate">{item.label.replace('Executive Dashboard', 'Dashboard')}</span></Link>)}</div></div>
    </div>
  );
}
