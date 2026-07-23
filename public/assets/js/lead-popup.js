// Lead capture popup for Facebook/Instagram ad traffic. Shows once per
// browser session (sessionStorage, not localStorage - a fresh tab tomorrow
// gets asked again, which is what you want for ad traffic rather than
// permanently suppressing it after one visit). Submits through the
// existing Enquiry system (same one the Contact page uses) tagged with
// source: 'meta_ads', so these leads show up in the admin dashboard
// alongside every other enquiry, not in a separate silo.

(function () {
  const STORAGE_KEY = 'icas-lead-popup-shown';
  const SHOW_DELAY_MS = 3000;

  if (sessionStorage.getItem(STORAGE_KEY)) return;

  function buildPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'lead-popup-overlay';
    overlay.innerHTML = `
      <div class="lead-popup" role="dialog" aria-modal="true" aria-labelledby="lead-popup-title">
        <button type="button" class="lead-popup-close" aria-label="Close">&times;</button>
        <span class="eyebrow">Quick Question</span>
        <h3 id="lead-popup-title">Want a callback about our courses?</h3>
        <p class="form-note" style="margin-top:0;">Leave your number and we'll reach out — no commitment.</p>
        <div id="lead-popup-message" class="form-message"></div>
        <form id="lead-popup-form">
          <div class="field">
            <label for="lp-name">Name</label>
            <input type="text" id="lp-name" required>
          </div>
          <div class="field">
            <label for="lp-phone">Phone Number</label>
            <input type="tel" id="lp-phone" required>
          </div>
          <div class="field">
            <label for="lp-location">Location</label>
            <input type="text" id="lp-location" placeholder="e.g. Lucknow" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="lead-popup-submit">Request a Callback</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function dismiss(overlay) {
    sessionStorage.setItem(STORAGE_KEY, '1');
    overlay.remove();
  }

  window.setTimeout(() => {
    const overlay = buildPopup();

    overlay.querySelector('.lead-popup-close').addEventListener('click', () => dismiss(overlay));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) dismiss(overlay);
    });

    overlay.querySelector('#lead-popup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = overlay.querySelector('#lead-popup-message');
      const submitBtn = overlay.querySelector('#lead-popup-submit');
      msg.className = 'form-message';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      const payload = {
        name: overlay.querySelector('#lp-name').value.trim(),
        phone: overlay.querySelector('#lp-phone').value.trim(),
        location: overlay.querySelector('#lp-location').value.trim(),
        source: 'meta_ads',
      };

      try {
        await API.submitEnquiry(payload);
        msg.textContent = "Thank you! We'll call you shortly.";
        msg.className = 'form-message success';
        sessionStorage.setItem(STORAGE_KEY, '1');
        window.setTimeout(() => overlay.remove(), 1800);
      } catch (err) {
        msg.textContent = err.message || 'Something went wrong - please try again.';
        msg.className = 'form-message error';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request a Callback';
      }
    });
  }, SHOW_DELAY_MS);
})();
