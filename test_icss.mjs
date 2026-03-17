import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`UNCAUGHT EXCEPTION: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:5173/login');
    // Assuming we need to login or bypass auth, but let's just see if there's an immediate syntax error on the app bundle
    console.log("Navigated to app");
  } catch (e) {
    console.error("Navigation error:", e);
  }

  await browser.close();
})();
