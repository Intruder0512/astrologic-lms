// Shared behavior loaded on every page: mobile nav toggle, header auth
// state, and footer year. Kept as an external file (not inline <script>
// blocks) so it works under a strict script-src 'self' CSP - see server.js.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const actions = document.querySelector('.nav-actions');
  if (toggle) {
    toggle.addEventListener('click', () => {
      links?.classList.toggle('open');
      actions?.classList.toggle('open');
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  renderAuthState();
});

function renderAuthState() {
  const slot = document.querySelector('[data-auth-slot]');
  if (!slot) return;

  if (API.isLoggedIn()) {
    const user = API.getUser();
    const dashboardUrls = { instructor: '/teacher-dashboard.html', admin: '/admin-dashboard.html', student: '/dashboard.html' };
    const dashboardUrl = dashboardUrls[user?.role] || '/dashboard.html';
    slot.innerHTML = `
      <a href="${dashboardUrl}" class="btn btn-outline-dark">${escapeHtml(user?.name?.split(' ')[0] || 'My Account')}</a>
      <button class="btn btn-primary" id="logout-btn" type="button">Log Out</button>
    `;
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      API.clearToken();
      window.location.href = '/index.html';
    });
  } else {
    slot.innerHTML = `
      <a href="/login.html" class="btn btn-outline-dark">Log In</a>
      <a href="/register.html" class="btn btn-primary">Register</a>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---- Course rendering (shared by index.html and courses.html) ----
function courseCardHtml(course) {
  const fee = course.discountedFee || course.fee;
  const feeDisplay = fee != null ? `₹${Number(fee).toLocaleString('en-IN')}` : 'Contact for fee';
  return `
    <div class="course-card">
      <div class="course-card-top">
        <span class="badge-diamond">${escapeHtml(course.level)}</span>
        ${course.certificateOffered ? '<span class="badge-diamond" style="background:transparent;border:1px solid var(--marigold-soft);color:var(--ink-soft);">Certified</span>' : ''}
      </div>
      <h3>${escapeHtml(course.title)}</h3>
      <p>${escapeHtml(course.shortDescription || '')}</p>
      <div class="course-meta">
        <span>${escapeHtml(course.mode)}</span>
        ${course.durationWeeks ? `<span>${course.durationWeeks} weeks</span>` : ''}
        <span>${escapeHtml(course.language || 'English')}</span>
      </div>
      <div class="course-fee">${feeDisplay}</div>
      <div class="course-card-footer">
        <a class="view-link" href="/course.html?slug=${encodeURIComponent(course.slug)}">View Course &rarr;</a>
      </div>
    </div>
  `;
}

// ---- Faculty rendering (shared by index.html and faculty.html) ----
function facultyCardHtml(f) {
  const initial = (f.name || '?').trim().charAt(0).toUpperCase();
  const photo = f.photoUrl
    ? `<img src="${f.photoUrl}" alt="${escapeHtml(f.name)}" class="faculty-photo">`
    : `<div class="faculty-photo-placeholder">${escapeHtml(initial)}</div>`;

  const tags = [...(f.specializations || [])].slice(0, 4);

  return `
    <div class="faculty-card">
      ${photo}
      <h3 style="margin-bottom:0.2em;">${escapeHtml(f.name)}</h3>
      ${f.designation ? `<div class="faculty-designation">${escapeHtml(f.designation)}</div>` : ''}
      ${f.experienceYears ? `<p style="font-size:0.85rem;margin-bottom:0.5em;">${escapeHtml(String(f.experienceYears))}+ years experience</p>` : ''}
      <p style="font-size:0.9rem;">${escapeHtml(f.bio || '')}</p>
      ${tags.length ? `<div class="faculty-tags">${tags.map((t) => `<span class="faculty-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

async function loadFacultyInto(targetSelector, limit) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  try {
    const data = await API.getFaculty();
    let faculty = data.faculty || [];
    if (limit) faculty = faculty.slice(0, limit);

    if (!faculty.length) {
      target.innerHTML = `<div class="course-empty">Faculty profiles are being added — check back soon.</div>`;
      return;
    }
    target.innerHTML = faculty.map(facultyCardHtml).join('');
  } catch (err) {
    target.innerHTML = `<div class="course-empty">Faculty profiles are temporarily unavailable. Please refresh in a moment.</div>`;
  }
}

async function loadCoursesInto(targetSelector, params = {}, limit) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  try {
    const data = await API.getCourses(params);
    let courses = data.courses || [];
    if (limit) courses = courses.slice(0, limit);

    if (!courses.length) {
      target.innerHTML = `<div class="course-empty">No courses match right now. New batches are announced regularly — check back soon, or <a href="/contact.html" style="color:var(--vermillion);border-bottom:1px solid var(--vermillion);">send us an enquiry</a>.</div>`;
      return;
    }
    target.innerHTML = courses.map(courseCardHtml).join('');
  } catch (err) {
    target.innerHTML = `<div class="course-empty">Courses are temporarily unavailable. Please refresh in a moment, or <a href="/contact.html" style="color:var(--vermillion);border-bottom:1px solid var(--vermillion);">reach out directly</a>.</div>`;
  }
}
