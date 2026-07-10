document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('enquiry-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('form-message');
    msg.className = 'form-message';

    const payload = {
      name: document.getElementById('name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim() || undefined,
      message: document.getElementById('message').value.trim() || undefined,
      source: 'website',
    };

    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      await API.submitEnquiry(payload);
      msg.textContent = "Thank you — we've received your enquiry and will be in touch shortly.";
      msg.className = 'form-message success';
      e.target.reset();
    } catch (err) {
      msg.textContent = err.message || 'Something went wrong. Please try again or WhatsApp us directly.';
      msg.className = 'form-message error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Enquiry';
    }
  });
});
