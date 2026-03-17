import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import IncidentForm from './pages/IncidentForm';
import Dashboard from './pages/Dashboard';
import ChartDashboard from './pages/ChartDashboard';
import DataTable from './pages/DataTable';

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading for the professional feel
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isAppLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center text-white shadow-2xl shadow-maroon-500/30">
                <div className="absolute inset-0 rounded-3xl border-2 border-white/20 animate-ping"></div>
                <motion.i 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="fa-solid fa-microscope text-5xl drop-shadow-lg"
                ></motion.i>
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ระบบบันทึกอุบัติการณ์ความเสี่ยง</h1>
                <p className="text-sm font-medium text-slate-500 tracking-widest uppercase">(Kongrha Lab Incident)</p>
              </div>
              <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-4">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="h-full bg-maroon-700 rounded-full"
                ></motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/report" element={<IncidentForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/charts" element={<ChartDashboard />} />
            <Route path="/data" element={<DataTable />} />
          </Routes>
        </Layout>
      </Router>
    </>
  );
}
