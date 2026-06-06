import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center text-white font-bold shadow-md shadow-maroon-200">
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
                    ? "bg-maroon-50 text-maroon-700 font-medium" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  "flex items-center justify-center w-6 h-6",
                  isActive ? "text-maroon-700" : "text-slate-400 group-hover:text-slate-600"
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-maroon-600 to-maroon-800 flex items-center justify-center text-white shadow-md flex-shrink-0">
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
        {/* Header (Top Navbar) */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
          {/* Subtle gradient line at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-maroon-300 to-transparent opacity-50"></div>
          
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              aria-label="Open Menu"
            >
              <i className="fa-solid fa-bars text-lg"></i>
            </button>
            <div className="font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-maroon-600 to-maroon-900 flex items-center justify-center text-white shadow-lg shadow-maroon-900/20">
                <i className="fa-solid fa-microscope text-sm"></i>
              </div>
              <span className="text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">Lab Incident</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-slate-50 to-white rounded-full border border-slate-100 shadow-sm text-sm font-medium text-slate-600">
              <div className="w-6 h-6 rounded-full bg-maroon-50 text-maroon-600 flex items-center justify-center">
                <i className="fa-solid fa-location-dot text-xs"></i>
              </div>
              ระบบบันทึกอุบัติการณ์ความเสี่ยง
            </div>
            
            <div className="h-6 w-px bg-slate-200"></div>
            
            <Link 
              to="/report"
              className="group flex items-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-maroon-600 to-maroon-800 px-5 py-2.5 rounded-full hover:from-maroon-700 hover:to-maroon-900 transition-all shadow-[0_4px_14px_0_rgba(153,27,27,0.39)] hover:shadow-[0_6px_20px_rgba(153,27,27,0.23)] hover:-translate-y-[1px]"
            >
              <i className="fa-solid fa-plus group-hover:rotate-90 transition-transform duration-300"></i>
              บันทึกใหม่
            </Link>
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="group flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-5 py-2.5 rounded-full hover:bg-slate-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-[1px]"
            >
              <i className="fa-solid fa-book-open text-slate-400 group-hover:text-maroon-600 transition-colors"></i>
              คู่มือการใช้งาน
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-semibold text-slate-600 border border-slate-100 shadow-sm">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </div>
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
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center text-white font-bold shadow-md">
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
                            ? "bg-maroon-50 text-maroon-700 font-medium" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <i className={cn(item.icon, "w-5 text-center", isActive ? "text-maroon-700" : "text-slate-400")}></i>
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsGuideOpen(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-maroon-50 hover:text-maroon-700 transition-all duration-200 w-full text-left"
                  >
                    <i className="fa-solid fa-book-open w-5 text-center text-slate-400"></i>
                    คู่มือการใช้งาน
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-slate-50">
          <div className="max-w-5xl mx-auto min-h-full flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            
            {/* Footer */}
            <footer className="mt-12 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4 border-t border-slate-200/60">
              <div className="flex flex-col items-center md:items-start gap-1">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <i className="fa-solid fa-shield-halved text-maroon-600"></i>
                  <span>ระบบบริหารความเสี่ยง (Risk Management)</span>
                </div>
                <span className="text-xs font-medium">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลกงหรา</span>
              </div>
              
              <div className="flex flex-col items-center md:items-end gap-1 font-medium">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-code text-slate-400"></i>
                  <span>พัฒนาโดย อรรฆพร ศรีปานรอด นักวิชาการคอมพิวเตอร์ปฏิบัติการ</span>
                </div>
                <a href="https://www.facebook.com/Mootu00" className="text-xs text-maroon-600 hover:text-maroon-800 transition-colors flex items-center gap-1">
                  <i className="fa-solid fa-headset"></i>
                  ติดต่อผู้ดูแลระบบ (IT Support)
                </a>
              </div>
            </footer>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center h-[4.5rem] px-2 relative">
            <Link 
              to="/" 
              className={cn("flex flex-col items-center justify-center w-full relative h-full", location.pathname === '/' ? "text-maroon-700" : "text-slate-400 hover:text-slate-600")}
            >
              <i className="fa-solid fa-house text-xl mb-1 drop-shadow-sm"></i>
              <span className="text-[10px] font-bold tracking-wide">หน้าแรก</span>
            </Link>
            
            <Link 
              to="/dashboard" 
              className={cn("flex flex-col items-center justify-center w-full relative h-full", location.pathname === '/dashboard' || location.pathname === '/charts' ? "text-maroon-700" : "text-slate-400 hover:text-slate-600")}
            >
              <i className="fa-solid fa-chart-pie text-xl mb-1 drop-shadow-sm"></i>
              <span className="text-[10px] font-bold tracking-wide">แดชบอร์ด</span>
            </Link>
            
            {/* Center Prominent Button */}
            <div className="w-full flex justify-center mt-[-40px]">
              <Link 
                to="/report" 
                className="group relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-maroon-600 to-maroon-800 text-white rounded-full shadow-lg shadow-maroon-900/20 border-[6px] border-[#f8fafc] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <i className="fa-solid fa-plus text-2xl group-hover:rotate-90 transition-transform duration-300"></i>
              </Link>
            </div>

            <Link 
              to="/data" 
              className={cn("flex flex-col items-center justify-center w-full relative h-full", location.pathname === '/data' ? "text-maroon-700" : "text-slate-400 hover:text-slate-600")}
            >
              <i className="fa-solid fa-table-list text-xl mb-1 drop-shadow-sm"></i>
              <span className="text-[10px] font-bold tracking-wide">ตาราง</span>
            </Link>
            
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="flex flex-col items-center justify-center w-full text-slate-400 hover:text-slate-600 relative h-full"
            >
              <i className="fa-solid fa-bars text-xl mb-1 drop-shadow-sm"></i>
              <span className="text-[10px] font-bold tracking-wide">เมนู</span>
            </button>
          </div>
        </nav>

        {/* User Guide Modal */}
        <AnimatePresence>
          {isGuideOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center">
                      <i className="fa-solid fa-book-open"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">คู่มือการใช้งานระบบ</h3>
                      <p className="text-xs text-slate-500">Kongrha Lab Incident Management Guide</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsGuideOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
                <div className="flex-1 bg-slate-50 relative">
                  <iframe
                    src="https://www.canva.com/design/DAHENtDojFw/5bIxztVzF9sD4Bmgom-OoA/view?embed"
                    className="absolute inset-0 w-full h-full border-none"
                    allowFullScreen
                    title="User Guide"
                  ></iframe>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <button
                    onClick={() => setIsGuideOpen(false)}
                    className="px-8 py-2.5 bg-maroon-700 text-white rounded-xl font-medium hover:bg-maroon-800 transition-all shadow-lg shadow-maroon-200"
                  >
                    ปิดคู่มือ
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
