import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { createIncident, fetchIncidentPopularity, fetchNotificationSettings } from "../lib/dataApi";
import { cn } from "../lib/utils";

const RISK_TYPES = [
  {
    id: "Clinic",
    label: "Clinic",
    description: "ความเสี่ยงที่เกี่ยวข้องกับการดูแลรักษาผู้ป่วยโดยตรง",
    icon: "fa-solid fa-stethoscope",
    color: "text-maroon-600",
    bg: "bg-maroon-50",
    border: "border-maroon-200",
    activeBorder: "border-maroon-500",
    activeBg: "bg-maroon-50/50",
  },
  {
    id: "Non-clinic",
    label: "Non-clinic",
    description: "ความเสี่ยงทั่วไปที่ไม่เกี่ยวกับการรักษาผู้ป่วยโดยตรง",
    icon: "fa-solid fa-building",
    color: "text-maroon-600",
    bg: "bg-maroon-50",
    border: "border-maroon-200",
    activeBorder: "border-maroon-500",
    activeBg: "bg-maroon-50/50",
  },
];

const PROCESS_TYPES = [
  { id: "Pre-analytical", label: "Pre-analytical", icon: "fa-solid fa-vial" },
  { id: "Analytical", label: "Analytical", icon: "fa-solid fa-microscope" },
  {
    id: "Post-analytical",
    label: "Post-analytical",
    icon: "fa-solid fa-file-medical",
  },
];

const RISK_ITEMS = {
  "Pre-analytical": [
    "สิ่งส่งตรวจเก็บในภาชนะที่ไม่ถูกต้อง,ใช้สารกันเลือดแข็งไม่ถูกต้อง,สัดส่วนของปริมาณเลือดต่อสารกันเลือดแข็งไม่ถูกต้อง",
    "สิ่งส่งตรวจน้อยไม่เพียงพอกับปริมาณที่กำหนด",
    "สิ่งส่งตรวจอยู่ในสภาพที่ไม่เหมาะสม เช่น หกเลอะเทอะ",
    "ชื่อ-สกุล,HN ที่สิ่งส่งตรวจไม่มี ไม่ถูกต้อง หรือผิดพลาด",
    "พบก้อน Clot ในสิ่งส่งตรวจที่ใส่สารกันเลือดแข็ง เช่น CBC",
    "สิ่งส่งตรวจ Hemolysis",
    "ไม่มีตัวอย่างส่งตรวจ",
    "สิ่งส่งตรวจที่เก็บไว้นานเกินไป ไม่ตรงตามข้อกำหนดทางห้องปฏิบัติการ",
    "เจ้าหน้าที่โดนเข็มตำ",
    "ผู้ป่วยเป็นลมขณะเจาะเลือด",
  ],
  Analytical: [
    "ตรวจวิเคราะห์ไม่ครบ,ไม่ตรง ตามรายการที่แพทย์สั่ง",
    "น้ำยา,Stripตรวจวิเคราะห์ไม่พร้อมใช้งาน",
    "เครื่องตรวจวิเคราะห์ขัดข้อง(เกิน 24 ชม.)",
    "QC ไม่ผ่านเกณฑ์ที่กำหนด ไม่สามารถแก้ไขได้",
    "ระบบ HIS,LIS ขัดข้อง มีปัญหา ไม่สามารถใช้งานได้ (เกิน 24 ชม.)",
    "การให้เลือดผิดหมู่",
    "การเกิดปฏิกิริยาหลังการให้เลือด/แพ้เลือด/มีอาการข้างเคียงหลังการให้เลือด",
  ],
  "Post-analytical": [
    "รายงานผลการตรวจวิเคราะห์ผิดพลาด(near miss)",
    "รายงานผลการตรวจวิเคราะห์ผิดพลาด(miss)",
    "ลงผลการตรวจวิเคราะห์ ผิดพลาด,ผิดคน,ไม่ครบถ้วน",
    "การออกใบนัดให้ผู้ป่วย ไม่ระบุรายละเอียดให้ครบถ้วน/ ผิดพลาด",
    "ออกผลการตรวจวิเคราะห์ล่าช้าตามระยะเวลาที่ห้องปฏิบัติการกำหนด",
    "ไม่เก็บสิ่งส่งตรวจตามแนวทางที่ห้องปฏิบัติการกำหนด",
    "ทำลายสิ่งส่งตรวจ ไม่ถูกต้อง ตามแนวทางห้องปฏิบัติการสอดคล้องแนวทาง IC โรงพยาบาล",
  ],
  "Non-clinic": [
    "ระบบไฟฟ้าเครื่องสำรองไฟ ขัดข้อง,เสียหาย ไม่พร้อมใช้งาน",
    "หลังคารั่วซึม มีการชำรุด",
    "น้ำประปาไม่ไหล",
    "เครื่องทำความเย็น ชำรุดเสียหาย,รั่วซึม",
    "โทรศัพท์ คอมพิวเตอร์ เสียหายไม่พร้อมใช้งาน",
    "ระบบสารสนเทศ อินเตอร์เน็ตล่าช้า เสียหายไม่พร้อมใช้งาน",
    "อุปกรณ์ วัสดุ เครื่องมือต่างๆ ไม่มี,ไม่พร้อมใช้งาน",
    "ส่ง EQA ไม่ทันเวลา",
    "เอกสารสูญหาย",
    "เครื่องมือเสียหาย/ชำรุด/ไม่พร้อมใช้งาน",
  ],
};

