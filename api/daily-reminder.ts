const APP_URL = process.env.APP_URL || 'https://lab-incident.vercel.app/';
function bangkokDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }

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
    const today = bangkokDate();
    const todayCount = incidents.filter((item: any) => String(item.incident_date).slice(0, 10) === today).length;
    const message = todayCount > 0
      ? `📊 <b>สรุปการบันทึกความเสี่ยงประจำวัน</b>\nวันนี้มีการบันทึกแล้ว <b>${todayCount}</b> รายการ\n\nกรุณาตรวจสอบความครบถ้วนของข้อมูลและสถานะการปิดประเด็น`
      : `⏰ <b>แจ้งเตือนการบันทึกความเสี่ยงประจำวัน</b>\nวันนี้ยังไม่มีรายการความเสี่ยงที่บันทึกเข้าระบบ\n\nหากพบเหตุการณ์ความเสี่ยง กรุณาบันทึกข้อมูลผ่านระบบ`;
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, '');
    const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
    if (!botToken || !chatId) throw new Error('Telegram credentials are not configured');
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'เปิดระบบ Lab Incident', url: APP_URL }]] } }) });
    if (!telegramResponse.ok) throw new Error((await telegramResponse.json()).description || 'Telegram send failed');
    return res.status(200).json({ success: true, date: today, todayCount });
  } catch (error: any) {
    console.error('Daily reminder error:', error);
    return res.status(500).json({ error: error.message || 'Daily reminder failed' });
  }
}
