import { useState, useEffect, useMemo } from 'react';
import { fetchIncidents, updateIncident, deleteIncident } from '../lib/dataApi';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { formatDateTH } from '../lib/dateUtils';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';

interface Incident {
  id: string;
  created_at: string;
  incident_date: string;
  risk_type: string;
  process_type: string | null;
  risk_items: string[];
  other_risk_item: string | null;
  incident_details: string;
  initial_response: string;
  impact_level: string;
  group_type: string;
  guideline: string;
  responsible_person: string | null;
  causing_department: string | null;
  resolution_status?: 'Open' | 'In Progress' | 'Resolved' | 'Verified';
}

export default function DataTable() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterImpact, setFilterImpact] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const filterStatus = searchParams.get('status') || 'all';
  const filterDate = searchParams.get('date') || 'all';
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [filterStatusLocal, setFilterStatusLocal] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Incident>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('lab-incident:data-table-filters');
      if (saved) {
        const value = JSON.parse(saved);
        setSearchTerm(value.searchTerm || '');
        setFilterYear(value.filterYear || 'all');
        setFilterMonth(value.filterMonth || 'all');
        setFilterType(value.filterType || 'all');
        setFilterImpact(value.filterImpact || 'all');
        setFilterPerson(value.filterPerson || 'all');
        setFilterQuarter(value.filterQuarter || 'all');
        setFilterStatusLocal(value.filterStatusLocal || 'all');
        setFilterDepartment(value.filterDepartment || 'all');
        setDateFrom(value.dateFrom || '');
        setDateTo(value.dateTo || '');
      }
    } catch (error) {
      console.warn('Unable to restore table filters', error);
    } finally {
      setFiltersHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    sessionStorage.setItem('lab-incident:data-table-filters', JSON.stringify({ searchTerm, filterYear, filterMonth, filterType, filterImpact, filterPerson, filterQuarter, filterStatusLocal, filterDepartment, dateFrom, dateTo }));
  }, [filtersHydrated, searchTerm, filterYear, filterMonth, filterType, filterImpact, filterPerson, filterQuarter, filterStatusLocal, filterDepartment, dateFrom, dateTo]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidents();
      setIncidents(data || []);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลได้', icon: 'error', confirmButtonColor: '#ef4444' });
    } finally { setLoading(false); }
  };
  const years = useMemo(() => {
    const uniqueYears = new Set(incidents.map(inc => dayjs(inc.incident_date).format('YYYY')));
    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [incidents]);

  const departments = useMemo(() => Array.from(new Set(incidents.map(inc => String(inc.causing_department || '').trim()).filter(Boolean))).sort(), [incidents]);
  const statuses = ['Open', 'In Progress', 'Resolved', 'Verified', 'Reopened', 'Cancelled'];
  const getFiscalQuarter = (date: string) => { const month = dayjs(date).month() + 1; return month >= 10 ? '1' : month <= 3 ? '2' : month <= 6 ? '3' : '4'; };
  const getDepartmentStyle = (department: string | null) => {
    const value = String(department || '').trim().toUpperCase();
    if (value === 'LAB') return 'bg-maroon-100 text-maroon-800 ring-maroon-200';
    if (value === 'ER') return 'bg-orange-100 text-orange-800 ring-orange-200';
    if (value === 'IPD') return 'bg-blue-100 text-blue-800 ring-blue-200';
    if (value === 'IT/งานประกัน') return 'bg-violet-100 text-violet-800 ring-violet-200';
    if (value) return 'bg-slate-100 text-slate-700 ring-slate-200';
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  };

  const persons = useMemo(() => {
    const uniquePersons = new Set(incidents.map(inc => inc.responsible_person).filter(Boolean));
    return Array.from(uniquePersons).sort();
  }, [incidents]);

  const filteredData = useMemo(() => {
    return incidents.filter(inc => {
      const matchSearch = 
        (inc.incident_details?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (inc.responsible_person?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (inc.risk_items?.join(', ')?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchYear = filterYear === 'all' || dayjs(inc.incident_date).format('YYYY') === filterYear;
      const matchMonth = filterMonth === 'all' || dayjs(inc.incident_date).format('MM') === filterMonth;
      const matchType = filterType === 'all' || inc.risk_type === filterType;
      const matchImpact = filterImpact === 'all' || inc.impact_level === filterImpact;
      const matchPerson = filterPerson === 'all' || inc.responsible_person === filterPerson;
      const currentStatus = inc.resolution_status || 'Open';
      const matchStatus = filterStatusLocal !== 'all' ? currentStatus === filterStatusLocal : (filterStatus === 'all' || (filterStatus === 'open' ? (currentStatus === 'Open' || currentStatus === 'In Progress') : currentStatus === filterStatus));
      const matchDate = filterDate === 'all' || (filterDate === 'today' && inc.incident_date === new Date().toISOString().slice(0, 10));
      const matchQuarter = filterQuarter === 'all' || getFiscalQuarter(inc.incident_date) === filterQuarter;
      const matchDepartment = filterDepartment === 'all' || String(inc.causing_department || '').trim() === filterDepartment;
      const matchFrom = !dateFrom || String(inc.incident_date).slice(0, 10) >= dateFrom;
      const matchTo = !dateTo || String(inc.incident_date).slice(0, 10) <= dateTo;

      return matchSearch && matchYear && matchMonth && matchType && matchImpact && matchPerson && matchStatus && matchDate && matchQuarter && matchDepartment && matchFrom && matchTo;
    });
  }, [incidents, searchTerm, filterYear, filterMonth, filterType, filterImpact, filterPerson, filterStatus, filterDate, filterQuarter, filterStatusLocal, filterDepartment, dateFrom, dateTo]);

  const handleViewDetails = (incident: Incident) => {
    const detailsHtml = `
      <div class="text-left text-sm space-y-3">
        <div class="grid grid-cols-2 gap-2 border-b pb-2">
          <div><span class="text-slate-500">วันที่:</span> <span class="font-medium">${formatDateTH(incident.incident_date)}</span></div>
          <div><span class="text-slate-500">ประเภท:</span> <span class="font-medium">${incident.risk_type}</span></div>
          <div><span class="text-slate-500">ขั้นตอน:</span> <span class="font-medium">${incident.process_type || '-'}</span></div>
          <div><span class="text-slate-500">ระดับ:</span> <span class="font-medium text-red-600">${incident.impact_level}</span></div>
          <div><span class="text-slate-500">กลุ่ม:</span> <span class="font-medium">${incident.group_type}</span></div>
          <div><span class="text-slate-500">ผู้รับผิดชอบ:</span> <span class="font-medium">${incident.responsible_person || '-'}</span></div>
          <div><span class="text-slate-500">สถานะ:</span> <span class="font-medium">${incident.resolution_status || 'Open'}</span></div>
          <div class="col-span-2"><span class="text-slate-500">หน่วยงานที่เกิดเหตุ:</span> <span class="font-medium">${incident.causing_department || '-'}</span></div>
        </div>
        <div>
          <span class="text-slate-500 block mb-1">รายการความเสี่ยง:</span>
          <ul class="list-disc list-inside font-medium text-slate-800 bg-slate-50 p-2 rounded">
            ${incident.risk_items?.map(item => `<li>${item}</li>`).join('') || '-'}
            ${incident.other_risk_item ? `<li>อื่นๆ: ${incident.other_risk_item}</li>` : ''}
          </ul>
        </div>
        <div>
          <span class="text-slate-500 block mb-1">รายละเอียด:</span>
          <p class="font-medium text-slate-800 bg-slate-50 p-2 rounded">${incident.incident_details}</p>
        </div>
        <div>
          <span class="text-slate-500 block mb-1">การแก้ไขเบื้องต้น:</span>
          <p class="font-medium text-slate-800 bg-slate-50 p-2 rounded">${incident.initial_response}</p>
        </div>
        <div>
          <span class="text-slate-500 block mb-1">แนวทางปฏิบัติ:</span>
          <p class="font-medium text-slate-800 bg-slate-50 p-2 rounded">${incident.guideline}</p>
        </div>
      </div>
    `;

    Swal.fire({
      title: 'รายละเอียดอุบัติการณ์',
      html: detailsHtml,
      width: '600px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        container: 'font-sans'
      }
    });
  };

  const handleEditClick = async (incident: Incident) => {
    const { value: password } = await Swal.fire({
      title: 'ยืนยันตัวตน',
      input: 'password',
      inputLabel: 'กรุณากรอกรหัสผ่านเพื่อแก้ไขข้อมูล',
      inputPlaceholder: 'รหัสผ่าน',
      showCancelButton: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#800000',
      cancelButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณากรอกรหัสผ่าน!';
        }
      }
    });

    if (password) {
      if (password === 'lab11414') {
        setEditingId(incident.id);
        setEditData(incident);
      } else {
        Swal.fire({
          title: 'รหัสผ่านไม่ถูกต้อง',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      // Find original incident to compare
      const originalIncident = incidents.find(inc => inc.id === editingId);
      if (!originalIncident) throw new Error("Original incident not found");

      // Determine changes
      const changes: Record<string, { old: any, new: any }> = {};
      Object.keys(editData).forEach(key => {
        const k = key as keyof Incident;
        if (JSON.stringify(editData[k]) !== JSON.stringify(originalIncident[k])) {
          changes[k] = { old: originalIncident[k], new: editData[k] };
        }
      });

      // Update incident
      await updateIncident(editingId, editData);



      Swal.fire({
        title: 'บันทึกสำเร็จ',
        text: 'แก้ไขข้อมูลเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonColor: '#800000',
        timer: 1500
      });

      setEditingId(null);
      loadIncidents();
    } catch (error: any) {
      console.error('Error updating incident:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { value: password } = await Swal.fire({
      title: 'ยืนยันการลบข้อมูล',
      input: 'password',
      inputLabel: 'กรุณากรอกรหัสผ่านเพื่อยืนยันการลบ',
      inputPlaceholder: 'รหัสผ่าน',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณากรอกรหัสผ่าน!';
        }
      }
    });

    if (password) {
      if (password === 'lab11414') {
        try {
          await deleteIncident(id);

          Swal.fire({
            title: 'ลบสำเร็จ',
            text: 'ลบข้อมูลเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#800000',
            timer: 1500
          });

          loadIncidents();
        } catch (error: any) {
          console.error('Error deleting incident:', error);
          Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถลบข้อมูลได้',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      } else {
        Swal.fire({
          title: 'รหัสผ่านไม่ถูกต้อง',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  const handleExportExcel = async () => {
    const { value: password } = await Swal.fire({
      title: 'ยืนยันการดึงข้อมูล',
      input: 'password',
      inputLabel: 'กรุณากรอกรหัสผ่านเพื่อยืนยันการ Export',
      inputPlaceholder: 'รหัสผ่าน',
      showCancelButton: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#800000',
      cancelButtonColor: '#64748b',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณากรอกรหัสผ่าน!';
        }
      }
    });

    if (password) {
      if (password === 'LAB11414@2569') {
        setIsExporting(true);
        try {
          const { saveAs } = await import('file-saver');
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Incidents');

          worksheet.columns = [
            { header: 'ลำดับ', key: 'id', width: 10 },
            { header: 'วันที่', key: 'incident_date', width: 15 },
            { header: 'ประเภท', key: 'risk_type', width: 15 },
            { header: 'ขั้นตอน', key: 'process_type', width: 20 },
            { header: 'รายการความเสี่ยง', key: 'risk_items', width: 40 },
            { header: 'รายการอื่นๆ', key: 'other_risk_item', width: 20 },
            { header: 'ระดับ', key: 'impact_level', width: 10 },
            { header: 'กลุ่ม', key: 'group_type', width: 15 },
            { header: 'ผู้รับผิดชอบ', key: 'responsible_person', width: 20 },
            { header: 'หน่วยงาน', key: 'causing_department', width: 20 },
            { header: 'สถานะปิดประเด็น', key: 'resolution_status', width: 18 },
            { header: 'รายละเอียด', key: 'incident_details', width: 50 },
            { header: 'การแก้ไขเบื้องต้น', key: 'initial_response', width: 50 },
            { header: 'แนวทางปฏิบัติ', key: 'guideline', width: 50 },
          ];

          filteredData.forEach((incident, index) => {
            worksheet.addRow({
              id: index + 1,
              incident_date: dayjs(incident.incident_date).format('DD/MM/YYYY'),
              risk_type: incident.risk_type,
              process_type: incident.process_type || '-',
              risk_items: incident.risk_items?.join(', ') || '-',
              other_risk_item: incident.other_risk_item || '-',
              impact_level: incident.impact_level,
              group_type: incident.group_type,
              responsible_person: incident.responsible_person || '-',
              causing_department: incident.causing_department || '-',
              resolution_status: incident.resolution_status || 'Open',
              incident_details: incident.incident_details,
              initial_response: incident.initial_response,
              guideline: incident.guideline,
            });
          });

          worksheet.getRow(1).font = { bold: true };
          worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blob, `Incidents_Export_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);

          Swal.fire({
            title: 'ดึงข้อมูลสำเร็จ',
            text: 'ส่งออกข้อมูลเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#800000',
            timer: 1500
          });
        } catch (error: any) {
          console.error('Export error:', error);
          Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถส่งออกข้อมูลได้',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        } finally {
          setIsExporting(false);
        }
      } else {
        Swal.fire({
          title: 'รหัสผ่านไม่ถูกต้อง',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-maroon-700 to-maroon-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <i className="fa-solid fa-table-list"></i>
              ตารางข้อมูลอุบัติการณ์
            </h2>
            <p className="text-maroon-100 mt-1 opacity-90">รายการอุบัติการณ์ความเสี่ยงทั้งหมด</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || filteredData.length === 0}
              className="bg-white text-maroon-700 hover:bg-maroon-50 px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-excel"></i>}
              Export to Excel
            </button>
            <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 hidden sm:block">
              <span className="text-sm font-medium">รวมทั้งหมด:</span>
              <span className="ml-2 text-xl font-bold">{filteredData.length}</span>
              <span className="ml-1 text-sm">รายการ</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-maroon-700">ตัวกรองข้อมูล</p><p className="mt-1 text-xs text-slate-500">เลือกช่วงเวลา ไตรมาส หรือเงื่อนไขเพิ่มเติมก่อนดูและ Export</p></div><button onClick={() => setFiltersOpen(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-maroon-200 hover:text-maroon-700" aria-expanded={filtersOpen}><i className="fa-solid fa-sliders" />{filtersOpen ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}<i className={cn('fa-solid fa-chevron-down text-[10px] transition-transform', filtersOpen && 'rotate-180')} /></button></div>
            {filtersOpen && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative"><i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i><input type="text" placeholder="ค้นหารายละเอียด / ผู้รับผิดชอบ / รายการ" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500" /></div>
              <label className="text-xs font-semibold text-slate-500">ตั้งแต่วันที่<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm" /></label>
              <label className="text-xs font-semibold text-slate-500">ถึงวันที่<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm" /></label>
              <label className="text-xs font-semibold text-slate-500">ปีงบประมาณ<select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกปี</option>{years.map(year => <option key={year} value={year}>พ.ศ. {Number(year) + 543}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">ไตรมาสปีงบประมาณ<select value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกไตรมาส</option><option value="1">ไตรมาส 1 (ต.ค. - ธ.ค.)</option><option value="2">ไตรมาส 2 (ม.ค. - มี.ค.)</option><option value="3">ไตรมาส 3 (เม.ย. - มิ.ย.)</option><option value="4">ไตรมาส 4 (ก.ค. - ก.ย.)</option></select></label>
              <label className="text-xs font-semibold text-slate-500">เดือน<select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกเดือน</option>{['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'].map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">ประเภท<select value={filterType} onChange={e => setFilterType(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกประเภท</option><option value="Clinic">Clinic</option><option value="Non-clinic">Non-clinic</option></select></label>
              <label className="text-xs font-semibold text-slate-500">ระดับผลกระทบ<select value={filterImpact} onChange={e => setFilterImpact(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกระดับ</option>{['A','B','C','D','E','F','G','H','I','0','1','2','3','4'].map(v => <option key={v} value={v}>ระดับ {v}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">สถานะ<select value={filterStatusLocal} onChange={e => setFilterStatusLocal(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกสถานะ</option>{statuses.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">หน่วยงานที่เกิดเหตุ<select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกหน่วยงาน</option>{departments.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">ผู้รับผิดชอบ<select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="mt-1 w-full rounded-xl border-slate-200 bg-white text-sm"><option value="all">ทุกคน</option>{persons.map(person => <option key={person} value={String(person)}>{person}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">กรองจาก URL<select value={filterStatus === 'open' ? 'open' : filterDate === 'today' ? 'today' : 'all'} disabled className="mt-1 w-full rounded-xl border-slate-200 bg-slate-100 text-sm"><option value="all">ตัวกรองปกติ</option><option value="open">รายการยังไม่ปิด</option><option value="today">รายการวันนี้</option></select></label>
              <div className="flex items-end"><button onClick={() => { setSearchTerm(''); setFilterYear('all'); setFilterMonth('all'); setFilterType('all'); setFilterImpact('all'); setFilterPerson('all'); setFilterQuarter('all'); setFilterStatusLocal('all'); setFilterDepartment('all'); setDateFrom(''); setDateTo(''); }} className="w-full rounded-xl border border-maroon-200 bg-white px-3 py-2.5 text-sm font-bold text-maroon-700 hover:bg-maroon-50">ล้างตัวกรองทั้งหมด</button></div>
            </div>}
            <p className="mt-3 text-xs text-slate-500">กำลังแสดง <b className="text-slate-800">{filteredData.length}</b> รายการ · Export จะใช้ข้อมูลตามตัวกรองนี้</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">รายการความเสี่ยง</th>
                  <th className="px-4 py-3">หน่วยงานที่เกิดเหตุ</th>
                  <th className="px-4 py-3 text-center">ระดับ</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-maroon-600"></i>
                      <p>กำลังโหลดข้อมูล...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <i className="fa-solid fa-inbox text-3xl mb-2 text-slate-300"></i>
                      <p>ไม่พบข้อมูล</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((incident) => (
                    <tr key={incident.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {editingId === incident.id ? (
                        // Edit Mode Row
                        <td colSpan={7} className="p-4 bg-maroon-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">วันที่</label>
                              <input 
                                type="date" 
                                value={editData.incident_date || ''} 
                                onChange={e => setEditData({...editData, incident_date: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">ประเภทความเสี่ยง</label>
                              <select 
                                value={editData.risk_type || ''} 
                                onChange={e => setEditData({...editData, risk_type: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                <option value="Clinic">Clinic</option>
                                <option value="Non-clinic">Non-clinic</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">ขั้นตอน (เฉพาะ Clinic)</label>
                              <select 
                                value={editData.process_type || ''} 
                                onChange={e => setEditData({...editData, process_type: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                                disabled={editData.risk_type !== 'Clinic'}
                              >
                                <option value="">-</option>
                                <option value="Pre-analytical">Pre-analytical</option>
                                <option value="Analytical">Analytical</option>
                                <option value="Post-analytical">Post-analytical</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">ระดับผลกระทบ</label>
                              <select 
                                value={editData.impact_level || ''} 
                                onChange={e => setEditData({...editData, impact_level: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                {editData.risk_type === 'Clinic' ? (
                                  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(l => <option key={l} value={l}>{l}</option>)
                                ) : (
                                  ['0', '1', '2', '3', '4'].map(l => <option key={l} value={l}>{l}</option>)
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">การจัดกลุ่ม</label>
                              <select 
                                value={editData.group_type || ''} 
                                onChange={e => setEditData({...editData, group_type: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                <option value="Miss">Miss</option>
                                <option value="Near Miss">Near Miss</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">สถานะการปิดประเด็น</label>
                              <select value={editData.resolution_status || 'Open'} onChange={e => setEditData({...editData, resolution_status: e.target.value as Incident['resolution_status']})} className="w-full p-2 border rounded-lg text-sm">
                                {['Open', 'In Progress', 'Resolved', 'Verified'].map(status => <option key={status} value={status}>{status}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">ผู้รับผิดชอบ</label>
                              <select 
                                value={editData.responsible_person || ''} 
                                onChange={e => setEditData({...editData, responsible_person: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                <option value="">-- เลือกผู้รับผิดชอบ --</option>
                                {[
                                  "วัลดี สังแก้ว",
                                  "พรทิพย์ อินริสพงส์",
                                  "วรัญญา เพิ่มเดช",
                                  "นลิน ฤทธิ์โต",
                                  "อำพล เส็นบัตร",
                                ].map(person => (
                                  <option key={person} value={person}>{person}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">หน่วยงานที่เกิดเหตุ</label>
                              <select 
                                value={editData.causing_department || ''} 
                                onChange={e => setEditData({...editData, causing_department: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              >
                                <option value="">-- เลือกหน่วยงาน --</option>
                                {[
                                  "ER", "OPD", "IPD", "LR", "PCU", "NCD", "ANC", "ARV", 
                                  "IT/งานประกัน", "LAB", "X-Ray", "จ่ายกลาง", "IC", "บริหาร", 
                                  "แพทย์แผนไทย", "แพทย์", "ห้องบัตร", "ห้องฟัน", "ห้องยา", 
                                  "ห้องยา NCD", "เวชปฏิบัติ", "สุขภาพจิต", "กายภาพ", 
                                  "กลุ่มการพยาบาล", "การเงิน", "คลังยา", "ENV"
                                ].map(dept => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">รายการความเสี่ยง (คั่นด้วยลูกน้ำ)</label>
                              <input 
                                type="text" 
                                value={editData.risk_items?.join(', ') || ''} 
                                onChange={e => setEditData({...editData, risk_items: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                                className="w-full p-2 border rounded-lg text-sm"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">รายการอื่นๆ</label>
                              <input 
                                type="text" 
                                value={editData.other_risk_item || ''} 
                                onChange={e => setEditData({...editData, other_risk_item: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              />
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">รายละเอียด</label>
                              <textarea 
                                value={editData.incident_details || ''} 
                                onChange={e => setEditData({...editData, incident_details: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                                rows={2}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">การแก้ไขเบื้องต้น</label>
                              <textarea 
                                value={editData.initial_response || ''} 
                                onChange={e => setEditData({...editData, initial_response: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                                rows={2}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-slate-500 mb-1">แนวทางปฏิบัติ</label>
                              <textarea 
                                value={editData.guideline || ''} 
                                onChange={e => setEditData({...editData, guideline: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 text-sm text-slate-600 bg-white border rounded-lg hover:bg-slate-50"
                            >
                              ยกเลิก
                            </button>
                            <button 
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                              className="px-4 py-2 text-sm text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
                              บันทึก
                            </button>
                          </div>
                        </td>
                      ) : (
                        // View Mode Row
                        <>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {formatDateTH(incident.incident_date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium",
                              incident.risk_type === 'Clinic' ? "bg-maroon-100 text-maroon-800" : "bg-slate-100 text-slate-800"
                            )}>
                              {incident.risk_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate" title={incident.risk_items?.join(', ') || incident.other_risk_item || '-'}>
                            {incident.risk_items?.join(', ') || incident.other_risk_item || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', getDepartmentStyle(incident.causing_department))}>
                              <i className="fa-solid fa-building mr-1.5 text-[10px]" />
                              {incident.causing_department || 'ไม่ระบุ'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const array = incident.risk_type === "Clinic" 
                                ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] 
                                : ['0', '1', '2', '3', '4'];
                              const index = array.indexOf(incident.impact_level);
                              const percentage = Math.max(0, index / (array.length - 1 || 1));
                              const hue = (1 - percentage) * 120;
                              return (
                                <span 
                                  className="px-3 py-1 rounded-lg text-white font-bold shadow-sm text-xs"
                                  style={{ backgroundColor: `hsl(${hue}, 80%, 45%)` }}
                                >
                                  {incident.impact_level}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", incident.resolution_status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : incident.resolution_status === 'Resolved' ? 'bg-sky-100 text-sky-700' : incident.resolution_status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>{incident.resolution_status || 'Open'}</span></td>
                          <td className="px-4 py-3">
                            {incident.responsible_person || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => navigate(`/incident/${encodeURIComponent(incident.id)}`)}
                                className="w-8 h-8 rounded-full bg-maroon-50 text-maroon-600 hover:bg-maroon-100 flex items-center justify-center transition-colors"
                                title="ดูรายละเอียด"
                                aria-label={`ดูรายละเอียดอุบัติการณ์วันที่ ${formatDateTH(incident.incident_date)}`}
                              >
                                <i className="fa-solid fa-eye" aria-hidden="true"></i>
                              </button>
                              <button 
                                onClick={() => handleEditClick(incident)}
                                className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors"
                                title="แก้ไขข้อมูล"
                                aria-label={`แก้ไขข้อมูลอุบัติการณ์วันที่ ${formatDateTH(incident.incident_date)}`}
                              >
                                <i className="fa-solid fa-pen" aria-hidden="true"></i>
                              </button>
                              <button 
                                onClick={() => handleDelete(incident.id)}
                                className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                                title="ลบข้อมูล"
                                aria-label={`ลบข้อมูลอุบัติการณ์วันที่ ${formatDateTH(incident.incident_date)}`}
                              >
                                <i className="fa-solid fa-trash" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
