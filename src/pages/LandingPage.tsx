import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-maroon-700 to-maroon-900 rounded-3xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 px-8 py-16 md:py-24 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-6 max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm border border-white/10"
            >
              <i className="fa-solid fa-shield-heart"></i>
              Patient Safety & Quality
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
            >
              ระบบบันทึกอุบัติการณ์ความเสี่ยง
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-maroon-100 font-light"
            >
              กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลกงหรา
              <br className="hidden md:block" />
              เพื่อการบริหารจัดการความเสี่ยงอย่างมีประสิทธิภาพ และยกระดับคุณภาพการให้บริการ
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-4"
            >
              <Link 
                to="/report" 
                className="w-full sm:w-auto px-8 py-4 bg-white text-maroon-700 hover:bg-maroon-50 hover:scale-105 transition-all duration-300 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                เริ่มบันทึกอุบัติการณ์
              </Link>
              <Link 
                to="/charts" 
                className="w-full sm:w-auto px-8 py-4 bg-maroon-700/50 text-white hover:bg-maroon-700/70 transition-all duration-300 rounded-2xl font-medium text-lg backdrop-blur-sm border border-white/10 flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-chart-pie"></i>
                ดูสรุปข้อมูล
              </Link>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="hidden lg:flex w-72 h-72 bg-white/10 backdrop-blur-md rounded-full items-center justify-center border-8 border-white/20 shadow-2xl relative"
          >
            <div className="absolute inset-0 rounded-full border border-white/30 animate-[spin_10s_linear_infinite]"></div>
            <i className="fa-solid fa-microscope text-8xl text-white drop-shadow-lg"></i>
          </motion.div>
        </div>
      </section>

      {/* Guide Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">แนะนำการใช้งานระบบ</h2>
          <p className="text-slate-500">ข้อมูลเบื้องต้นเพื่อให้คุณใช้งานระบบได้อย่างถูกต้องและเกิดประโยชน์สูงสุด</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-maroon-50 text-maroon-600 flex items-center justify-center text-2xl shadow-inner">
              <i className="fa-solid fa-users"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800">ใครควรใช้ระบบนี้</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              บุคลากรในกลุ่มงานเทคนิคการแพทย์ทุกคน ที่พบเห็นหรือเกี่ยวข้องกับเหตุการณ์ความเสี่ยง ทั้งที่เกิดผลกระทบแล้ว (Miss) หรือเกือบเกิดผลกระทบ (Near Miss)
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-maroon-50 to-transparent rounded-bl-full -z-10"></div>
            <div className="w-16 h-16 rounded-2xl bg-maroon-50 text-maroon-600 flex items-center justify-center text-2xl shadow-inner">
              <i className="fa-solid fa-list-check"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800">ขั้นตอนการบันทึก</h3>
            <ul className="text-slate-600 text-sm leading-relaxed text-left space-y-2 w-full px-4">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                เลือกประเภทความเสี่ยง
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                กรอกรายละเอียดและระดับผลกระทบ
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                ระบุผู้รับผิดชอบ ตรวจทาน และกดยืนยัน
              </li>
            </ul>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner">
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800">การนำข้อมูลไปใช้</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              ข้อมูลทั้งหมดจะถูกนำไปวิเคราะห์ในกระบวนการ Risk Management, QA และ CQI เพื่อหาแนวทางป้องกันไม่ให้เกิดซ้ำ และพัฒนาคุณภาพบริการอย่างต่อเนื่อง
            </p>
          </motion.div>
        </div>
      </section>

      {/* User Status Section */}
      <section className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl shadow-md">
            <i className="fa-solid fa-user-doctor"></i>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">สถานะการใช้งานปัจจุบัน</p>
            <h4 className="text-lg font-bold text-slate-800">บุคลากรกลุ่มงานเทคนิคการแพทย์</h4>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          ระบบออนไลน์ พร้อมใช้งาน
        </div>
      </section>
    </div>
  );
}
