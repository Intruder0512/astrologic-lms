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
    document.getElementById('admin-message').style.display = 'block';
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
      .map(
        (e) => `
      <div class="enrollment-row">
        <div>
          <strong>${escDash(e.course?.title || 'Course')}</strong>
          <div class="form-note" style="margin:0.2em 0 0;">${e.batch ? escDash(e.batch.batchName) : 'No batch allocated yet'}</div>
        </div>
        <span class="status-pill status-${escDash(e.status)}">${escDash(e.status)}</span>
      </div>
    `
      )
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

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();

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
