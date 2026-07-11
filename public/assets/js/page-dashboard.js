function escDash(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}
function statusLabel(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function initDashboard() {
  if (!API.isLoggedIn()) {
    document.getElementById('gate-message').style.display = 'block';
    return;
  }
  const user = API.getUser();
  if (user?.role === 'admin') {
    window.location.href = '/admin-dashboard.html';
    return;
  }

  document.getElementById('dash-content').style.display = 'block';
  document.getElementById('dash-name').textContent = (user?.name || 'Student').split(' ')[0];

  try {
    const data = await API.myDashboard();
    renderDashboard(data);
  } catch (err) {
    if (err.status === 401) {
      API.clearToken();
      window.location.href = '/login.html';
    }
  }
}

function renderDashboard(data) {
  const pill = document.getElementById('admission-status-pill');
  pill.textContent = statusLabel(data.admissionStatus);
  pill.className = 'status-pill status-' + data.admissionStatus;

  const notes = {
    application_submitted: 'Register for a course to begin your admission.',
    documents_pending: 'Upload the documents below to move to verification.',
    under_verification: 'Our team is reviewing your application and documents.',
    payment_pending: 'Complete your course fee payment to proceed.',
    approved: "You're approved! Batch allocation is next.",
    batch_allocated: "You're all set — check My Courses for your batch details.",
    rejected: 'Your application needs attention — contact us for details.',
    correction_required: 'Some details need correction — please review and resubmit.',
  };
  document.getElementById('admission-status-note').textContent = notes[data.admissionStatus] || '';

  document.getElementById('profile-progress').style.width = data.profileCompletionPercent + '%';
  document.getElementById('profile-progress-text').textContent = data.profileCompletionPercent + '% complete';

  const enrollEl = document.getElementById('enrollments-list');
  if (!data.enrollments || !data.enrollments.length) {
    enrollEl.innerHTML = '<p class="form-note">You haven\'t registered for a course yet.</p>';
  } else {
    enrollEl.innerHTML = data.enrollments
      .map((e) => {
        const teacherNames = (e.course?.instructors || []).map((i) => i.name).filter(Boolean);
        return `
      <div class="enrollment-row">
        <div>
          <strong>${escDash(e.course?.title || 'Course')}</strong>
          <div class="form-note" style="margin:0.2em 0 0;">${e.batch ? escDash(e.batch.batchName) : 'No batch allocated yet'}</div>
          <div class="form-note" style="margin:0.1em 0 0;">${teacherNames.length ? 'Teacher: ' + escDash(teacherNames.join(', ')) : 'Teacher not yet assigned'}</div>
        </div>
        <span class="status-pill status-${escDash(e.status)}">${escDash(e.status)}</span>
      </div>
    `;
      })
      .join('');
  }

  const docsEl = document.getElementById('documents-list');
  if (!data.documents || !data.documents.length) {
    docsEl.innerHTML = '<p class="form-note">No documents uploaded yet.</p>';
  } else {
    docsEl.innerHTML = data.documents
      .map(
        (d) => `
      <div class="doc-row">
        <span>${statusLabel(d.type)}</span>
        <span class="form-note">${d.verified ? 'Verified' : 'Pending review'}</span>
      </div>
    `
      )
      .join('');
  }
}

async function loadUpcomingClassesWidget() {
  const el = document.getElementById('upcoming-classes-widget');
  try {
    const data = await API.getStudentCalendar({ from: new Date().toISOString() });
    const classes = (data.liveClasses || []).slice(0, 3);
    if (!classes.length) {
      el.innerHTML = '<p class="form-note">No upcoming classes scheduled yet.</p>';
      return;
    }
    el.innerHTML = classes
      .map(
        (c) => `
      <div style="padding:0.6em 0;border-bottom:1px dotted var(--line-on-light);">
        <strong style="font-size:0.88rem;">${escDash(c.title)}</strong>
        <div class="form-note" style="margin:0.2em 0 0;">${new Date(c.scheduledStart).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
        ${c.teamsJoinUrl ? `<a href="${c.teamsJoinUrl}" target="_blank" rel="noopener" style="font-size:0.78rem;color:var(--vermillion);">Join on Teams &rarr;</a>` : ''}
      </div>
    `
      )
      .join('');
  } catch (err) {
    el.innerHTML = '<p class="form-note">Could not load upcoming classes.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  loadUpcomingClassesWidget();

  document.getElementById('doc-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('doc-submit-btn');
    const msg = document.getElementById('doc-message');
    msg.className = 'form-message';
    const fileInput = document.getElementById('doc-file');
    if (!fileInput.files.length) return;

    const formData = new FormData();
    formData.append('type', document.getElementById('doc-type').value);
    formData.append('document', fileInput.files[0]);

    btn.disabled = true;
    btn.textContent = 'Uploading...';
    try {
      await API.request('/students/me/documents', { method: 'POST', body: formData, auth: true, isForm: true });
      msg.textContent = 'Document uploaded successfully.';
      msg.className = 'form-message success';
      e.target.reset();
      const data = await API.myDashboard();
      renderDashboard(data);
    } catch (err) {
      msg.textContent = err.message || 'Upload failed. Please try again.';
      msg.className = 'form-message error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Document';
    }
  });

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('profile-message');
    msg.className = 'form-message';
    try {
      await API.updateMyProfile({
        guardianName: document.getElementById('p-guardian').value || undefined,
        dob: document.getElementById('p-dob').value || undefined,
        address: document.getElementById('p-address').value || undefined,
        city: document.getElementById('p-city').value || undefined,
        state: document.getElementById('p-state').value || undefined,
        educationalQualification: document.getElementById('p-education').value || undefined,
      });
      msg.textContent = 'Profile updated.';
      msg.className = 'form-message success';
      const data = await API.myDashboard();
      renderDashboard(data);
    } catch (err) {
      msg.textContent = err.message || 'Could not update profile.';
      msg.className = 'form-message error';
    }
  });
});