const IMPACT_LEVELS_CLINIC = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const IMPACT_LEVELS_NON_CLINIC = ["0", "1", "2", "3", "4"];
const STEP_META = [
  { num: 1, label: "ประเภทเหตุการณ์", description: "ระบุวันและลักษณะของเหตุการณ์" },
  { num: 2, label: "รายการความเสี่ยง", description: "เลือกเหตุการณ์ที่ตรงกับบริบท" },
  { num: 3, label: "รายละเอียด", description: "เล่าเหตุการณ์และการแก้ไขเบื้องต้น" },
  { num: 4, label: "ระดับผลกระทบ", description: "ประเมินความรุนแรงและแนวทางป้องกัน" },
  { num: 5, label: "ผู้รับผิดชอบ", description: "มอบหมายหน่วยงานและผู้ดูแล" },
  { num: 6, label: "ตรวจสอบและบันทึก", description: "ตรวจทานข้อมูลก่อนส่งเข้าระบบ" },
];

export default function IncidentForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "sent" | "skipped" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [inlineError, setInlineError] = useState("");
  const [riskItemSearch, setRiskItemSearch] = useState("");
  const [riskItemPopularity, setRiskItemPopularity] = useState<
    Record<string, number>
  >({});
  const [personCounts, setPersonCounts] = useState<Record<string, number>>({});
  const [deptCounts, setDeptCounts] = useState<Record<string, number>>({});
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const hydrated = useRef(false);
  const DRAFT_KEY = "lab-incident-form-draft";
  const PENDING_KEY = "lab-incident-pending-submit";

  const [formData, setFormData] = useState({
    incident_date: new Date().toISOString().split("T")[0],
    risk_type: "",
    process_type: "",
    risk_items: [] as string[],
    other_risk_item: "",
    incident_details: "",
    initial_response: "",
    impact_level: "",
    group_type: "",
    guideline: "",
    responsible_person: "",
    causing_department: "",
    resolution_status: "Open" as "Open" | "In Progress" | "Resolved" | "Verified",
  });

  useEffect(() => {
    fetchRiskItemPopularity();
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (draft) setFormData((prev) => ({ ...prev, ...draft }));
    } catch { /* ignore malformed local draft */ }
    hydrated.current = true;
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  useEffect(() => {
    const firstField = document.querySelector(`[data-step-field="${step}"]`) as HTMLElement | null;
    if (firstField) window.setTimeout(() => firstField.focus(), 180);
  }, [step]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    setDraftSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
  }, [formData]);

  useEffect(() => {
    const flushPending = async () => {
      if (!navigator.onLine) return;
      try {
        const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
        if (!pending?.data) return;
        await createIncident(pending.data);
        localStorage.removeItem(PENDING_KEY);
        localStorage.removeItem(DRAFT_KEY);
        setSaveStatus("saved");
      } catch { /* keep pending until the next online event */ }
    };
    window.addEventListener("online", flushPending);
    flushPending();
    return () => window.removeEventListener("online", flushPending);
  }, []);

  const fetchRiskItemPopularity = async () => {
    try {
      const { counts, pCounts, dCounts } = await fetchIncidentPopularity();
      setRiskItemPopularity(counts);
      setPersonCounts(pCounts);
      setDeptCounts(dCounts);
    } catch (err) {
      console.error("Error fetching popularity:", err);
    }
  };
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
    setInlineError("");
  };

  const handleRadioChange = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      risk_items: [item],
      other_risk_item: "",
    }));
    if (errors.risk_items) {
      setErrors((prev) => ({ ...prev, risk_items: false }));
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.incident_date) newErrors.incident_date = true;
      if (!formData.risk_type) newErrors.risk_type = true;
      if (formData.risk_type === "Clinic" && !formData.process_type)
        newErrors.process_type = true;
    } else if (step === 2) {
      if (formData.risk_items.length === 0 && !formData.other_risk_item)
        newErrors.risk_items = true;
      if (formData.other_risk_item && formData.risk_items.length > 0) {
        // If they typed in "other", we should probably clear the predefined selection, but we handle that in UI
      }
    } else if (step === 3) {
      if (!formData.incident_details) newErrors.incident_details = true;
      if (!formData.initial_response) newErrors.initial_response = true;
    } else if (step === 4) {
      if (!formData.impact_level) newErrors.impact_level = true;
      if (!formData.group_type) newErrors.group_type = true;
      if (!formData.guideline) newErrors.guideline = true;
    } else if (step === 5) {
      if (!formData.responsible_person) newErrors.responsible_person = true;
      if (!formData.causing_department) newErrors.causing_department = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
      setInlineError(`กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (${Object.keys(newErrors).length} ช่อง)`);
    } else {
      setInlineError("");
    }

    return isValid;
  };

  const missingForStep = (stepNumber: number) => {
    if (stepNumber === 1) return [!formData.incident_date, !formData.risk_type, formData.risk_type === "Clinic" && !formData.process_type].filter(Boolean).length;
    if (stepNumber === 2) return [formData.risk_items.length === 0 && !formData.other_risk_item].filter(Boolean).length;
    if (stepNumber === 3) return [!formData.incident_details, !formData.initial_response].filter(Boolean).length;
    if (stepNumber === 4) return [!formData.impact_level, !formData.group_type, !formData.guideline].filter(Boolean).length;
    if (stepNumber === 5) return [!formData.responsible_person, !formData.causing_department].filter(Boolean).length;
    return 0;
  };

  const saveDraftNow = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    setDraftSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    setSaveStatus("idle");
  };

  const startNewIncident = () => {
    setLastSavedId(null);
    setNotificationStatus("idle");
    setSaveStatus("idle");
    setInlineError("");
    setFormData({ incident_date: new Date().toISOString().split("T")[0], risk_type: "", process_type: "", risk_items: [], other_risk_item: "", incident_details: "", initial_response: "", impact_level: "", group_type: "", guideline: "", responsible_person: "", causing_department: "", resolution_status: "Open" });
    setStep(1);
    setRiskItemSearch("");
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setSaveStatus("saving");
    try {
      // 1. Save to Google Sheets through the server API
      const createdIncident = await createIncident({
        incident_date: formData.incident_date,
        risk_type: formData.risk_type,
        process_type: formData.process_type || null,
        risk_items: formData.risk_items,
        other_risk_item: formData.other_risk_item,
        incident_details: formData.incident_details,
        initial_response: formData.initial_response,
        impact_level: formData.impact_level,
        group_type: formData.group_type,
        guideline: formData.guideline,
        responsible_person: formData.responsible_person,
        causing_department: formData.causing_department,
        resolution_status: formData.resolution_status,
      });
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(PENDING_KEY);
      setSaveStatus("saved");
      setLastSavedId(createdIncident?.id || null);

      // 2. Send Telegram Notification via Backend
      const message = `
🚨 <b>แจ้งเตือนอุบัติการณ์ใหม่</b>
• 📅 <b>วันที่:</b> ${new Date(formData.incident_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
• 🏥 <b>ประเภท:</b> ${formData.risk_type} ${formData.process_type ? `(${formData.process_type})` : ""}
• ⚠️ <b>ความรุนแรง:</b> ระดับ ${formData.impact_level} (${formData.group_type})
• 🏢 <b>หน่วยงานที่เกิดเหตุ:</b> ${formData.causing_department}
• 👤 <b>ผู้รับผิดชอบ:</b> ${formData.responsible_person}
• 📝 <b>รายละเอียด:</b> ${formData.incident_details.substring(0, 100)}${formData.incident_details.length > 100 ? "..." : ""}
      `;

      const notificationSettings = await fetchNotificationSettings().catch(() => ({ enabled: true, notifyNearMiss: true, notifyMiss: true, notifyNoHarm: false }));
      const shouldNotify = notificationSettings.enabled && ((formData.group_type === "Near Miss" && notificationSettings.notifyNearMiss) || (formData.group_type === "Miss" && notificationSettings.notifyMiss) || (formData.group_type === "No Harm" && notificationSettings.notifyNoHarm));
      if (!shouldNotify) setNotificationStatus("skipped");
      else {
        try {
          const notificationResponse = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
          setNotificationStatus(notificationResponse.ok ? "sent" : "error");
        } catch { setNotificationStatus("error"); }
      }
      fetchRiskItemPopularity();
    } catch (error: any) {
      console.error("Error saving incident:", error);
      localStorage.setItem(PENDING_KEY, JSON.stringify({ data: { ...formData, resolution_status: formData.resolution_status || "Open" }, queuedAt: new Date().toISOString(), status: isOffline ? "pending" : "error" }));
      setSaveStatus("error");
      setInlineError(isOffline ? "บันทึกแบบร่างไว้แล้ว ระบบจะส่งข้อมูลให้อัตโนมัติเมื่อกลับมาออนไลน์" : (error.message || "ไม่สามารถบันทึกข้อมูลได้"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskItemsList = () => {
    let items: string[] = [];
    if (formData.risk_type === "Non-clinic") items = RISK_ITEMS["Non-clinic"];
    else if (formData.process_type)
      items =
        RISK_ITEMS[formData.process_type as keyof typeof RISK_ITEMS] || [];

    // Sort by popularity
    items = [...items].sort(
      (a, b) => (riskItemPopularity[b] || 0) - (riskItemPopularity[a] || 0),
    );

    // Filter by search
    if (riskItemSearch) {
      items = items.filter((item) =>
        item.toLowerCase().includes(riskItemSearch.toLowerCase()),
      );
    }

    return items;
  };

  const renderStepIndicator = () => (
    <div className="mb-10 px-2 sm:px-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-100 rounded-full z-0"></div>
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-maroon-600 rounded-full z-0 transition-all duration-500 ease-out"
          style={{ width: `${((step - 1) / 5) * 100}%` }}
        ></div>

        {STEP_META.map((s) => (
          <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-[3px]",
                step > s.num
                  ? "bg-maroon-600 text-white border-maroon-600 shadow-md shadow-maroon-200/50"
                  : step === s.num
                  ? "bg-white text-maroon-600 border-maroon-600 shadow-lg shadow-maroon-200 scale-110"
                  : "bg-white text-slate-300 border-slate-200"
              )}
            >
              {s.num < step ? <i className="fa-solid fa-check"></i> : s.num}
            </div>
            <span className={cn(
              "absolute top-12 text-center text-xs font-medium whitespace-nowrap transition-colors duration-300",
              s.num === step ? "block" : "hidden sm:block",
              step === s.num ? "text-maroon-700 font-bold" : step > s.num ? "text-slate-600" : "text-slate-400"
            )}>
              {s.label}
              {s.num < 6 && missingForStep(s.num) > 0 && <span className="ml-1 text-[10px] text-amber-600">· ค้าง {missingForStep(s.num)}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      <AnimatePresence>
        {saveStatus !== "idle" && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn("fixed right-4 top-24 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl", saveStatus === "saved" ? "bg-emerald-600 text-white" : saveStatus === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white")} role="status" aria-live="polite">
          <i className={saveStatus === "saving" ? "fa-solid fa-spinner fa-spin" : saveStatus === "saved" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation"} />
          {saveStatus === "saving" ? "กำลังบันทึกลง Google Sheets…" : saveStatus === "saved" ? "บันทึกข้อมูลเรียบร้อยแล้ว" : "บันทึกไม่สำเร็จ กรุณาลองใหม่"}
        </motion.div>}
      </AnimatePresence>
      <div className="bg-gradient-to-r from-maroon-700 to-maroon-900 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fa-solid fa-file-signature"></i>
          แบบบันทึกอุบัติการณ์ความเสี่ยง
        </h2>
        <p className="text-maroon-100 mt-1 opacity-90">
          กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลกงหรา
        </p>
      </div>
      <div className={cn("mx-6 mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs font-medium md:mx-8", isOffline ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")} role="status">
        <span><i className={cn("mr-2", isOffline ? "fa-solid fa-cloud-arrow-down" : "fa-solid fa-cloud-check")} />{isOffline ? "ออฟไลน์: ระบบจะเก็บแบบร่างไว้ในเครื่อง" : "ออนไลน์: พร้อมบันทึกลง Google Sheets"}</span>
        {draftSavedAt && <span className="opacity-75">Draft ล่าสุด {draftSavedAt}</span>}
      </div>
      <div className={cn("mx-6 mt-3 flex flex-col gap-3 rounded-xl border px-4 py-3 md:mx-8 sm:flex-row sm:items-center sm:justify-between", isOffline ? "border-amber-200 bg-amber-50/60" : saveStatus === "saving" ? "border-slate-200 bg-slate-50" : saveStatus === "error" ? "border-rose-200 bg-rose-50" : lastSavedId ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white")} role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><i className={cn("w-4 text-center", isOffline ? "fa-solid fa-cloud-slash text-amber-600" : saveStatus === "saving" ? "fa-solid fa-spinner fa-spin text-slate-500" : saveStatus === "error" ? "fa-solid fa-circle-exclamation text-rose-600" : lastSavedId ? "fa-solid fa-circle-check text-emerald-600" : "fa-solid fa-pen-to-square text-slate-400")} />{isOffline ? "รอเชื่อมต่อเพื่อซิงก์" : saveStatus === "saving" ? "กำลังบันทึกข้อมูล..." : saveStatus === "error" ? "บันทึกไม่สำเร็จ" : lastSavedId ? "บันทึกลงระบบแล้ว" : draftSavedAt ? `บันทึกแบบร่างแล้ว ${draftSavedAt}` : "ยังไม่ได้บันทึก"}</div>
        {lastSavedId && <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">{lastSavedId}</span><button onClick={() => navigator.clipboard?.writeText(lastSavedId)} className="text-xs font-semibold text-emerald-700 hover:underline" title="คัดลอกเลขอ้างอิง"><i className="fa-regular fa-copy mr-1" />คัดลอก</button><a href="#incident-preview" className="text-xs font-semibold text-emerald-700 hover:underline">ดูรายละเอียด</a><a href="/data" className="text-xs font-semibold text-emerald-700 hover:underline">แก้ไข</a><button onClick={startNewIncident} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700">บันทึกเหตุการณ์ใหม่</button></div>}
        {saveStatus === "error" && !lastSavedId && <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700">ลองใหม่</button>}
      </div>
      {lastSavedId && <div id="incident-preview" className="mx-6 mt-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-xs text-slate-600 md:mx-8"><i className="fa-solid fa-shield-check mr-2 text-emerald-600" />ข้อมูลถูกบันทึกใน Google Sheets แล้ว · Telegram {notificationStatus === "sent" ? "ส่งแจ้งเตือนแล้ว" : notificationStatus === "skipped" ? "ข้ามตามการตั้งค่า" : notificationStatus === "error" ? "ส่งไม่สำเร็จ แต่ข้อมูลหลักถูกบันทึกแล้ว" : "กำลังตรวจสอบ"}</div>}

      <div className="p-6 md:p-8">
        {renderStepIndicator()}
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-700">ขั้นตอนที่ {step} จาก 6</p><h3 className="mt-1 text-xl font-bold text-slate-900">{STEP_META[step - 1].label}</h3><p className="mt-1 text-sm text-slate-500">{STEP_META[step - 1].description}</p></div>
          {step < 6 && <span className={cn("rounded-full px-3 py-1.5 text-xs font-bold", missingForStep(step) ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{missingForStep(step) ? `ค้าง ${missingForStep(step)} ช่อง` : "ครบแล้ว"}</span>}
        </div>
        {inlineError && <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert"><i className="fa-solid fa-circle-exclamation" />{inlineError}</div>}

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
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">
                    วันที่เกิดอุบัติการณ์ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-maroon-600">
                      <i className="fa-regular fa-calendar-days text-lg"></i>
                    </div>
                    <input
                      type="date"
                      id="incident_date"
                      data-step-field="1"
                      value={formData.incident_date}
                      onChange={(e) =>
                        handleInputChange("incident_date", e.target.value)
                      }
                      className={cn(
                        "w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-xl outline-none transition-all text-slate-800 font-medium focus:bg-white focus:ring-4 focus:ring-maroon-500/10",
                        errors.incident_date
                          ? "border-red-400 focus:border-red-500 shake"
                          : "border-slate-200 focus:border-maroon-500"
                      )}
                    />
                  </div>
                  {errors.incident_date && (
                    <p className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                      <i className="fa-solid fa-circle-exclamation"></i> กรุณาระบุวันที่เกิดอุบัติการณ์
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    ประเภทความเสี่ยง <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {RISK_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          handleInputChange("risk_type", type.id);
                          if (type.id === "Non-clinic")
                            handleInputChange("process_type", "");
                        }}
                        className={cn(
                          "relative flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all duration-200 text-left group overflow-hidden",
                          formData.risk_type === type.id
                            ? `${type.activeBorder} ${type.activeBg} shadow-md`
                            : cn(
                                "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                                errors.risk_type && "border-red-300 shake",
                              ),
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110",
                              type.bg,
                              type.color,
                            )}
                          >
                            <i className={type.icon}></i>
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                            formData.risk_type === type.id ? type.activeBorder : "border-slate-300"
                          )}>
                            {formData.risk_type === type.id && (
                              <div className={cn("w-3 h-3 rounded-full", type.bg.replace('50/50', '500').replace('50', '500'))}></div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-lg mb-1">
                            {type.label}
                          </div>
                          <div className="text-sm text-slate-500 leading-relaxed">
                            {type.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.risk_type && (
                    <p className="text-red-500 text-xs font-medium flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation"></i> กรุณาเลือกประเภทความเสี่ยง
                    </p>
                  )}
                </div>

                {formData.risk_type === "Clinic" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-4 border-t border-slate-100"
                  >
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      ขั้นตอนอุบัติการณ์
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PROCESS_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() =>
                            handleInputChange("process_type", type.id)
                          }
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center",
                            formData.process_type === type.id
                              ? "border-maroon-500 bg-maroon-50 text-maroon-700 shadow-sm"
                              : cn(
                                  "border-slate-200 hover:border-slate-300 text-slate-600",
                                  errors.process_type && "border-red-300 shake",
                                ),
                          )}
                        >
                          <i className={cn(type.icon, "text-2xl mb-1")}></i>
                          <span className="font-medium text-sm">
                            {type.label}
                          </span>
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
                <div className="bg-maroon-50 text-maroon-800 p-4 rounded-xl flex items-start gap-3 border border-maroon-100">
                  <i className="fa-solid fa-circle-info mt-1"></i>
                  <div>
                    <p className="font-medium">
                      บัญชีความเสี่ยง (
                      {formData.risk_type === "Clinic"
                        ? formData.process_type
                        : "ทั่วไป"}
                      )
                    </p>
                    <p className="text-sm opacity-80">กรุณาเลือก 1 รายการ</p>
                  </div>
                </div>

                <div className="relative">
                  <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    data-step-field="2"
                    placeholder="ค้นหารายการความเสี่ยง..."
                    value={riskItemSearch}
                    onChange={(e) => setRiskItemSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 transition-all text-sm"
                  />
                </div>
                {Object.entries(riskItemPopularity).filter(([, count]) => Number(count) > 0).slice(0, 3).length > 0 && <p className="text-xs text-slate-500"><i className="fa-solid fa-sparkles mr-1 text-amber-500" />แนะนำจากรายการที่พบบ่อย — รายการด้านล่างเรียงตามความถี่การบันทึก</p>}

                <div
                  className={cn(
                    "space-y-2 max-h-[400px] overflow-y-auto pr-2",
                    errors.risk_items &&
                      "p-2 border border-red-300 rounded-xl shake",
                  )}
                >
                  {getRiskItemsList().map((item, index) => (
                    <label
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        formData.risk_items.includes(item)
                          ? "bg-maroon-50 border-maroon-200"
                          : "bg-white border-slate-200 hover:bg-slate-50",
                      )}
                    >
                      <div className="relative flex items-center mt-0.5">
                        <input
                          type="radio"
                          name="risk_item"
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-slate-300 checked:border-maroon-600 checked:bg-maroon-600 transition-all"
                          checked={formData.risk_items.includes(item)}
                          onChange={() => handleRadioChange(item)}
                        />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          formData.risk_items.includes(item)
                            ? "text-maroon-900 font-medium"
                            : "text-slate-700",
                        )}
                      >
                        {item}
                      </span>
                    </label>
                  ))}
                  {getRiskItemsList().length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      ไม่พบรายการความเสี่ยงที่ค้นหา
                    </div>
                  )}
                </div>

                <div className="floating-label-group bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    id="other_risk_item"
                    value={formData.other_risk_item}
                    onChange={(e) => {
                      handleInputChange("other_risk_item", e.target.value);
                      if (e.target.value) {
                        setFormData((prev) => ({ ...prev, risk_items: [] }));
                      }
                    }}
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
                <div className="space-y-1">
                  <div
                    className={cn(
                      "floating-label-group bg-slate-50 rounded-xl border",
                      errors.incident_details
                        ? "border-red-300 shake"
                        : "border-slate-200",
                    )}
                  >
                    <textarea
                      id="incident_details"
                      data-step-field="3"
                      rows={4}
                      value={formData.incident_details}
                      onChange={(e) =>
                        handleInputChange("incident_details", e.target.value)
                      }
                      className="w-full bg-transparent outline-none text-slate-800 resize-none"
                      placeholder=" "
                    ></textarea>
                    <label htmlFor="incident_details">
                      รายละเอียดอุบัติการณ์
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 pl-2">
                    <i className="fa-solid fa-circle-info mr-1"></i>
                    อธิบายเหตุการณ์ที่เกิดขึ้นอย่างชัดเจน (ใคร ทำอะไร ที่ไหน อย่างไร)
                  </p>
                  <div className="flex justify-end px-2 text-[11px] font-medium text-slate-400">{formData.incident_details.length} / 1000 ตัวอักษร</div>
                </div>

                <div className="space-y-1">
                  <div
                    className={cn(
                      "floating-label-group bg-slate-50 rounded-xl border",
                      errors.initial_response
                        ? "border-red-300 shake"
                        : "border-slate-200",
                    )}
                  >
                    <textarea
                      id="initial_response"
                      rows={4}
                      value={formData.initial_response}
                      onChange={(e) =>
                        handleInputChange("initial_response", e.target.value)
                      }
                      className="w-full bg-transparent outline-none text-slate-800 resize-none"
                      placeholder=" "
                    ></textarea>
                    <label htmlFor="initial_response">การแก้ไขเบื้องต้น</label>
                  </div>
                  <p className="text-xs text-slate-500 pl-2">
                    <i className="fa-solid fa-circle-info mr-1"></i>
                    ระบุการจัดการหรือการแก้ไขปัญหาเฉพาะหน้าทันทีที่เกิดเหตุ
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Impact & Guidelines */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    <i className="fa-solid fa-gauge-high text-maroon-500 mr-2"></i>
                    ระดับผลกระทบ (ความรุนแรง) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(formData.risk_type === "Clinic"
                      ? IMPACT_LEVELS_CLINIC
                      : IMPACT_LEVELS_NON_CLINIC
                    ).map((level, index, array) => {
                      // Gradient Color coding logic
                      const percentage = index / (array.length - 1);
                      
                      // Calculate color from green (120) to red (0)
                      const hue = (1 - percentage) * 120;
                      const bgColor = `hsl(${hue}, 80%, 45%)`;
                      const bgHover = `hsl(${hue}, 80%, 40%)`;
                      const bgActive = `hsl(${hue}, 80%, 35%)`;

                      const isSelected = formData.impact_level === level;

                      return (
                        <button
                          key={level}
                          onClick={() =>
                            handleInputChange("impact_level", level)
                          }
                          style={{
                            backgroundColor: isSelected ? bgActive : bgColor,
                            borderColor: isSelected ? bgActive : 'transparent',
                            opacity: isSelected ? 1 : 0.85
                          }}
                          className={cn(
                            "w-12 h-12 rounded-xl border-2 font-bold text-lg text-white transition-all flex items-center justify-center hover:opacity-100 hover:scale-105",
                            isSelected && "shadow-lg scale-110 ring-4 ring-slate-200",
                            errors.impact_level &&
                              !formData.impact_level &&
                              "border-red-300 shake",
                          )}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    การจัดกลุ่ม
                  </label>
                  <div className="flex gap-4">
                    {["Miss", "Near Miss"].map((type) => (
                      <button
                        key={type}
                        onClick={() => handleInputChange("group_type", type)}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all",
                          formData.group_type === type
                            ? "border-maroon-500 bg-maroon-50 text-maroon-700 shadow-sm"
                            : cn(
                                "border-slate-200 text-slate-600 hover:bg-slate-50",
                                errors.group_type && "border-red-300 shake",
                              ),
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {formData.group_type === "Near Miss" && <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-800"><i className="fa-solid fa-lightbulb mr-2" /><b>คำแนะนำ:</b> บันทึกจุดที่ตรวจพบก่อนเกิดผลกระทบ และระบุแนวทางป้องกันเพื่อให้ทีมเรียนรู้จากเหตุการณ์นี้</div>}
                </div>

                <div className="space-y-1">
                  <div
                    className={cn(
                      "floating-label-group bg-slate-50 rounded-xl border",
                      errors.guideline
                        ? "border-red-300 shake"
                        : "border-slate-200",
                    )}
                  >
                    <textarea
                      id="guideline"
                      rows={4}
                      value={formData.guideline}
                      onChange={(e) =>
                        handleInputChange("guideline", e.target.value)
                      }
                      className="w-full bg-transparent outline-none text-slate-800 resize-none"
                      placeholder=" "
                    ></textarea>
                    <label htmlFor="guideline">แนวทางปฏิบัติ (เพื่อป้องกัน)</label>
                  </div>
                  <p className="text-xs text-slate-500 pl-2">
                    <i className="fa-solid fa-circle-info mr-1"></i>
                    ระบุแนวทางหรือมาตรการเพื่อป้องกันไม่ให้เกิดเหตุการณ์นี้ซ้ำอีก
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Responsible Person & Department */}
            {step === 5 && (
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    <i className="fa-solid fa-building text-maroon-500 mr-2"></i>
                    หน่วยงานที่ทำให้เกิดอุบัติการณ์ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.causing_department}
                      onChange={(e) => handleInputChange("causing_department", e.target.value)}
                      className={cn(
                        "w-full pl-4 pr-10 py-3.5 bg-slate-50 border rounded-xl outline-none transition-all text-slate-800 font-medium appearance-none focus:bg-white focus:ring-4 focus:ring-maroon-500/10",
                        errors.causing_department ? "border-red-400 focus:border-red-500 shake" : "border-slate-200 focus:border-maroon-500"
                      )}
                    >
                      <option value="" disabled>-- เลือกหน่วยงาน --</option>
                      {[
                        "ER", "OPD", "IPD", "LR", "PCU", "NCD", "ANC", "ARV", 
                        "IT/งานประกัน", "LAB", "X-Ray", "จ่ายกลาง", "IC", "บริหาร", 
                        "แพทย์แผนไทย", "แพทย์", "ห้องบัตร", "ห้องฟัน", "ห้องยา", 
                        "ห้องยา NCD", "เวชปฏิบัติ", "สุขภาพจิต", "กายภาพ", 
                        "กลุ่มการพยาบาล", "การเงิน", "คลังยา", "ENV"
                      ]
                        .sort((a, b) => (deptCounts[b] || 0) - (deptCounts[a] || 0))
                        .map((dept) => (
                          <option key={dept} value={dept}>
                            {dept} {deptCounts[dept] ? `(${deptCounts[dept]} ครั้ง)` : ""}
                          </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                      <i className="fa-solid fa-chevron-down"></i>
                    </div>
                  </div>
                  {errors.causing_department && (
                    <p className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                      <i className="fa-solid fa-circle-exclamation"></i> กรุณาเลือกหน่วยงานที่ทำให้เกิดอุบัติการณ์
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    <i className="fa-solid fa-users text-maroon-500 mr-2"></i>
                    ผู้รับผิดชอบ <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={cn(
                      "grid grid-cols-1 sm:grid-cols-2 gap-4",
                      errors.responsible_person &&
                        "p-2 border border-red-300 rounded-xl shake",
                    )}
                  >
                  {[
                    "วัลดี สังแก้ว",
                    "พรทิพย์ อินริสพงส์",
                    "วรัญญา เพิ่มเดช",
                    "นลิน ฤทธิ์โต",
                    "อำพล เส็นบัตร",
                  ].map((person) => {
                    const count = personCounts[person] || 0;
                    return (
                    <button
                      key={person}
                      onClick={() =>
                        handleInputChange("responsible_person", person)
                      }
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left group",
                        formData.responsible_person === person
                          ? "border-maroon-500 bg-maroon-50 text-maroon-800 shadow-md"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
                      )}
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110",
                          formData.responsible_person === person
                            ? "bg-maroon-600 text-white"
                            : "bg-white text-slate-400 border border-slate-200",
                        )}
                      >
                        <i className="fa-solid fa-user-doctor"></i>
                      </div>
                      <div className="flex-1">
                        <span className="font-bold block text-lg">{person}</span>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <i className="fa-solid fa-chart-simple text-maroon-400"></i> บันทึกแล้ว {count} ครั้ง
                        </span>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.responsible_person === person ? "border-maroon-500" : "border-slate-300"
                      )}>
                        {formData.responsible_person === person && (
                          <div className="w-3 h-3 rounded-full bg-maroon-500"></div>
                        )}
                      </div>
                    </button>
                  )})}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Summary */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-maroon-50 text-maroon-600 flex items-center justify-center text-xl">
                      <i className="fa-solid fa-clipboard-check"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">สรุปข้อมูลก่อนบันทึก</h3>
                      <p className="text-xs text-slate-500">กรุณาตรวจสอบความถูกต้องก่อนยืนยัน</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General Info Card */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-maroon-500"></i> ข้อมูลทั่วไป
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-sm text-slate-500">วันที่เกิดเหตุ</span>
                          <span className="text-sm font-bold text-slate-800">
                            {new Date(formData.incident_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-sm text-slate-500">ประเภทความเสี่ยง</span>
                          <span className="text-sm font-bold text-slate-800">
                            {formData.risk_type} {formData.process_type && <span className="text-maroon-600">({formData.process_type})</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-sm text-slate-500">ผู้รับผิดชอบ</span>
                          <span className="text-sm font-bold text-slate-800">
                            <i className="fa-solid fa-user-doctor text-slate-400 mr-1"></i> {formData.responsible_person || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-sm text-slate-500">หน่วยงานที่เกิดเหตุ</span>
                          <span className="text-sm font-bold text-slate-800">
                            <i className="fa-solid fa-building text-slate-400 mr-1"></i> {formData.causing_department || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Impact Card */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <i className="fa-solid fa-bolt text-orange-500"></i> ผลกระทบและการจัดกลุ่ม
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-sm text-slate-500">ระดับผลกระทบ</span>
                          <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            {(() => {
                              const array = formData.risk_type === "Clinic" ? IMPACT_LEVELS_CLINIC : IMPACT_LEVELS_NON_CLINIC;
                              const index = array.indexOf(formData.impact_level);
                              const percentage = Math.max(0, index / (array.length - 1 || 1));
                              const hue = (1 - percentage) * 120;
                              return (
                                <span 
                                  className="px-3 py-1 rounded-lg text-white font-bold shadow-sm"
                                  style={{ backgroundColor: `hsl(${hue}, 80%, 45%)` }}
                                >
                                  ระดับ {formData.impact_level || "-"}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                          <span className="text-sm text-slate-500">การจัดกลุ่ม</span>
                          <span className={cn(
                            "text-sm font-bold px-3 py-1 rounded-lg",
                            formData.group_type === "Miss" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {formData.group_type || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="space-y-4 pt-2">
                    <div className="bg-maroon-50/50 p-4 rounded-xl border border-maroon-100">
                      <h4 className="text-sm font-bold text-maroon-800 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation text-maroon-500"></i> รายการความเสี่ยง
                      </h4>
                      <ul className="list-disc list-inside text-sm font-medium text-slate-700 space-y-1 ml-1">
                        {formData.risk_items.map((item, i) => <li key={i}>{item}</li>)}
                        {formData.other_risk_item && <li>อื่นๆ: {formData.other_risk_item}</li>}
                        {formData.risk_items.length === 0 && !formData.other_risk_item && <li className="text-slate-400 italic list-none">ไม่ได้ระบุ</li>}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <i className="fa-solid fa-align-left text-slate-400"></i> รายละเอียด
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {formData.incident_details || "-"}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <i className="fa-solid fa-wrench text-orange-400"></i> การแก้ไขเบื้องต้น
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {formData.initial_response || "-"}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <i className="fa-solid fa-shield-halved text-emerald-400"></i> แนวทางปฏิบัติ
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {formData.guideline || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex flex-wrap justify-between items-center gap-3 pt-6 border-t border-slate-100">
          <button onClick={saveDraftNow} type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:border-maroon-200 hover:bg-maroon-50 hover:text-maroon-700 focus:ring-4 focus:ring-maroon-500/10" title="บันทึกแบบร่างไว้ในอุปกรณ์นี้"><i className="fa-solid fa-bookmark mr-2" />บันทึกแบบร่าง{draftSavedAt ? ` · ${draftSavedAt}` : ""}</button>
          <button
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 focus:ring-4 focus:ring-slate-100",
              step === 1 && "opacity-0 pointer-events-none"
            )}
            aria-label="ย้อนกลับ"
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>{" "}
            ย้อนกลับ
          </button>

          {step < 6 ? (
            <button
              onClick={nextStep}
              className="px-8 py-3 bg-maroon-600 hover:bg-maroon-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-maroon-200 flex items-center gap-3 hover:scale-105 focus:ring-4 focus:ring-maroon-500/20"
              aria-label="ถัดไป"
            >
              ถัดไป{" "}
              <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center gap-3 hover:scale-105 focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:hover:scale-100"
              aria-label="ยืนยันการบันทึก"
            >
              {isSubmitting ? (
                <>
                  <i
                    className="fa-solid fa-circle-notch fa-spin"
                    aria-hidden="true"
                  ></i>{" "}
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i>{" "}
                  ยืนยันการบันทึก
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
