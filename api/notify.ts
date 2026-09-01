export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, '');
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!botToken || !chatId) return res.status(500).json({ error: 'Telegram credentials are not configured' });
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Missing message' });
    const appUrl = process.env.APP_URL || 'https://lab-incident.vercel.app/';
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'เปิดระบบ Lab Incident', url: appUrl }]] } }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.description || 'Telegram send failed' });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Telegram notification error:', error);
    return res.status(500).json({ error: error.message || 'Telegram notification failed' });
  }
}
