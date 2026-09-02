const APP_URL = `${(process.env.APP_URL || 'https://lab-incident.vercel.app').replace(/\/+$/, '')}/`;
function bangkokDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function bangkokHourMinute() { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'Unauthorized' });
  const isCron = req.headers['user-agent']?.includes('vercel-cron');
  if (!cronSecret && process.env.NODE_ENV === 'production' && !isCron) return res.status(401).json({ error: 'Set CRON_SECRET or call from Vercel Cron' });
  try {
    const origin = `https://${req.headers.host || 'lab-incident.vercel.app'}`;
    const [incidentResponse, settingsResponse] = await Promise.all([fetch(`${origin}/api/data`), fetch(`${origin}/api/data?view=settings`)]);
    const incidents = (await incidentResponse.json()).data || [];
    const settings = (await settingsResponse.json()).data || {};
    if (settings.dailyReminder === false || settings.enabled === false) return res.status(200).json({ success: true, skipped: true });
    if (settings.reminderTime && bangkokHourMinute().slice(0, 2) !== String(settings.reminderTime).slice(0, 2)) return res.status(200).json({ success: true, skipped: true, reason: 'outside_configured_time', configuredTime: settings.reminderTime });
    const today = bangkokDate();
    const todayCount = incidents.filter((item: any) => String(item.incident_date).slice(0, 10) === today).length;
    const unresolved = incidents.filter((item: any) => !item.resolution_status || item.resolution_status === 'Open' || item.resolution_status === 'In Progress');
    const overdue = unresolved.filter((item: any) => item.target_resolution_date && String(item.target_resolution_date).slice(0, 10) < today).length;
    const repeatOverdue = unresolved.filter((item: any) => { if (!item.target_resolution_date) return false; const days = (new Date(`${today}T00:00:00`).getTime() - new Date(`${String(item.target_resolution_date).slice(0, 10)}T00:00:00`).getTime()) / 86400000; return days >= 3; }).length;
    const verifyQueue = incidents.filter((item: any) => item.resolution_status === 'Resolved').length;
    if (todayCount === 0 && settings.notifyEmptyDay === false && overdue === 0 && verifyQueue === 0) return res.status(200).json({ success: true, skipped: true, reason: 'empty_day' });
    const message = `📊 <b>สรุปการกำกับความเสี่ยงประจำวัน</b>\n\n• 🆕 <b>รายการใหม่วันนี้:</b> ${todayCount} รายการ\n• 🔓 <b>ยังไม่ปิด:</b> ${unresolved.length} รายการ\n• ⏰ <b>เกินกำหนด SLA:</b> ${overdue} รายการ\n• 🔁 <b>เกิน SLA ต่อเนื่อง ≥3 วัน:</b> ${repeatOverdue} รายการ\n• 🔎 <b>รอการ Verify:</b> ${verifyQueue} รายการ\n\n${todayCount === 0 ? '💡 หากพบเหตุการณ์ความเสี่ยง กรุณาบันทึกข้อมูลผ่านระบบ' : '👉 กรุณาตรวจสอบความครบถ้วนและดำเนินการรายการค้างตามลำดับ'}`;
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, '');
    const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
    if (!botToken || !chatId) throw new Error('Telegram credentials are not configured');
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'เปิดระบบ Lab Incident', url: APP_URL }], [{ text: `ดูรายการเกิน SLA (${overdue})`, url: `${APP_URL}data?status=open` }, { text: `ดูรายการรอ Verify (${verifyQueue})`, url: `${APP_URL}data?status=Resolved` }]] } }) });
    if (!telegramResponse.ok) throw new Error((await telegramResponse.json()).description || 'Telegram send failed');
    return res.status(200).json({ success: true, date: today, todayCount, overdue, repeatOverdue, verifyQueue });
  } catch (error: any) {
    console.error('Daily reminder error:', error);
    return res.status(500).json({ error: error.message || 'Daily reminder failed' });
  }
}
