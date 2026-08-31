import { GoogleAuth } from 'google-auth-library';
import { randomUUID } from 'node:crypto';

const INCIDENT_HEADERS = ['id', 'incident_date', 'risk_type', 'process_type', 'risk_items', 'other_risk_item', 'incident_details', 'initial_response', 'impact_level', 'group_type', 'guideline', 'created_at', 'causing_department', 'responsible_person'] as const;
const HISTORY_HEADERS = ['id', 'incident_id', 'edited_at', 'edited_by', 'changes'] as const;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const INCIDENT_RANGE = 'Incidents!A:N';
const HISTORY_RANGE = "'Edit History'!A:E";

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
  if (email && privateKey) {
    const key = privateKey.replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code, 16))).replace(/\\+n/g, '\n').replace(/\\+r/g, '').replace(/\r/g, '').trim();
    const body = key.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
    return { client_email: email, private_key: `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n') || body}\n-----END PRIVATE KEY-----\n`, project_id: 'today-prayer-app' };
  }
  if (raw) return parseCredentials(raw);
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

async function updateRange(range: string, values: any[][]) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) });
}

async function appendRange(range: string, values: any[][]) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) });
}

async function clearRange(range: string) {
  return sheetsRequest(`/values/${encodeURIComponent(range)}:clear`, { method: 'POST', body: JSON.stringify({}) });
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const result = await getValues(INCIDENT_RANGE);
      return res.status(200).json({ data: rowsToObjects(result.values, INCIDENT_HEADERS) });
    }

    if (req.method === 'POST') {
      const input = req.body || {};
      const incident = { ...input, id: input.id || randomUUID(), created_at: input.created_at || new Date().toISOString() };
      await appendRange(INCIDENT_RANGE, [objectToRow(incident, INCIDENT_HEADERS)]);
      return res.status(201).json({ data: incident });
    }

    if (req.method === 'PATCH') {
      const id = req.body?.id;
      if (!id) return res.status(400).json({ error: 'Missing incident id' });
      const current = await getValues(INCIDENT_RANGE);
      const values = current.values || [];
      const rowIndex = values.findIndex((row: any[], i: number) => i > 0 && row[0] === id);
      if (rowIndex < 1) return res.status(404).json({ error: 'Incident not found' });
      const original = Object.fromEntries(INCIDENT_HEADERS.map((key, i) => [key, parseCell(values[rowIndex][i], key)]));
      const updated = { ...original, ...req.body }; delete updated.id;
      updated.id = id;
      await updateRange(`Incidents!A${rowIndex + 1}:N${rowIndex + 1}`, [objectToRow(updated, INCIDENT_HEADERS)]);
      const changes: Row = {};
      for (const key of INCIDENT_HEADERS) if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) changes[key] = { old: original[key], new: updated[key] };
      if (Object.keys(changes).length) await appendRange(HISTORY_RANGE, [[randomUUID(), id, new Date().toISOString(), 'Admin', JSON.stringify(changes)]]);
      return res.status(200).json({ data: updated });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) return res.status(400).json({ error: 'Missing incident id' });
      const current = await getValues(INCIDENT_RANGE);
      const values = current.values || [];
      const rowIndex = values.findIndex((row: any[], i: number) => i > 0 && row[0] === id);
      if (rowIndex < 1) return res.status(404).json({ error: 'Incident not found' });
      await clearRange(`Incidents!A${rowIndex + 1}:N${rowIndex + 1}`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Google Sheets API error:', error);
    return res.status(500).json({ error: error.message || 'Google Sheets request failed' });
  }
}
