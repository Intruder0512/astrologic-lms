document.addEventListener('DOMContentLoaded', () => {
  loadCoursesInto('[data-courses-target]', { status: 'published' }, 3);
  loadFacultyInto('[data-faculty-target]', 3);
});
