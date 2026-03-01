import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const RISK_TYPES = [
  { id: 'Clinic', label: 'Clinic', icon: 'fa-solid fa-stethoscope', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'Non-clinic', label: 'Non-clinic', icon: 'fa-solid fa-building', color: 'text-orange-500', bg: 'bg-orange-50' },
];

const PROCESS_TYPES = [
  { id: 'Pre-analytical', label: 'Pre-analytical', icon: 'fa-solid fa-vial' },
  { id: 'Analytical', label: 'Analytical', icon: 'fa-solid fa-microscope' },
  { id: 'Post-analytical', label: 'Post-analytical', icon: 'fa-solid fa-file-medical' },
];

const RISK_ITEMS = {
  'Pre-analytical': [
    'สิ่งส่งตรวจเก็บในภาชนะที่ไม่ถูกต้อง,ใช้สารกันเลือดแข็งไม่ถูกต้อง,สัดส่วนของปริมาณเลือดต่อสารกันเลือดแข็งไม่ถูกต้อง',
    'สิ่งส่งตรวจน้อยไม่เพียงพอกับปริมาณที่กำหนด',
    'สิ่งส่งตรวจอยู่ในสภาพที่ไม่เหมาะสม เช่น หกเลอะเทอะ',
    'ชื่อ-สกุล,HN ที่สิ่งส่งตรวจไม่มี ไม่ถูกต้อง หรือผิดพลาด',
    'พบก้อน Clot ในสิ่งส่งตรวจที่ใส่สารกันเลือดแข็ง เช่น CBC',
    'สิ่งส่งตรวจ Hemolysis',
    'ไม่มีตัวอย่างส่งตรวจ',
    'สิ่งส่งตรวจที่เก็บไว้นานเกินไป ไม่ตรงตามข้อกำหนดทางห้องปฏิบัติการ',
    'เจ้าหน้าที่โดนเข็มตำ',
    'ผู้ป่วยเป็นลมขณะเจาะเลือด'
  ],
  'Analytical': [
    'ตรวจวิเคราะห์ไม่ครบ,ไม่ตรง ตามรายการที่แพทย์สั่ง',
    'น้ำยา,Stripตรวจวิเคราะห์ไม่พร้อมใช้งาน',
    'เครื่องตรวจวิเคราะห์ขัดข้อง(เกิน 24 ชม.)',
    'QC ไม่ผ่านเกณฑ์ที่กำหนด ไม่สามารถแก้ไขได้',
    'ระบบ HIS,LIS ขัดข้อง มีปัญหา ไม่สามารถใช้งานได้ (เกิน 24 ชม.)'
  ],
  'Post-analytical': [
    'รายงานผลการตรวจวิเคราะห์ผิดพลาด(near miss)',
    'รายงานผลการตรวจวิเคราะห์ผิดพลาด(miss)',
    'ลงผลการตรวจวิเคราะห์ ผิดพลาด,ผิดคน,ไม่ครบถ้วน',
    'การออกใบนัดให้ผู้ป่วย ไม่ระบุรายละเอียดให้ครบถ้วน/ ผิดพลาด',
    'ออกผลการตรวจวิเคราะห์ล่าช้าตามระยะเวลาที่ห้องปฏิบัติการกำหนด',
    'ไม่เก็บสิ่งส่งตรวจตามแนวทางที่ห้องปฏิบัติการกำหนด',
    'ทำลายสิ่งส่งตรวจ ไม่ถูกต้อง ตามแนวทางห้องปฏิบัติการสอดคล้องแนวทาง IC โรงพยาบาล'
  ],
  'Non-clinic': [
    'ระบบไฟฟ้าเครื่องสำรองไฟ ขัดข้อง,เสียหาย ไม่พร้อมใช้งาน',
    'หลังคารั่วซึม มีการชำรุด',
    'น้ำประปาไม่ไหล',
    'เครื่องทำความเย็น ชำรุดเสียหาย,รั่วซึม',
    'โทรศัพท์ คอมพิวเตอร์ เสียหายไม่พร้อมใช้งาน',
    'ระบบสารสนเทศ อินเตอร์เน็ตล่าช้า เสียหายไม่พร้อมใช้งาน',
    'อุปกรณ์ วัสดุ เครื่องมือต่างๆ ไม่มี,ไม่พร้อมใช้งาน',
    'ส่ง EQA ไม่ทันเวลา',
    'เอกสารสูญหาย',
    'เครื่องมือเสียหาย/ชำรุด/ไม่พร้อมใช้งาน'
  ]
};

