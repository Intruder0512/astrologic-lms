function currentFilters() {
  const f = { status: 'published' };
  const cat = document.getElementById('f-category').value;
  const lvl = document.getElementById('f-level').value;
  const mode = document.getElementById('f-mode').value;
  if (cat) f.category = cat;
  if (lvl) f.level = lvl;
  if (mode) f.mode = mode;
  return f;
}

function refresh() {
  loadCoursesInto('[data-courses-target]', currentFilters());
}

document.addEventListener('DOMContentLoaded', () => {
  ['f-category', 'f-level', 'f-mode'].forEach((id) => {
    document.getElementById(id).addEventListener('change', refresh);
  });
  refresh();
});
