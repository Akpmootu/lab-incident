from pathlib import Path

# Imports
replacements = {
    'src/pages/IncidentForm.tsx': [
        ('import { supabase } from "../lib/supabase";', 'import { createIncident, fetchIncidentPopularity } from "../lib/dataApi";'),
        ('import { supabase } from \'../lib/supabase\';', 'import { createIncident, fetchIncidentPopularity } from \'../lib/dataApi\';'),
    ],
    'src/pages/DataTable.tsx': [
        ("import { supabase } from '../lib/supabase';", "import { fetchIncidents, updateIncident, deleteIncident } from '../lib/dataApi';"),
    ],
    'src/pages/Dashboard.tsx': [
        ('import { supabase } from "../lib/supabase";', 'import { fetchIncidents } from "../lib/dataApi";'),
    ],
    'src/pages/ChartDashboard.tsx': [
        ("import { supabase } from '../lib/supabase';", "import { fetchIncidents } from '../lib/dataApi';"),
    ],
}
for file, pairs in replacements.items():
    p = Path(file); text = p.read_text()
    for old, new in pairs: text = text.replace(old, new)
    p.write_text(text)

# Targeted query replacements
p = Path('src/pages/IncidentForm.tsx'); text = p.read_text()
start = text.index('  const fetchRiskItemPopularity = async () => {')
end = text.index('\n  const handleInputChange', start)
new = '''  const fetchRiskItemPopularity = async () => {
    try {
      const { counts, pCounts, dCounts } = await fetchIncidentPopularity();
      setRiskItemPopularity(counts);
      setPersonCounts(pCounts);
      setDeptCounts(dCounts);
    } catch (err) {
      console.error("Error fetching popularity:", err);
    }
  };'''
text = text[:start] + new + text[end:]
old_start = text.index('      // 1. Save to Supabase')
old_end = text.index('\n\n      // 2. Send Telegram', old_start)
new_submit = '''      // 1. Save to Google Sheets through the server API
      await createIncident({
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
      });'''
text = text[:old_start] + new_submit + text[old_end:]
p.write_text(text)

# DataTable
p = Path('src/pages/DataTable.tsx'); text = p.read_text()
start = text.index('  const fetchIncidents = async () => {')
end = text.index('\n  const years =', start)
new = '''  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const data = await fetchIncidentsFromSheet();
      setIncidents(data || []);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลได้', icon: 'error', confirmButtonColor: '#ef4444' });
    } finally { setLoading(false); }
  };'''
# avoid local name collision
new = new.replace('fetchIncidentsFromSheet()', 'fetchIncidents()').replace('const fetchIncidents =', 'const loadIncidents =')
text = text[:start] + new + text[end:]
text = text.replace('    fetchIncidents();', '    loadIncidents();')
text = text.replace('      const { error: updateError } = await supabase\n        .from(\'incidents\')\n        .update(editData)\n        .eq(\'id\', editingId);\n\n      if (updateError) throw updateError;', '      await updateIncident(editingId, editData);')
# history logging is already performed server-side; remove old history block
hstart = text.find('      // Log edit history if there are changes')
if hstart >= 0:
    hend = text.index('\n\n      Swal.fire', hstart)
    text = text[:hstart] + text[hend:]
text = text.replace("          const { error } = await supabase\n            .from('incidents')\n            .delete()\n            .eq('id', id);\n\n          if (error) throw error;", "          await deleteIncident(id);")
text = text.replace('          fetchIncidents();', '          loadIncidents();')
p.write_text(text)

# Dashboard and Chart fetch blocks
for file in ['src/pages/Dashboard.tsx', 'src/pages/ChartDashboard.tsx']:
    p = Path(file); text = p.read_text()
    if file.endswith('Dashboard.tsx') and not file.endswith('ChartDashboard.tsx'):
        start = text.index('  const fetchIncidents = async () => {')
        end = text.index('\n  // --- Data Processing ---', start)
    else:
        start = text.index('  const fetchData = async () => {')
        end = text.index('\n  };', start) + len('\n  };')
    name = 'fetchIncidents' if file.endswith('Dashboard.tsx') and not file.endswith('ChartDashboard.tsx') else 'fetchData'
    new = f'''  const {name} = async () => {{
    try {{
      setLoading(true);
      const data = await fetchIncidents();
      setIncidents(data || []);
    }} catch (error: any) {{
      console.error("Error fetching data:", error);
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้", "error");
    }} finally {{ setLoading(false); }}
  }};'''
    if file.endswith('ChartDashboard.tsx'):
        new = new.replace('setIncidents(data || []);', 'setData(data || []);')
    text = text[:start] + new + text[end:]
    p.write_text(text)
