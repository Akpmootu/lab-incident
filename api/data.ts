import { GoogleAuth } from 'google-auth-library';
import { randomUUID } from 'node:crypto';

const INCIDENT_HEADERS = ['id', 'incident_date', 'risk_type', 'process_type', 'risk_items', 'other_risk_item', 'incident_details', 'initial_response', 'impact_level', 'group_type', 'guideline', 'created_at', 'causing_department', 'responsible_person', 'resolution_status', 'resolved_at', 'verified_at', 'target_resolution_date', 'verified_by', 'status_reason'] as const;
const HISTORY_HEADERS = ['id', 'incident_id', 'edited_at', 'edited_by', 'changes'] as const;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const INCIDENT_RANGE = 'Incidents!A:T';
const HISTORY_RANGE = "'Edit History'!A:E";
const SETTINGS_RANGE = 'Settings!A:B';
const DEFAULT_SETTINGS = { enabled: true, notifyNearMiss: true, notifyMiss: true, notifyNoHarm: false, dailyReminder: true };

type Row = Record<string, any>;

function configError() {
  return new Error('Google Sheets is not configured. Set GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.');
}

function parseCredentials(raw: string) {
  let credentials: any = JSON.parse(raw);
  if (typeof credentials === 'string') credentials = JSON.parse(credentials);
  if (typeof credentials.private_key === 'string') {
    const key = credentials.private_key
      .replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\\+n/g, '\n')
      .replace(/\\+r/g, '')
      .replace(/\r/g, '')
      .trim();
    const body = key
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s+/g, '');
    credentials.private_key = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n') || body}\n-----END PRIVATE KEY-----\n`;
  }
  return credentials;
}

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (raw) return parseCredentials(raw);
  if (email && privateKey) {
    const key = privateKey.replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\+n/g, '\n').replace(/\\+r/g, '').replace(/\r/g, '').trim();
    const body = key.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
    return { client_email: email, private_key: `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n') || body}\n-----END PRIVATE KEY-----\n`, project_id: 'today-prayer-app' };
  }
  throw configError();
}

async function sheetsRequest(path: string, init: RequestInit = {}) {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!SHEET_ID || (!credentials && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)) throw configError();
  const auth = new GoogleAuth({ credentials: getCredentials(), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.token}`, ...(init.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || 'Google Sheets request failed');
  return body;
}

function parseCell(value: any, key: string) {
  if (value === undefined || value === '') return key === 'risk_items' ? [] : null;
  if (key === 'risk_items' || key === 'changes') {
    try { return JSON.parse(value); } catch { return key === 'risk_items' ? [value] : {}; }
  }
  return value;
}

function rowsToObjects(values: any[][] = [], headers: readonly string[]) {
  return values.slice(1).filter(row => row?.[0]).map(row => Object.fromEntries(headers.map((key, i) => [key, parseCell(row[i], key)])));
}

function objectToRow(item: Row, headers: readonly string[]) {
  return headers.map(key => {
    const value = item[key];
    if (value === null || value === undefined) return '';
    return Array.isArray(value) || (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
  });
}

async function getValues(range: string) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}`);
}

async function ensureIncidentHeaders() {
  const result = await getValues(INCIDENT_RANGE);
  const header = result.values?.[0] || [];
  if (INCIDENT_HEADERS.some((key, index) => header[index] !== key)) {
    await updateRange('Incidents!A1:T1', [Array.from(INCIDENT_HEADERS)]);
  }
  return result;
}

async function updateRange(range: string, values: any[][]) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) });
}

async function appendRange(range: string, values: any[][]) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) });
}

