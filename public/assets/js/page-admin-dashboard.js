function escA(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

// ---------- Tabs ----------
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ---------- Metrics ----------
async function loadMetrics() {
  const grid = document.getElementById('metrics-grid');
  try {
    const data = await API.getAdminDashboard();
    const m = data.metrics;
    grid.innerHTML = `
      <div class="metric"><div class="num">${m.newEnquiries}</div><div class="label">New Enquiries</div></div>
      <div class="metric"><div class="num">${m.newRegistrations}</div><div class="label">New (30d)</div></div>
      <div class="metric"><div class="num">${m.pendingApplications}</div><div class="label">Pending Review</div></div>
      <div class="metric"><div class="num">${m.activeStudents}</div><div class="label">Active Students</div></div>
      <div class="metric"><div class="num">₹${Number(m.totalFeeCollected).toLocaleString('en-IN')}</div><div class="label">Fee Collected</div></div>
    `;
  } catch (err) {
    grid.innerHTML = `<p class="form-note">Could not load metrics: ${escA(err.message)}</p>`;
  }
}

// ---------- Courses ----------
async function loadCourses() {
  const listEl = document.getElementById('courses-list');
  const batchSelect = document.getElementById('b-course');
  try {
    const data = await API.getAdminCourses();
    const courses = data.courses || [];

    listEl.innerHTML = courses.length
      ? courses
          .map(
            (c) => `
        <div class="list-row">
          <div>
            <strong>${escA(c.title)}</strong>
            <div class="form-note" style="margin:0.1em 0 0;">${escA(c.courseCode)} · ${escA(c.status)}</div>
          </div>
          <span class="badge-diamond">₹${Number(c.fee).toLocaleString('en-IN')}</span>
        </div>
      `
          )
          .join('')
      : '<p class="form-note">No courses yet — create one on the left.</p>';

    batchSelect.innerHTML = courses.length
      ? courses.map((c) => `<option value="${c._id}">${escA(c.title)}</option>`).join('')
      : '<option value="">Create a course first</option>';
  } catch (err) {
    listEl.innerHTML = `<p class="form-note">Could not load courses: ${escA(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('course-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('course-message');
    msg.className = 'form-message';

    const payload = {
      title: document.getElementById('c-title').value.trim(),
      courseCode: document.getElementById('c-code').value.trim(),
      category: document.getElementById('c-category').value,
      level: document.getElementById('c-level').value,
      mode: document.getElementById('c-mode').value,
      shortDescription: document.getElementById('c-short').value.trim(),
      description: document.getElementById('c-desc').value.trim(),
      fee: Number(document.getElementById('c-fee').value),
      durationWeeks: document.getElementById('c-duration').value ? Number(document.getElementById('c-duration').value) : undefined,
      status: document.getElementById('c-publish').checked ? 'published' : 'draft',
      certificateOffered: true,
      language: 'both',
    };

    try {
      await API.createCourse(payload);
      msg.textContent = 'Course created.';
      msg.className = 'form-message success';
      e.target.reset();
      document.getElementById('c-publish').checked = true;
      await loadCourses();
    } catch (err) {
      msg.textContent = err.message || 'Could not create course.';
      msg.className = 'form-message error';
    }
  });
});

// ---------- Instructors ----------
async function loadInstructors() {
  const listEl = document.getElementById('instructors-list');
  try {
    const data = await API.getAdminInstructors();
    const instructors = data.instructors || [];
    listEl.innerHTML = instructors.length
      ? instructors
          .map(
            (i) => `
        <div class="list-row">
          <div>
            <strong>${escA(i.name)}</strong>
            <div class="form-note" style="margin:0.1em 0 0;">${escA(i.email)}${i.microsoftUpn ? ' · Teams: ' + escA(i.microsoftUpn) : ' · No Teams UPN set'}</div>
          </div>
          <code style="font-size:0.68rem;color:var(--text-dim);">${escA(i._id)}</code>
        </div>
      `
          )
          .join('')
      : '<p class="form-note">No instructors yet — create one on the left.</p>';
  } catch (err) {
    listEl.innerHTML = `<p class="form-note">Could not load instructors: ${escA(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('instructor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('instructor-message');
    msg.className = 'form-message';

    const payload = {
      name: document.getElementById('i-name').value.trim(),
      email: document.getElementById('i-email').value.trim(),
      password: document.getElementById('i-password').value,
      phone: document.getElementById('i-phone').value.trim() || undefined,
      microsoftUpn: document.getElementById('i-upn').value.trim() || undefined,
    };

    try {
      await API.createInstructor(payload);
      msg.textContent = `Instructor created. Share these login details with them: ${payload.email} / ${payload.password}`;
      msg.className = 'form-message success';
      e.target.reset();
      await loadInstructors();
    } catch (err) {
      msg.textContent = err.message || 'Could not create instructor.';
      msg.className = 'form-message error';
    }
  });
});

// ---------- Batches ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('batch-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('batch-message');
    msg.className = 'form-message';

    const payload = {
      course: document.getElementById('b-course').value,
      batchName: document.getElementById('b-name').value.trim(),
      mode: document.getElementById('b-mode').value,
      startDate: document.getElementById('b-start').value,
      maxCapacity: Number(document.getElementById('b-capacity').value) || 30,
    };

    if (!payload.course) {
      msg.textContent = 'Create a course first.';
      msg.className = 'form-message error';
      return;
    }

    try {
      await API.createAdminBatch(payload);
      msg.textContent = 'Batch created. Instructors on this course can now schedule live classes for it.';
      msg.className = 'form-message success';
      e.target.reset();
    } catch (err) {
      msg.textContent = err.message || 'Could not create batch.';
      msg.className = 'form-message error';
    }
  });
});

