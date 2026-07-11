function redirectForRole(role) {
  const destinations = { instructor: '/teacher-dashboard.html', admin: '/admin-dashboard.html', student: '/dashboard.html' };
  window.location.href = destinations[role] || '/dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if (API.isLoggedIn()) {
    redirectForRole(API.getUser()?.role);
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
      redirectForRole(data.user.role);
    } catch (err) {
      msg.textContent = err.message || 'Login failed. Check your email and password.';
      msg.className = 'form-message error';
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });
});
