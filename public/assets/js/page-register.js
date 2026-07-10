document.addEventListener('DOMContentLoaded', () => {
  if (API.isLoggedIn()) {
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('form-message');
    msg.className = 'form-message';

    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      whatsapp: document.getElementById('whatsapp').value.trim() || undefined,
      password: document.getElementById('password').value,
    };

    btn.disabled = true;
    btn.textContent = 'Creating Account...';
    try {
      const data = await API.register(payload);
      API.setToken(data.token);
      API.setUser(data.user);
      window.location.href = '/dashboard.html';
    } catch (err) {
      msg.textContent = err.message || 'Could not create your account. Please try again.';
      msg.className = 'form-message error';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
});
