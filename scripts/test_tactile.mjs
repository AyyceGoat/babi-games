/**
 * Non-regression du tactile : le glisser au doigt fonctionnait deja et
 * doit continuer de fonctionner apres le correctif draggable={false}.
 */
import { chromium, devices } from 'playwright';

const URL = process.env.URL_TEST || 'http://localhost:5987/tier-list';
const navigateur = await chromium.launch();

for (const nom of ['iPhone 13', 'Pixel 7']) {
  const appareil = devices[nom];
  const ctx = await navigateur.newContext({ ...appareil, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tier-vignette');

  let glisses = 0, tapes = 0, essais = 0;

  for (let n = 0; n < 4; n++) {
    const geo = await page.evaluate(() => {
      const t = document.querySelector('.tier-reserve .tier-vignette');
      if (!t) return null;
      t.scrollIntoView({ block: 'center', behavior: 'instant' });
      const img = t.querySelector('img') || t.querySelector('.item-visuel');
      const r = img.getBoundingClientRect();
      const zs = document.querySelector('.rang-s .tier-zone').getBoundingClientRect();
      return {
        depart: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        arrivee: { x: zs.left + 40, y: zs.top + zs.height / 2 },
        surImage: Boolean(t.querySelector('img')),
        visible: zs.top > 0 && zs.top < window.innerHeight && r.top > 0 && r.top < window.innerHeight,
      };
    });
    if (!geo) break;
    essais++;
    const avant = await page.evaluate(() => document.querySelectorAll('.rang-s .tier-vignette').length);

    // Glisser au doigt, via de vrais evenements tactiles CDP
    const cdp = await ctx.newCDPSession(page);
    const pt = (x, y) => [{ x, y, radiusX: 12, radiusY: 12, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(geo.depart.x, geo.depart.y) });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: pt(
          geo.depart.x + ((geo.arrivee.x - geo.depart.x) * i) / 10,
          geo.depart.y + ((geo.arrivee.y - geo.depart.y) * i) / 10
        ),
      });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(160);

    const apres = await page.evaluate(() => document.querySelectorAll('.rang-s .tier-vignette').length);
    if (apres > avant) glisses++;
  }

  // Repli tap-a-tap : taper une vignette puis taper un rang
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.tier-vignette');
  for (let n = 0; n < 3; n++) {
    const avant = await page.evaluate(() => document.querySelectorAll('.rang-a .tier-vignette').length);
    await page.evaluate(() => document.querySelector('.tier-reserve .tier-vignette')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.locator('.tier-reserve .tier-vignette').first().tap();
    await page.waitForTimeout(90);
    await page.locator('.rang-a .tier-zone').tap();
    await page.waitForTimeout(140);
    const apres = await page.evaluate(() => document.querySelectorAll('.rang-a .tier-vignette').length);
    if (apres > avant) tapes++;
  }

  console.log(`${nom.padEnd(11)} : glisser au doigt ${glisses}/${essais}  |  tap-a-tap ${tapes}/3`);
  await ctx.close();
}

await navigateur.close();
