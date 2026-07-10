function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

async function initCourseDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) return showNotFound();

  try {
    const data = await API.getCourse(slug);
    renderCourse(data.course, data.batches || []);
  } catch (err) {
    showNotFound();
  }
}

function showNotFound() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('not-found-state').style.display = 'block';
}

function renderCourse(c, batches) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('course-content').style.display = 'block';
  document.getElementById('page-title').textContent = `${c.title} — ICAS Lucknow-III`;

  document.getElementById('c-category').textContent = `${c.category} · ${c.level}`;
  document.getElementById('c-title').textContent = c.title;
  document.getElementById('c-short').textContent = c.shortDescription || '';
  document.getElementById('c-description').textContent = c.description || '';

  const fee = c.discountedFee || c.fee;
  document.getElementById('c-fee').textContent = fee != null ? `₹${Number(fee).toLocaleString('en-IN')}` : 'Contact for fee';
  document.getElementById('c-level').textContent = c.level;
  document.getElementById('c-mode').textContent = c.mode;
  document.getElementById('c-duration').textContent = c.durationWeeks ? `${c.durationWeeks} weeks` : '—';
  document.getElementById('c-language').textContent = c.language || 'English';
  document.getElementById('c-cert').textContent = c.certificateOffered ? 'Yes' : 'No';

  if (c.learningOutcomes && c.learningOutcomes.length) {
    document.getElementById('c-outcomes-wrap').style.display = 'block';
    document.getElementById('c-outcomes').innerHTML = c.learningOutcomes.map((o) => `<li>${esc(o)}</li>`).join('');
  }

  if (c.syllabus && c.syllabus.length) {
    document.getElementById('c-syllabus-wrap').style.display = 'block';
    document.getElementById('c-syllabus').innerHTML = c.syllabus
      .map(
        (m) => `
        <div class="syllabus-module">
          <h4>${esc(m.moduleTitle)}</h4>
          <ul>${(m.topics || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
      `
      )
      .join('');
  }

  if (c.faqs && c.faqs.length) {
    document.getElementById('c-faq-wrap').style.display = 'block';
    document.getElementById('c-faq').innerHTML = c.faqs
      .map(
        (f) => `
        <div class="faq-item"><h4 style="margin-bottom:0.3em;">${esc(f.question)}</h4><p style="margin:0;">${esc(f.answer)}</p></div>
      `
      )
      .join('');
  }

  const batchesEl = document.getElementById('c-batches');
  if (!batches.length) {
    batchesEl.innerHTML = `<p class="form-note">No batches currently scheduled — register your interest and we'll notify you when one opens.</p>`;
  } else {
    batchesEl.innerHTML = batches
      .map(
        (b) => `
        <div style="padding:0.7em 0; border-bottom:1px dotted var(--line-on-light);">
          <strong style="font-size:0.9rem;">${esc(b.batchName)}</strong>
          <div class="form-note" style="margin:0.2em 0 0;">Starts ${new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${esc(b.mode)}${b.seatsLeft != null ? ` · ${b.seatsLeft} seats left` : ''}</div>
        </div>
      `
      )
      .join('');
  }

  if (API.isLoggedIn()) {
    document.getElementById('enrol-cta').innerHTML = `<button class="btn btn-primary" id="register-interest-btn">Register for ${esc(c.title)}</button>`;
    document.getElementById('register-interest-btn').addEventListener('click', async () => {
      try {
        await API.registerInterest({ courseId: c.id || c._id });
        alert('Registered! Head to your dashboard to upload documents and complete payment.');
        window.location.href = '/dashboard.html';
      } catch (err) {
        alert(err.message || 'Could not register right now.');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initCourseDetail);