// ---------- Students / Admissions ----------
async function loadStudents() {
  const listEl = document.getElementById('students-list');
  try {
    const data = await API.getAdminStudents({ limit: 30 });
    const students = data.students || [];
    listEl.innerHTML = students.length
      ? students
          .map(
            (s) => `
        <div class="list-row" data-student-id="${s._id}">
          <div>
            <strong>${escA(s.user?.name || 'Unknown')}</strong>
            <div class="form-note" style="margin:0.1em 0 0;">${escA(s.user?.email || '')} · <span class="status-pill status-${escA(s.admissionStatus)}">${escA(s.admissionStatus)}</span></div>
          </div>
          <div style="display:flex;gap:0.4em;">
            ${s.admissionStatus === 'under_verification' || s.admissionStatus === 'documents_pending' ? `<button class="btn btn-outline-light" style="font-size:0.65rem;padding:0.4em 0.7em;" data-action="approve">Approve</button>` : ''}
          </div>
        </div>
      `
          )
          .join('')
      : '<p class="form-note">No applications yet.</p>';

    listEl.querySelectorAll('[data-action="approve"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('[data-student-id]');
        try {
          await API.reviewAdmission(row.dataset.studentId, { decision: 'approve' });
          await loadStudents();
        } catch (err) {
          alert(err.message || 'Could not approve');
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p class="form-note">Could not load applications: ${escA(err.message)}</p>`;
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  if (!API.isLoggedIn()) {
    document.getElementById('gate-message').style.display = 'block';
    return;
  }
  const user = API.getUser();
  if (user?.role !== 'admin') {
    document.getElementById('gate-message').style.display = 'block';
    document.querySelector('#gate-message h2').textContent = 'This page is for admin accounts only.';
    return;
  }

  document.getElementById('dash-content').style.display = 'block';
  document.getElementById('dash-name').textContent = (user.name || 'Admin').split(' ')[0];

  initTabs();
  loadMetrics();
  loadCourses();
  loadInstructors();
  loadStudents();
});
