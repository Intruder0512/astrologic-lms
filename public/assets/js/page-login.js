document.addEventListener('DOMContentLoaded', () => {
  if (API.isLoggedIn()) {
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('form-message');
    msg.className = 'form-message';

    btn.disabled = true;
    btn.textContent = 'Logging In...';
    try {
      const data = await API.login({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      });
      API.setToken(data.token);
      API.setUser(data.user);
      window.location.href = '/dashboard.html';
    } catch (err) {
      msg.textContent = err.message || 'Login failed. Check your email and password.';
      msg.className = 'form-message error';
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });
});
