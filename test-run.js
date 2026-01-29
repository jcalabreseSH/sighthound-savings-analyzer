const { JSDOM } = require('jsdom');
const path = require('path');

(async () => {
  try {
    const file = path.resolve(__dirname, 'index.html');
    const dom = await JSDOM.fromFile(file, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost:8000/'
    });

    await new Promise((res, rej) => {
      dom.window.document.addEventListener('DOMContentLoaded', () => res());
      setTimeout(() => rej(new Error('timeout waiting for DOMContentLoaded')), 3000);
    });

    // wait a bit for scripts to run
    await new Promise((r) => setTimeout(r, 1000));

    const log = [];
    const cont2 = dom.window.document.getElementById('continueStep2');
    const cont3 = dom.window.document.getElementById('continueStep3');
    const cont4 = dom.window.document.getElementById('continueStep4');

    log.push('continueStep2 exists: ' + !!cont2);
    log.push('continueStep3 exists: ' + !!cont3 + ' disabled=' + (cont3 ? cont3.disabled : 'na'));
    log.push('continueStep4 exists: ' + !!cont4);

    // Simulate clicking continueStep2
    if (cont2) {
      cont2.click();
      await new Promise((r) => setTimeout(r, 50));
      const active = dom.window.document.querySelector('.step.active');
      log.push('After click continueStep2 active step id: ' + (active ? active.id : 'none'));
    }

    // Try clicking continueStep3 (might be disabled)
    if (cont3) {
      cont3.click();
      await new Promise((r) => setTimeout(r, 50));
      const active = dom.window.document.querySelector('.step.active');
      log.push('After click continueStep3 active step id: ' + (active ? active.id : 'none'));
    }

    console.log(log.join('\n'));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(2);
  }
})();