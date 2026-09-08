const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const results = {};

  for (const [name, viewport] of Object.entries({
    desktop: { width: 1600, height: 1000 },
    mobile: { width: 768, height: 1024 },
  })) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `/tmp/claude-0/-home-user-RAILTWIN/7c00b87f-0274-5e26-8eb2-90de1c13f617/scratchpad/shot-${name}-top.png`,
      fullPage: false,
    });
    await page.screenshot({
      path: `/tmp/claude-0/-home-user-RAILTWIN/7c00b87f-0274-5e26-8eb2-90de1c13f617/scratchpad/shot-${name}-full.png`,
      fullPage: true,
    });

    // scroll to feature-matrix to check scroll-snap + side nav
    await page.evaluate(() => document.getElementById('feature-matrix')?.scrollIntoView());
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `/tmp/claude-0/-home-user-RAILTWIN/7c00b87f-0274-5e26-8eb2-90de1c13f617/scratchpad/shot-${name}-featurematrix.png`,
      fullPage: false,
    });

    results[name] = { consoleErrors, pageErrors };
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

run();
