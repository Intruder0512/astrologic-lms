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

// ---------- Faculty ----------
let editingFacultyId = null;

async function loadFacultyList() {
  const listEl = document.getElementById('faculty-list');
  try {
    const data = await API.getAdminFaculty();
    const faculty = data.faculty || [];
    listEl.innerHTML = faculty.length
      ? faculty
          .map(
            (f) => `
        <div class="list-row" data-faculty-id="${f._id}">
          <div>
            <strong>${escA(f.name)}</strong>
            <div class="form-note" style="margin:0.1em 0 0;">${escA(f.designation || '')} · <span class="status-pill status-${f.status === 'published' ? 'approved' : 'application_submitted'}">${escA(f.status)}</span></div>
          </div>
          <div style="display:flex;gap:0.4em;">
            <button class="btn btn-outline-light" style="font-size:0.65rem;padding:0.4em 0.7em;" data-action="toggle-publish">${f.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button class="btn btn-outline-light" style="font-size:0.65rem;padding:0.4em 0.7em;" data-action="edit">Edit</button>
            <button class="btn btn-outline-light" style="font-size:0.65rem;padding:0.4em 0.7em;color:var(--burgundy);" data-action="delete">Delete</button>
          </div>
        </div>
      `
          )
          .join('')
      : '<p class="form-note">No faculty profiles yet — add one on the left.</p>';

    listEl.querySelectorAll('[data-action="toggle-publish"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('[data-faculty-id]');
        const id = row.dataset.facultyId;
        const f = faculty.find((x) => x._id === id);
        const formData = new FormData();
        formData.append('status', f.status === 'published' ? 'draft' : 'published');
        try {
          await API.updateFacultyProfile(id, formData);
          await loadFacultyList();
        } catch (err) {
          alert(err.message || 'Could not update status');
        }
      });
    });

    listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('[data-faculty-id]');
        if (!confirm('Delete this faculty profile permanently?')) return;
        try {
          await API.deleteFacultyProfile(row.dataset.facultyId);
          await loadFacultyList();
        } catch (err) {
          alert(err.message || 'Could not delete');
        }
      });
    });

    listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('[data-faculty-id]');
        const f = faculty.find((x) => x._id === row.dataset.facultyId);
        if (!f) return;
        startEditingFaculty(f);
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p class="form-note">Could not load faculty: ${escA(err.message)}</p>`;
  }
}

function startEditingFaculty(f) {
  editingFacultyId = f._id;
  document.getElementById('faculty-form-heading').textContent = `Editing: ${f.name}`;
  document.getElementById('f-name').value = f.name || '';
  document.getElementById('f-designation').value = f.designation || '';
  document.getElementById('f-bio').value = f.bio || '';
  document.getElementById('f-experience').value = f.experienceYears || '';
  document.getElementById('f-order').value = f.order || 0;
  document.getElementById('f-specializations').value = (f.specializations || []).join(', ');
  document.getElementById('f-qualifications').value = (f.qualifications || []).join(', ');
  document.getElementById('f-languages').value = (f.languages || []).join(', ');
  document.getElementById('f-email').value = f.email || '';
  document.getElementById('f-phone').value = f.phone || '';
  document.getElementById('f-publish').checked = f.status === 'published';
  document.getElementById('faculty-submit-btn').textContent = 'Save Changes';
  document.getElementById('faculty-cancel-edit-btn').style.display = 'block';
  window.scrollTo({ top: document.getElementById('faculty-form').offsetTop - 100, behavior: 'smooth' });
}

function resetFacultyForm() {
  editingFacultyId = null;
  document.getElementById('faculty-form').reset();
  document.getElementById('faculty-form-heading').textContent = 'Add a Faculty Profile';
  document.getElementById('faculty-submit-btn').textContent = 'Add Faculty Profile';
  document.getElementById('faculty-cancel-edit-btn').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('faculty-cancel-edit-btn').addEventListener('click', resetFacultyForm);

  document.getElementById('faculty-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('faculty-message');
    msg.className = 'form-message';

    const formData = new FormData();
    formData.append('name', document.getElementById('f-name').value.trim());
    formData.append('designation', document.getElementById('f-designation').value.trim());
    formData.append('bio', document.getElementById('f-bio').value.trim());
    formData.append('experienceYears', document.getElementById('f-experience').value || '');
    formData.append('order', document.getElementById('f-order').value || '0');
    formData.append('specializations', document.getElementById('f-specializations').value.trim());
    formData.append('qualifications', document.getElementById('f-qualifications').value.trim());
    formData.append('languages', document.getElementById('f-languages').value.trim());
    formData.append('email', document.getElementById('f-email').value.trim());
    formData.append('phone', document.getElementById('f-phone').value.trim());
    formData.append('status', document.getElementById('f-publish').checked ? 'published' : 'draft');

    const photoFile = document.getElementById('f-photo').files[0];
    if (photoFile) formData.append('photo', photoFile);

    try {
      if (editingFacultyId) {
        await API.updateFacultyProfile(editingFacultyId, formData);
        msg.textContent = 'Faculty profile updated.';
      } else {
        await API.createFacultyProfile(formData);
        msg.textContent = 'Faculty profile added.';
      }
      msg.className = 'form-message success';
      resetFacultyForm();
      await loadFacultyList();
    } catch (err) {
      msg.textContent = err.message || 'Could not save faculty profile.';
      msg.className = 'form-message error';
    }
  });
});

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
  loadFacultyList();
  loadInstructors();
  loadStudents();
});
