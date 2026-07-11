let currentMonthDate = new Date();
let monthClasses = [];

function escCal(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

async function fetchClassesForMonth() {
  const user = API.getUser();
  const from = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
  const to = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0, 23, 59, 59);
  const params = { from: from.toISOString(), to: to.toISOString() };

  let data;
  if (user.role === 'instructor') {
    data = await API.getTeacherCalendar(params);
    return data.liveClasses || [];
  } else if (user.role === 'admin') {
    data = await API.getAdminCalendar(params);
    return data.liveClasses || [];
  } else {
    data = await API.getStudentCalendar(params);
    return data.liveClasses || [];
  }
}

function renderMonthGrid() {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  document.getElementById('cal-month-label').textContent = currentMonthDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const dowRow = document.getElementById('cal-dow-row');
  dowRow.innerHTML = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    .map((d) => `<div class="cal-dow">${d}</div>`)
    .join('');

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const classesByDay = {};
  monthClasses.forEach((c) => {
    const d = new Date(c.scheduledStart);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      (classesByDay[day] = classesByDay[day] || []).push(c);
    }
  });

  const grid = document.getElementById('cal-grid');
  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += '<div class="cal-day empty"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const dayClasses = classesByDay[day] || [];
    cells += `
      <div class="cal-day${isToday ? ' today' : ''}">
        <div class="day-num">${day}</div>
        ${dayClasses.map(() => '<span class="cal-dot"></span>').join('')}
      </div>
    `;
  }
  grid.innerHTML = cells;
}

function renderAgenda() {
  const now = new Date();
  const upcoming = monthClasses
    .filter((c) => new Date(c.scheduledEnd) >= now)
    .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
    .slice(0, 8);

  const agendaEl = document.getElementById('agenda-list');
  if (!upcoming.length) {
    agendaEl.innerHTML = '<p class="form-note">No upcoming classes this month.</p>';
    return;
  }

  agendaEl.innerHTML = upcoming
    .map((c) => {
      const start = new Date(c.scheduledStart);
      const dateLabel = start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeLabel = start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `
        <div class="agenda-item">
          <div class="agenda-time">${dateLabel} · ${timeLabel}</div>
          <strong>${escCal(c.title)}</strong>
          <div class="form-note" style="margin:0.2em 0 0;">${escCal(c.course?.title || '')}${c.batch ? ' · ' + escCal(c.batch.batchName) : ''}</div>
          ${c.teamsJoinUrl ? `<a href="${c.teamsJoinUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:0.5em;padding:0.5em 1em;font-size:0.72rem;">Join on Teams</a>` : ''}
        </div>
      `;
    })
    .join('');
}

async function loadCalendar() {
  try {
    monthClasses = await fetchClassesForMonth();
    renderMonthGrid();
    renderAgenda();
  } catch (err) {
    document.getElementById('agenda-list').innerHTML = `<p class="form-note">Could not load calendar: ${escCal(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!API.isLoggedIn()) {
    document.getElementById('gate-message').style.display = 'block';
    return;
  }

  document.getElementById('cal-content').style.display = 'block';

  document.getElementById('cal-prev').addEventListener('click', () => {
    currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
    loadCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
    loadCalendar();
  });

  loadCalendar();
});
