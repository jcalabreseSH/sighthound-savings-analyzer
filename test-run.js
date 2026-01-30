const { JSDOM } = require('jsdom');
const path = require('path');

(async () => {
  try {
    const file = path.resolve(__dirname, 'index.html');
    const dom = await JSDOM.fromFile(file, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: 'http://localhost:8000/',
      beforeParse(window) {
        // Override canvas getContext to avoid jsdom not-implemented errors (used by jsPDF)
        try {
          if (window.HTMLCanvasElement) {
            window.HTMLCanvasElement.prototype.getContext = function (type) {
              return {
                fillRect: () => {},
                clearRect: () => {},
                getImageData: () => ({ data: [] }),
                putImageData: () => {},
                createImageData: () => [],
                setTransform: () => {},
                drawImage: () => {},
                save: () => {},
                restore: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                closePath: () => {},
                stroke: () => {},
                translate: () => {},
                scale: () => {},
                rotate: () => {},
                arc: () => {},
                fillText: () => {},
                measureText: () => ({ width: 0 }),
                transform: () => {},
                canvas: this
              };
            };
            window.HTMLCanvasElement.prototype.toDataURL = function () { return ''; };
          }
        } catch (e) {
          // ignore
        }
        if (!window.Image) {
          window.Image = class Image {};
        }
      }
    });

    await new Promise((res, rej) => {
      // wait for full load (ensures module scripts executed)
      dom.window.addEventListener('load', () => res());
      setTimeout(() => rej(new Error('timeout waiting for window.load')), 5000);
    });

    // safety wait for module init to finish
    await new Promise((r) => setTimeout(r, 200));

    // as a fallback, wait until the app sets the global init flag (if present)
    if (!dom.window.__savings_init_done) {
      const maxWait = 2000;
      const start = Date.now();
      while (!dom.window.__savings_init_done && Date.now() - start < maxWait) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    // wait a bit for scripts to run
    await new Promise((r) => setTimeout(r, 1000));

    const log = [];
    const cont2 = dom.window.document.getElementById('continueStep2');
    const cont3 = dom.window.document.getElementById('continueStep3');
    const cont4 = dom.window.document.getElementById('continueStep4');

    const back2 = dom.window.document.getElementById('backStep2');
    const back3 = dom.window.document.getElementById('backStep3');
    const back4 = dom.window.document.getElementById('backStep4');

    log.push('continueStep2 exists: ' + !!cont2);
    log.push('continueStep3 exists: ' + !!cont3 + ' disabled=' + (cont3 ? cont3.disabled : 'na'));
    log.push('continueStep4 exists: ' + !!cont4);
    log.push('backStep2 exists: ' + !!back2);
    log.push('backStep3 exists: ' + !!back3);
    log.push('backStep4 exists: ' + !!back4);

    // Simulate user selecting an option in step1 to get to step2, then click continueStep2
    const step1None = dom.window.document.querySelector('#step1 .option-card[data-value="none"]');
    if (step1None) {
      // Dispatch a real MouseEvent to better emulate a user's click
      const ev = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, view: dom.window });
      step1None.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 50));
      const active1 = dom.window.document.querySelector('.step.active');
      log.push('After selecting step1 option active step id: ' + (active1 ? active1.id : 'none'));
    }

    if (cont2) {
      const ev2 = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, view: dom.window });
      cont2.dispatchEvent(ev2);
      await new Promise((r) => setTimeout(r, 50));
      const active = dom.window.document.querySelector('.step.active');
      log.push('After click continueStep2 active step id: ' + (active ? active.id : 'none'));

      // Enable a software option so continueStep3 becomes active and can be tested
      const softwareInput = dom.window.document.querySelector('#step3 input[name="software"]');
      if (softwareInput) {
        softwareInput.checked = true;
        softwareInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));

        const cont3now = dom.window.document.getElementById('continueStep3');
        if (cont3now && !cont3now.disabled) {
          const ev3 = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, view: dom.window });
          cont3now.dispatchEvent(ev3);
          await new Promise((r) => setTimeout(r, 50));
          log.push('After selecting software and clicking continueStep3 active step id: ' + (dom.window.document.querySelector('.step.active') ? dom.window.document.querySelector('.step.active').id : 'none'));

          // Now test back from step4 to step3
          const back4Btn = dom.window.document.getElementById('backStep4');
          if (back4Btn) {
            const evb4 = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, view: dom.window });
            back4Btn.dispatchEvent(evb4);
            await new Promise((r) => setTimeout(r, 50));
            log.push('After click backStep4 active step id: ' + (dom.window.document.querySelector('.step.active') ? dom.window.document.querySelector('.step.active').id : 'none'));
          }
        }
      }
    }

    console.log(log.join('\n'));
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(2);
  }
})();