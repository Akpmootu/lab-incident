import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', icon: 'fa-solid fa-house', label: 'หน้าแรก' },
    { path: '/report', icon: 'fa-solid fa-pen-to-square', label: 'บันทึกอุบัติการณ์' },
    { path: '/dashboard', icon: 'fa-solid fa-table', label: 'สรุปข้อมูล (ตาราง)' },
    { path: '/charts', icon: 'fa-solid fa-chart-pie', label: 'สรุปข้อมูล (กราฟ)' },
    { path: '/data', icon: 'fa-solid fa-table-list', label: 'ตารางข้อมูล' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Sidebar (Desktop) */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="hidden md:flex flex-col bg-white border-r border-slate-200 shadow-sm z-20 transition-all duration-300"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-200">
                  <i className="fa-solid fa-microscope"></i>
                </div>
                <span className="font-bold text-slate-800 tracking-tight">Lab Incident</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            aria-label="Toggle Sidebar"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  "flex items-center justify-center w-6 h-6",
                  isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <i className={item.icon}></i>
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Profile Box */}
        <div className="p-4 border-t border-slate-100">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-sm transition-all",
            !isSidebarOpen && "justify-center"
          )}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <i className="fa-solid fa-user-doctor"></i>
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-800 truncate">กลุ่มงานเทคนิคการแพทย์</p>
                <p className="text-xs text-slate-500 truncate">ผู้ใช้งานระบบ</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header (Mobile & Pinned) */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
              aria-label="Open Menu"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <i className="fa-solid fa-microscope"></i>
              </div>
              Lab Incident
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <i className="fa-solid fa-location-dot text-blue-500"></i>
              ระบบบันทึกอุบัติการณ์ความเสี่ยง
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <Link 
              to="/report"
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <i className="fa-solid fa-plus"></i>
              บันทึกใหม่
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              ระบบพร้อมใช้งาน
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 md:hidden flex flex-col"
              >
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                      <i className="fa-solid fa-microscope"></i>
                    </div>
                    <span className="font-bold text-slate-800 tracking-tight">Lab Incident</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                    aria-label="Close Menu"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                          isActive 
                            ? "bg-blue-50 text-blue-600 font-medium" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <i className={cn(item.icon, "w-5 text-center", isActive ? "text-blue-600" : "text-slate-400")}></i>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slate-50 border-t border-slate-200 py-6 px-6 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 z-10 gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <i className="fa-solid fa-shield-halved text-blue-500"></i>
              <span>ระบบบริหารความเสี่ยง (Risk Management)</span>
            </div>
            <span className="text-xs">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลกงหรา</span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-1">
            <div className="flex items-center gap-2 font-medium">
              <i className="fa-solid fa-code text-slate-400"></i>
              <span>พัฒนาโดย อรรฆพร ศรีปานรอด นวก.คอม</span>
            </div>
            <a href="https://www.facebook.com/Mootu00" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              <i className="fa-solid fa-headset"></i>
              ติดต่อผู้ดูแลระบบ (IT Support)
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