const IMPACT_LEVELS_CLINIC = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const IMPACT_LEVELS_NON_CLINIC = ['0', '1', '2', '3', '4'];

export default function IncidentForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    incident_date: new Date().toISOString().split('T')[0],
    risk_type: '',
    process_type: '',
    risk_items: [] as string[],
    other_risk_item: '',
    incident_details: '',
    initial_response: '',
    impact_level: '',
    group_type: '',
    guideline: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleCheckboxChange = (item: string) => {
    setFormData(prev => {
      const newItems = prev.risk_items.includes(item)
        ? prev.risk_items.filter(i => i !== item)
        : [...prev.risk_items, item];
      return { ...prev, risk_items: newItems };
    });
    if (errors.risk_items) {
      setErrors(prev => ({ ...prev, risk_items: false }));
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.incident_date) newErrors.incident_date = true;
      if (!formData.risk_type) newErrors.risk_type = true;
      if (formData.risk_type === 'Clinic' && !formData.process_type) newErrors.process_type = true;
    } else if (step === 2) {
      if (formData.risk_items.length === 0 && !formData.other_risk_item) newErrors.risk_items = true;
    } else if (step === 3) {
      if (!formData.incident_details) newErrors.incident_details = true;
      if (!formData.initial_response) newErrors.initial_response = true;
    } else if (step === 4) {
      if (!formData.impact_level) newErrors.impact_level = true;
      if (!formData.group_type) newErrors.group_type = true;
      if (!formData.guideline) newErrors.guideline = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
      // Trigger shake animation by temporarily adding and removing a class if needed
    }

    return isValid;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      // 1. Save to Supabase
      const { error } = await supabase
        .from('incidents')
        .insert([
          {
            incident_date: formData.incident_date,
            risk_type: formData.risk_type,
            process_type: formData.process_type || null,
            risk_items: formData.risk_items,
            other_risk_item: formData.other_risk_item,
            incident_details: formData.incident_details,
            initial_response: formData.initial_response,
            impact_level: formData.impact_level,
            group_type: formData.group_type,
            guideline: formData.guideline
          }
        ]);

      if (error) throw error;

      // 2. Send Telegram Notification via Backend
      const message = `
🚨 <b>แจ้งเตือนอุบัติการณ์ใหม่</b>
📅 <b>วันที่:</b> ${formData.incident_date}
🏥 <b>ประเภท:</b> ${formData.risk_type} ${formData.process_type ? `(${formData.process_type})` : ''}
⚠️ <b>ความรุนแรง:</b> ระดับ ${formData.impact_level} (${formData.group_type})
📝 <b>รายละเอียด:</b> ${formData.incident_details.substring(0, 100)}${formData.incident_details.length > 100 ? '...' : ''}
      `;

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      Swal.fire({
        title: 'บันทึกสำเร็จ! ✅',
        text: 'ข้อมูลอุบัติการณ์ถูกบันทึกเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'ตกลง'
      });

      // Reset form
      setFormData({
        incident_date: new Date().toISOString().split('T')[0],
        risk_type: '',
        process_type: '',
        risk_items: [],
        other_risk_item: '',
        incident_details: '',
        initial_response: '',
        impact_level: '',
        group_type: '',
        guideline: ''
      });
      setStep(1);

    } catch (error: any) {
      console.error('Error saving incident:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด! ❌',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskItemsList = () => {
    if (formData.risk_type === 'Non-clinic') return RISK_ITEMS['Non-clinic'];
    if (formData.process_type) return RISK_ITEMS[formData.process_type as keyof typeof RISK_ITEMS] || [];
    return [];
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `${((step - 1) / 4) * 100}%` }}
        ></div>
        
        {[1, 2, 3, 4, 5].map((s) => (
          <div 
            key={s} 
            className={cn(
              "relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors duration-300 border-2",
              step >= s ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200" : "bg-white text-slate-400 border-slate-200",
              step === s && "ring-4 ring-blue-100"
            )}
          >
            {s < step ? <i className="fa-solid fa-check"></i> : s}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 px-1">
        <span>ข้อมูลทั่วไป</span>
        <span>รายการความเสี่ยง</span>
        <span>รายละเอียด</span>
        <span>ผลกระทบ</span>
        <span>สรุป</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fa-solid fa-file-signature"></i>
          แบบบันทึกอุบัติการณ์ความเสี่ยง
        </h2>
        <p className="text-blue-100 mt-1 opacity-90">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลกงหรา</p>
      </div>

      <div className="p-6 md:p-8">
        {renderStepIndicator()}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: General Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className={cn("floating-label-group bg-slate-50 rounded-xl border", errors.incident_date ? "border-red-300 shake" : "border-slate-200")}>
                  <input
                    type="date"
                    id="incident_date"
                    value={formData.incident_date}
                    onChange={(e) => handleInputChange('incident_date', e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-800"
                    placeholder=" "
                  />
                  <label htmlFor="incident_date">วันที่เกิดอุบัติการณ์</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">ประเภทความเสี่ยง</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {RISK_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => {
                          handleInputChange('risk_type', type.id);
                          if (type.id === 'Non-clinic') handleInputChange('process_type', '');
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                          formData.risk_type === type.id 
                            ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100" 
                            : cn("border-slate-200 hover:border-slate-300 hover:bg-slate-50", errors.risk_type && "border-red-300 shake")
                        )}
                      >
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-xl", type.bg, type.color)}>
                          <i className={type.icon}></i>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{type.label}</div>
                          <div className="text-xs text-slate-500">คลิกเพื่อเลือกประเภท</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.risk_type === 'Clinic' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t border-slate-100"
                  >
                    <label className="block text-sm font-medium text-slate-700 mb-3">ขั้นตอนอุบัติการณ์</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PROCESS_TYPES.map(type => (
                        <button
                          key={type.id}
                          onClick={() => handleInputChange('process_type', type.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center",
                            formData.process_type === type.id 
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" 
                              : cn("border-slate-200 hover:border-slate-300 text-slate-600", errors.process_type && "border-red-300 shake")
                          )}
                        >
                          <i className={cn(type.icon, "text-2xl mb-1")}></i>
                          <span className="font-medium text-sm">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 2: Risk Items */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                  <i className="fa-solid fa-circle-info mt-1"></i>
                  <div>
                    <p className="font-medium">บัญชีความเสี่ยง ({formData.risk_type === 'Clinic' ? formData.process_type : 'ทั่วไป'})</p>
                    <p className="text-sm opacity-80">สามารถเลือกได้มากกว่า 1 รายการ</p>
                  </div>
                </div>

                <div className={cn("space-y-2 max-h-[400px] overflow-y-auto pr-2", errors.risk_items && "p-2 border border-red-300 rounded-xl shake")}>
                  {getRiskItemsList().map((item, index) => (
                    <label 
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        formData.risk_items.includes(item) ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="relative flex items-center mt-0.5">
                        <input
                          type="checkbox"
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 checked:border-blue-600 checked:bg-blue-600 transition-all"
                          checked={formData.risk_items.includes(item)}
                          onChange={() => handleCheckboxChange(item)}
                        />
                        <i className="fa-solid fa-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                      </div>
                      <span className={cn("text-sm", formData.risk_items.includes(item) ? "text-blue-900 font-medium" : "text-slate-700")}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="floating-label-group bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    id="other_risk_item"
                    value={formData.other_risk_item}
                    onChange={(e) => handleInputChange('other_risk_item', e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-800"
                    placeholder=" "
                  />
                  <label htmlFor="other_risk_item">รายการอื่นๆ (ถ้ามี)</label>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div className={cn("floating-label-group bg-slate-50 rounded-xl border", errors.incident_details ? "border-red-300 shake" : "border-slate-200")}>
                  <textarea
                    id="incident_details"
                    rows={4}
                    value={formData.incident_details}
                    onChange={(e) => handleInputChange('incident_details', e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-800 resize-none"
                    placeholder=" "
                  ></textarea>
                  <label htmlFor="incident_details">รายละเอียดอุบัติการณ์</label>
                </div>

                <div className={cn("floating-label-group bg-slate-50 rounded-xl border", errors.initial_response ? "border-red-300 shake" : "border-slate-200")}>
                  <textarea
                    id="initial_response"
                    rows={4}
                    value={formData.initial_response}
                    onChange={(e) => handleInputChange('initial_response', e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-800 resize-none"
                    placeholder=" "
                  ></textarea>
                  <label htmlFor="initial_response">การแก้ไขเบื้องต้น</label>
                </div>
              </div>
            )}

            {/* Step 4: Impact & Guidelines */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">ระดับผลกระทบ (ความรุนแรง)</label>
                  <div className="flex flex-wrap gap-2">
                    {(formData.risk_type === 'Clinic' ? IMPACT_LEVELS_CLINIC : IMPACT_LEVELS_NON_CLINIC).map(level => {
                      // Color coding logic
                      let colorClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
                      const isHigh = formData.risk_type === 'Clinic' ? ['G','H','I'].includes(level) : ['3','4'].includes(level);
                      const isMed = formData.risk_type === 'Clinic' ? ['E','F'].includes(level) : ['2'].includes(level);
                      const isLow = formData.risk_type === 'Clinic' ? ['A','B','C','D'].includes(level) : ['0','1'].includes(level);
                      
                      if (formData.impact_level === level) {
                        if (isHigh) colorClass = "bg-red-500 text-white border-red-600 shadow-md shadow-red-200";
                        else if (isMed) colorClass = "bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-200";
                        else colorClass = "bg-green-500 text-white border-green-600 shadow-md shadow-green-200";
                      }

                      return (
                        <button
                          key={level}
                          onClick={() => handleInputChange('impact_level', level)}
                          className={cn(
                            "w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all flex items-center justify-center",
                            colorClass,
                            errors.impact_level && !formData.impact_level && "border-red-300 shake"
                          )}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">การจัดกลุ่ม</label>
                  <div className="flex gap-4">
                    {['Miss', 'Near Miss'].map(type => (
                      <button
                        key={type}
                        onClick={() => handleInputChange('group_type', type)}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all",
                          formData.group_type === type 
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                            : cn("border-slate-200 text-slate-600 hover:bg-slate-50", errors.group_type && "border-red-300 shake")
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn("floating-label-group bg-slate-50 rounded-xl border", errors.guideline ? "border-red-300 shake" : "border-slate-200")}>
                  <textarea
                    id="guideline"
                    rows={4}
                    value={formData.guideline}
                    onChange={(e) => handleInputChange('guideline', e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-800 resize-none"
                    placeholder=" "
                  ></textarea>
                  <label htmlFor="guideline">แนวทางปฏิบัติ</label>
                </div>
              </div>
            )}

            {/* Step 5: Summary */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">สรุปข้อมูลก่อนบันทึก</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">วันที่เกิดอุบัติการณ์</p>
                      <p className="font-medium text-slate-800">{formData.incident_date}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">ประเภทความเสี่ยง</p>
                      <p className="font-medium text-slate-800">
                        {formData.risk_type} {formData.process_type && `- ${formData.process_type}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">ระดับผลกระทบ</p>
                      <p className="font-medium text-slate-800">ระดับ {formData.impact_level}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">การจัดกลุ่ม</p>
                      <p className="font-medium text-slate-800">{formData.group_type}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 text-sm mb-1">รายการความเสี่ยง</p>
                    <ul className="list-disc list-inside text-sm font-medium text-slate-800 space-y-1">
                      {formData.risk_items.map((item, i) => <li key={i}>{item}</li>)}
                      {formData.other_risk_item && <li>อื่นๆ: {formData.other_risk_item}</li>}
                    </ul>
                  </div>

                  <div>
                    <p className="text-slate-500 text-sm mb-1">รายละเอียดอุบัติการณ์</p>
                    <p className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-100">{formData.incident_details}</p>
                  </div>

                  <div>
                    <p className="text-slate-500 text-sm mb-1">การแก้ไขเบื้องต้น</p>
                    <p className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-100">{formData.initial_response}</p>
                  </div>

                  <div>
                    <p className="text-slate-500 text-sm mb-1">แนวทางปฏิบัติ</p>
                    <p className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-100">{formData.guideline}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
          <button
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={cn(
              "px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2",
              step === 1 ? "opacity-0 pointer-events-none" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <i className="fa-solid fa-arrow-left"></i> ย้อนกลับ
          </button>

          {step < 5 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md shadow-blue-200 flex items-center gap-2"
            >
              ถัดไป <i className="fa-solid fa-arrow-right"></i>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all shadow-md shadow-green-200 flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <><i className="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึก...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk"></i> ยืนยันการบันทึก</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