async function clearRange(range: string) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}:clear`, { method: 'POST', body: JSON.stringify({}) });
}

async function ensureSettingsSheet() {
  try { await getValues(SETTINGS_RANGE); } catch {
    await sheetsRequest(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Settings' } } }] }) });
    await updateRange(SETTINGS_RANGE, [['key', 'value'], ...Object.entries(DEFAULT_SETTINGS)]);
  }
}

async function getSettings() {
  await ensureSettingsSheet();
  const result = await getValues(SETTINGS_RANGE);
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries((result.values || []).slice(1).filter((row: any[]) => row[0]).map((row: any[]) => [row[0], row[1] === true || row[1] === 'true'])) };
}

async function saveSettings(settings: Record<string, boolean>) {
  await ensureSettingsSheet();
  await updateRange(SETTINGS_RANGE, [['key', 'value'], ...Object.entries({ ...DEFAULT_SETTINGS, ...settings })]);
  return getSettings();
}

export default async function handler(req: any, res: any) {
  try {
    if (req.query?.view === 'settings') {
      if (req.method === 'GET') return res.status(200).json({ data: await getSettings() });
      if (req.method === 'PUT' || req.method === 'PATCH') return res.status(200).json({ data: await saveSettings(req.body || {}) });
    }
    if (req.method === 'GET') {
      if (req.query?.view === 'history') {
        const result = await getValues(HISTORY_RANGE);
        return res.status(200).json({ data: rowsToObjects(result.values, HISTORY_HEADERS) });
      }
      const result = await ensureIncidentHeaders();
      return res.status(200).json({ data: rowsToObjects(result.values, INCIDENT_HEADERS) });
    }

    if (req.method === 'POST') {
      const input = req.body || {};
      const createdAt = input.created_at || new Date().toISOString();
      const defaultTarget = new Date(createdAt); defaultTarget.setDate(defaultTarget.getDate() + 7);
      const incident = { ...input, id: input.id || randomUUID(), created_at: createdAt, resolution_status: 'Open', resolved_at: null, verified_at: null, target_resolution_date: input.target_resolution_date || defaultTarget.toISOString().slice(0, 10), verified_by: null, status_reason: input.status_reason || 'เปิดประเด็นใหม่' };
      await ensureIncidentHeaders();
      await appendRange(INCIDENT_RANGE, [objectToRow(incident, INCIDENT_HEADERS)]);
      await appendRange(HISTORY_RANGE, [[randomUUID(), incident.id, new Date().toISOString(), 'System', JSON.stringify({ action: 'created' })]]);
      return res.status(201).json({ data: incident });
    }

    if (req.method === 'PATCH') {
      const id = req.body?.id;
      if (!id) return res.status(400).json({ error: 'Missing incident id' });
      const current = await ensureIncidentHeaders();
      const values = current.values || [];
      const rowIndex = values.findIndex((row: any[], i: number) => i > 0 && row[0] === id);
      if (rowIndex < 1) return res.status(404).json({ error: 'Incident not found' });
      const original = Object.fromEntries(INCIDENT_HEADERS.map((key, i) => [key, parseCell(values[rowIndex][i], key)]));
      const requestedStatus = req.body?.resolution_status;
      const previousStatus = original.resolution_status || 'Open';
      const order = ['Open', 'In Progress', 'Resolved', 'Verified'];
      if (requestedStatus && requestedStatus !== previousStatus) {
        if (order.indexOf(requestedStatus) !== order.indexOf(previousStatus) + 1) return res.status(400).json({ error: 'Status must move one step at a time' });
        if (!req.body?.status_reason || String(req.body.status_reason).trim().length < 3) return res.status(400).json({ error: 'A reason is required when changing status' });
      }
      const now = new Date().toISOString();
      const updated = { ...original, ...req.body };
      if (requestedStatus === 'Resolved' && previousStatus !== 'Resolved') updated.resolved_at = req.body.resolved_at || now;
      if (requestedStatus === 'Verified' && previousStatus !== 'Verified') { updated.verified_at = req.body.verified_at || now; updated.verified_by = req.body.verified_by || 'ผู้ตรวจสอบระบบ'; }
      delete updated.id;
      updated.id = id;
      await updateRange(`Incidents!A${rowIndex + 1}:T${rowIndex + 1}`, [objectToRow(updated, INCIDENT_HEADERS)]);
      const changes: Row = {};
      for (const key of INCIDENT_HEADERS) if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) changes[key] = { old: original[key], new: updated[key] };
      if (Object.keys(changes).length) await appendRange(HISTORY_RANGE, [[randomUUID(), id, new Date().toISOString(), 'Admin', JSON.stringify(changes)]]);
      return res.status(200).json({ data: updated });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) return res.status(400).json({ error: 'Missing incident id' });
      const current = await ensureIncidentHeaders();
      const values = current.values || [];
      const rowIndex = values.findIndex((row: any[], i: number) => i > 0 && row[0] === id);
      if (rowIndex < 1) return res.status(404).json({ error: 'Incident not found' });
      await clearRange(`Incidents!A${rowIndex + 1}:T${rowIndex + 1}`);
      await appendRange(HISTORY_RANGE, [[randomUUID(), id, new Date().toISOString(), 'Admin', JSON.stringify({ action: 'deleted' })]]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Google Sheets API error:', error);
    return res.status(500).json({ error: error.message || 'Google Sheets request failed' });
  }
}
