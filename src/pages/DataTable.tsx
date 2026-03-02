import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { formatDateTH } from '../lib/dateUtils';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';

interface Incident {
  id: number;
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
}

export default function DataTable() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterImpact, setFilterImpact] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Incident>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('incident_date', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลได้',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  const years = useMemo(() => {
    const uniqueYears = new Set(incidents.map(inc => dayjs(inc.incident_date).format('YYYY')));
    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [incidents]);

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
      const matchType = filterType === 'all' || inc.risk_type === filterType;
      const matchImpact = filterImpact === 'all' || inc.impact_level === filterImpact;
      const matchPerson = filterPerson === 'all' || inc.responsible_person === filterPerson;

      return matchSearch && matchYear && matchType && matchImpact && matchPerson;
    });
  }, [incidents, searchTerm, filterYear, filterType, filterImpact, filterPerson]);

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
      confirmButtonColor: '#3b82f6',
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
      const { error } = await supabase
        .from('incidents')
        .update(editData)
        .eq('id', editingId);

      if (error) throw error;

      Swal.fire({
        title: 'บันทึกสำเร็จ',
        text: 'แก้ไขข้อมูลเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        timer: 1500
      });

      setEditingId(null);
      fetchIncidents();
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

  const handleDelete = async (id: number) => {
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
          const { error } = await supabase
            .from('incidents')
            .delete()
            .eq('id', id);

          if (error) throw error;

          Swal.fire({
            title: 'ลบสำเร็จ',
            text: 'ลบข้อมูลเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#3b82f6',
            timer: 1500
          });

          fetchIncidents();
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <i className="fa-solid fa-table-list"></i>
              ตารางข้อมูลอุบัติการณ์
            </h2>
            <p className="text-blue-100 mt-1 opacity-90">รายการอุบัติการณ์ความเสี่ยงทั้งหมด</p>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
            <span className="text-sm font-medium">รวมทั้งหมด:</span>
            <span className="ml-2 text-xl font-bold">{filteredData.length}</span>
            <span className="ml-1 text-sm">รายการ</span>
          </div>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
            
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm appearance-none font-medium"
            >
              <option value="all">ทุกปี</option>
              {years.map(year => (
                <option key={year} value={year}>ปี พ.ศ. {Number(year) + 543}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm appearance-none"
            >
              <option value="all">ทุกประเภท</option>
              <option value="Clinic">Clinic</option>
              <option value="Non-clinic">Non-clinic</option>
            </select>

            <select
              value={filterImpact}
              onChange={(e) => setFilterImpact(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm appearance-none"
            >
              <option value="all">ทุกระดับความรุนแรง</option>
              <optgroup label="Clinic">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(l => <option key={l} value={l}>ระดับ {l}</option>)}
              </optgroup>
              <optgroup label="Non-clinic">
                {['0', '1', '2', '3', '4'].map(l => <option key={l} value={l}>ระดับ {l}</option>)}
              </optgroup>
            </select>

            <select
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm appearance-none"
            >
              <option value="all">ทุกคน (ผู้รับผิดชอบ)</option>
              {persons.map(person => (
                <option key={person} value={person as string}>{person}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">รายการความเสี่ยง</th>
                  <th className="px-4 py-3 text-center">ระดับ</th>
                  <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-blue-500"></i>
                      <p>กำลังโหลดข้อมูล...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <i className="fa-solid fa-inbox text-3xl mb-2 text-slate-300"></i>
                      <p>ไม่พบข้อมูล</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((incident) => (
                    <tr key={incident.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {editingId === incident.id ? (
                        // Edit Mode Row
                        <td colSpan={6} className="p-4 bg-blue-50/50">
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
                              <label className="block text-xs font-medium text-slate-500 mb-1">ผู้รับผิดชอบ</label>
                              <input 
                                type="text" 
                                value={editData.responsible_person || ''} 
                                onChange={e => setEditData({...editData, responsible_person: e.target.value})}
                                className="w-full p-2 border rounded-lg text-sm"
                              />
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
                              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
                              incident.risk_type === 'Clinic' ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
                            )}>
                              {incident.risk_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate" title={incident.risk_items?.join(', ') || incident.other_risk_item || '-'}>
                            {incident.risk_items?.join(', ') || incident.other_risk_item || '-'}
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
                          <td className="px-4 py-3">
                            {incident.responsible_person || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleViewDetails(incident)}
                                className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
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
