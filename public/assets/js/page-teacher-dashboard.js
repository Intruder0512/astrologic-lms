let myCourses = [];

function escT(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

async function loadTeacherStats() {
  const grid = document.getElementById('teacher-metrics');
  try {
    const data = await API.getTeacherStats();
    const s = data.stats;
    grid.innerHTML = `
      <div class="metric"><div class="num">${s.totalCourses}</div><div class="label">Courses</div></div>
      <div class="metric"><div class="num">${s.totalClasses}</div><div class="label">Total Classes</div></div>
      <div class="metric"><div class="num">${s.upcomingClasses}</div><div class="label">Upcoming</div></div>
      <div class="metric"><div class="num">${s.totalStudents}</div><div class="label">Students</div></div>
      <div class="metric"><div class="num">${s.attendanceRate != null ? s.attendanceRate + '%' : '—'}</div><div class="label">Avg Attendance</div></div>
    `;
  } catch (err) {
    grid.innerHTML = `<p class="form-note">Could not load stats: ${escT(err.message)}</p>`;
  }
}

async function loadMyStudents() {
  const listEl = document.getElementById('my-students-list');
  try {
    const data = await API.getTeacherStudents();
    const students = data.students || [];
    listEl.innerHTML = students.length
      ? students
          .map(
            (s) => `
        <div class="list-row">
          <div>
            <strong>${escT(s.name)}</strong>
            <div class="form-note" style="margin:0.1em 0 0;">${escT(s.course)} · ${escT(s.batch)}</div>
          </div>
          <span class="badge-diamond">${s.attendancePercent != null ? s.attendancePercent + '% (' + s.attendancePresent + '/' + s.attendanceTotal + ')' : 'No classes yet'}</span>
        </div>
      `
          )
          .join('')
      : '<p class="form-note">No students in your batches yet.</p>';
  } catch (err) {
    listEl.innerHTML = `<p class="form-note">Could not load students: ${escT(err.message)}</p>`;
  }
}

function toLocalInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadMyCourses() {
  const data = await API.getMyTeachingCourses();
  myCourses = data.courses || [];

  const listEl = document.getElementById('my-courses-list');
  listEl.innerHTML = myCourses.length
    ? myCourses.map((c) => `<div style="padding:0.5em 0;border-bottom:1px dotted var(--line-on-light);"><strong>${escT(c.title)}</strong><div class="form-note" style="margin:0.2em 0 0;">${escT(c.category)} · ${escT(c.level)} · ${escT(c.mode)}</div></div>`).join('')
    : '<p class="form-note">You are not currently assigned to any courses. Contact the chapter admin.</p>';

  const courseSelects = [document.getElementById('s-course'), document.getElementById('a-course')];
  courseSelects.forEach((sel) => {
    sel.innerHTML = myCourses.length
      ? myCourses.map((c) => `<option value="${c._id}">${escT(c.title)}</option>`).join('')
      : '<option value="">No courses assigned</option>';
  });

  if (myCourses.length) await loadBatchesForCourse(myCourses[0]._id);
}

async function loadBatchesForCourse(courseId) {
  const batchSelect = document.getElementById('s-batch');
  batchSelect.innerHTML = '<option value="">Loading batches…</option>';
  try {
    const data = await API.getCourseBatches(courseId);
    const batches = data.batches || [];
    batchSelect.innerHTML = batches.length
      ? batches.map((b) => `<option value="${b._id}">${escT(b.batchName)} (${new Date(b.startDate).toLocaleDateString('en-IN')})</option>`).join('')
      : '<option value="">No batches for this course yet</option>';
  } catch (err) {
    batchSelect.innerHTML = '<option value="">Could not load batches</option>';
  }
}

async function loadUpcomingClasses() {
  const listEl = document.getElementById('upcoming-classes');
  try {
    const now = new Date();
    const data = await API.getTeacherCalendar({ from: now.toISOString() });
    const classes = (data.liveClasses || []).filter((c) => c.status !== 'cancelled');

    if (!classes.length) {
      listEl.innerHTML = '<p class="form-note">No upcoming classes scheduled.</p>';
      return;
    }

    listEl.innerHTML = classes
      .map(
        (c) => `
      <div class="class-row" data-class-id="${c._id}">
        <div class="class-row-top">
          <div>
            <strong>${escT(c.title)}</strong>
            <div class="form-note" style="margin:0.2em 0 0;">${escT(c.course?.title || '')} · ${escT(c.batch?.batchName || '')}</div>
            <div class="form-note">${new Date(c.scheduledStart).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.3em;">
            <button class="btn btn-outline-light" style="font-size:0.68rem;padding:0.4em 0.8em;" data-action="attendance">Attendance</button>
            <button class="btn btn-outline-light" style="font-size:0.68rem;padding:0.4em 0.8em;color:var(--vermillion);" data-action="cancel">Cancel</button>
          </div>
        </div>
        ${c.teamsJoinUrl ? `<a href="${c.teamsJoinUrl}" target="_blank" rel="noopener" class="form-note" style="color:var(--vermillion);">Teams link &rarr;</a>` : '<span class="form-note">No Teams link (Microsoft integration not configured)</span>'}
        <div class="roster-list" data-roster></div>
      </div>
    `
      )
      .join('');

    listEl.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('.class-row');
        const classId = row.dataset.classId;
        if (!confirm('Cancel this class? Enrolled students will be notified by email.')) return;
        try {
          await API.cancelLiveClass(classId);
          await loadUpcomingClasses();
        } catch (err) {
          alert(err.message || 'Could not cancel class');
        }
      });
    });

    listEl.querySelectorAll('[data-action="attendance"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.target.closest('.class-row');
        const classId = row.dataset.classId;
        const rosterEl = row.querySelector('[data-roster]');
        if (rosterEl.classList.contains('open')) {
          rosterEl.classList.remove('open');
          return;
        }
        rosterEl.innerHTML = '<p class="form-note">Loading roster…</p>';
        rosterEl.classList.add('open');
        try {
          const data = await API.getLiveClassRoster(classId);
          const roster = data.roster || [];
          if (!roster.length) {
            rosterEl.innerHTML = '<p class="form-note">No students in this batch yet.</p>';
            return;
          }
          rosterEl.innerHTML =
            roster
              .map(
                (s) => `
            <div class="roster-row">
              <input type="checkbox" data-student-id="${s.studentId}" ${s.present ? 'checked' : ''}>
              <span>${escT(s.name)}</span>
            </div>
          `
              )
              .join('') +
            `<button class="btn btn-primary" style="margin-top:0.5em;font-size:0.72rem;padding:0.5em 1em;" data-action="save-attendance">Save Attendance</button>`;

          rosterEl.querySelector('[data-action="save-attendance"]').addEventListener('click', async () => {
            const checkboxes = rosterEl.querySelectorAll('input[type="checkbox"]');
            const attendance = Array.from(checkboxes).map((cb) => ({
              studentId: cb.dataset.studentId,
              present: cb.checked,
            }));
            try {
              await API.recordAttendance(classId, attendance);
              alert('Attendance saved.');
              await loadMyStudents();
              await loadTeacherStats();
            } catch (err) {
              alert(err.message || 'Could not save attendance');
            }
          });
        } catch (err) {
          rosterEl.innerHTML = `<p class="form-note">Could not load roster: ${escT(err.message)}</p>`;
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p class="form-note">Could not load classes: ${escT(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!API.isLoggedIn()) {
    document.getElementById('gate-message').style.display = 'block';
    return;
  }
  const user = API.getUser();
  if (user?.role !== 'instructor') {
    document.getElementById('gate-message').style.display = 'block';
    document.querySelector('#gate-message h2').textContent = 'This page is for instructor accounts only.';
    return;
  }

  document.getElementById('dash-content').style.display = 'block';
  document.getElementById('dash-name').textContent = (user.name || 'Instructor').split(' ')[0];

  loadMyCourses();
  loadUpcomingClasses();
  loadTeacherStats();
  loadMyStudents();

  document.getElementById('s-course').addEventListener('change', (e) => loadBatchesForCourse(e.target.value));

  document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('schedule-btn');
    const msg = document.getElementById('schedule-message');
    msg.className = 'form-message';

    const payload = {
      courseId: document.getElementById('s-course').value,
      batchId: document.getElementById('s-batch').value,
      title: document.getElementById('s-title').value.trim(),
      scheduledStart: document.getElementById('s-start').value,
      scheduledEnd: document.getElementById('s-end').value,
    };

    btn.disabled = true;
    btn.textContent = 'Scheduling...';
    try {
      const result = await API.scheduleLiveClass(payload);
      msg.textContent = `Class scheduled. ${result.notifiedStudents} student(s) notified by email.${result.teamsConfigured ? '' : ' (Teams link not created - Microsoft integration not configured yet.)'}`;
      msg.className = 'form-message success';
      e.target.reset();
      await loadUpcomingClasses();
      await loadTeacherStats();
    } catch (err) {
      msg.textContent = err.message || 'Could not schedule class.';
      msg.className = 'form-message error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Schedule Class';
    }
  });

  document.getElementById('announce-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('announce-message');
    msg.className = 'form-message';

    const payload = {
      courseId: document.getElementById('a-course').value,
      title: document.getElementById('a-title').value.trim(),
      message: document.getElementById('a-message').value.trim(),
    };

    try {
      const result = await API.postAnnouncement(payload);
      msg.textContent = `Announcement posted. ${result.notifiedStudents} student(s) notified by email.`;
      msg.className = 'form-message success';
      e.target.reset();
    } catch (err) {
      msg.textContent = err.message || 'Could not post announcement.';
      msg.className = 'form-message error';
    }
  });
});
