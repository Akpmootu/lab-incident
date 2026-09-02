describe('Lab Incident mobile responsive smoke test', () => {
  it('keeps the app inside the viewport on the operational home', async () => {
    await browser.url('/');
    await browser.waitUntil(async () => (await browser.getTitle()).length > 0, { timeout: 15000 });
    const layout = await browser.execute(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      bottomNav: Boolean(document.querySelector('[class*="bottom-0"]')),
    }));
    if (layout.documentWidth > layout.viewport + 1 || layout.bodyWidth > layout.viewport + 1) {
      throw new Error(`Horizontal overflow: viewport=${layout.viewport}, document=${layout.documentWidth}, body=${layout.bodyWidth}`);
    }
    if (!layout.bottomNav) throw new Error('Mobile bottom navigation is not rendered');
  });

  it('keeps the incident workflow usable without overlapping step labels', async () => {
    await browser.url('/report');
    const heading = await $('h2=แบบบันทึกอุบัติการณ์ความเสี่ยง');
    await heading.waitForDisplayed({ timeout: 15000 });
    const workflowVisible = await browser.execute(() => document.body.innerText.includes('ประเภทเหตุการณ์') && document.body.innerText.includes('ขั้นตอนที่ 1 จาก 6'));
    if (!workflowVisible) throw new Error('Incident workflow content is not visible');
    const overflow = await browser.execute(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    if (overflow.width > overflow.viewport + 1) throw new Error(`Form overflow: ${overflow.width}px`);
  });
});
