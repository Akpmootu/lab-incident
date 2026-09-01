export interface IncidentRecord {
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
  resolved_at?: string | null;
  verified_at?: string | null;
  target_resolution_date?: string | null;
  verified_by?: string | null;
  status_reason?: string | null;
}

async function request<T>(options: RequestInit = {}, query = ''): Promise<T> {
  const response = await fetch(`/api/data${query}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
  return body;
}

export async function fetchIncidents(): Promise<IncidentRecord[]> {
  const result = await request<{ data: IncidentRecord[] }>();
  return result.data || [];
}

export interface AuditEvent { id: string; incident_id: string; edited_at: string; edited_by: string; changes: Record<string, { old: unknown; new: unknown }> }

export async function fetchAuditLog(): Promise<AuditEvent[]> {
  const result = await request<{ data: AuditEvent[] }>({}, '?view=history');
  return result.data || [];
}

export interface NotificationSettings { enabled: boolean; notifyNearMiss: boolean; notifyMiss: boolean; notifyNoHarm: boolean; dailyReminder: boolean }
export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const result = await request<{ data: NotificationSettings }>({}, '?view=settings');
  return result.data;
}
export async function saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const result = await request<{ data: NotificationSettings }>({ method: 'PUT', body: JSON.stringify(settings) }, '?view=settings');
  return result.data;
}

export async function createIncident(data: Omit<IncidentRecord, 'id' | 'created_at'>) {
  const result = await request<{ data: IncidentRecord }>({ method: 'POST', body: JSON.stringify(data) });
  return result.data;
}

export async function updateIncident(id: string, data: Partial<IncidentRecord>) {
  const result = await request<{ data: IncidentRecord }>({ method: 'PATCH', body: JSON.stringify({ ...data, id }) });
  return result.data;
}

export async function deleteIncident(id: string) {
  return request<{ success: boolean }>({ method: 'DELETE' }, `?id=${encodeURIComponent(id)}`);
}

export async function fetchIncidentPopularity() {
  const incidents = await fetchIncidents();
  const counts: Record<string, number> = {};
  const pCounts: Record<string, number> = {};
  const dCounts: Record<string, number> = {};
  for (const incident of incidents) {
    for (const item of incident.risk_items || []) counts[item] = (counts[item] || 0) + 1;
    if (incident.responsible_person) pCounts[incident.responsible_person] = (pCounts[incident.responsible_person] || 0) + 1;
    if (incident.causing_department) dCounts[incident.causing_department] = (dCounts[incident.causing_department] || 0) + 1;
  }
  return { incidents, counts, pCounts, dCounts };
}
