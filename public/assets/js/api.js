// Same-origin API client. The frontend is served by the same Express app
// as the API (see src/server.js static mount), so relative /api paths work
// in every environment without a CORS or base-URL configuration step.
const API = {
  base: '/api',

  token() {
    return localStorage.getItem('icas_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('icas_token', token);
  },

  clearToken() {
    localStorage.removeItem('icas_token');
    localStorage.removeItem('icas_user');
  },

  setUser(user) {
    localStorage.setItem('icas_user', JSON.stringify(user));
  },

  getUser() {
    const raw = localStorage.getItem('icas_user');
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!this.token();
  },

  async request(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    if (auth && this.token()) headers['Authorization'] = `Bearer ${this.token()}`;

    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: 'Unexpected response from server.' };
    }

    if (!res.ok) {
      const err = new Error(data.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  // ---- Public ----
  getCourses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/courses${qs ? '?' + qs : ''}`);
  },
  getCourse(slug) {
    return this.request(`/courses/${slug}`);
  },
  getFaculty() {
    return this.request('/faculty');
  },
  submitEnquiry(payload) {
    return this.request('/enquiries', { method: 'POST', body: payload });
  },
  register(payload) {
    return this.request('/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return this.request('/auth/login', { method: 'POST', body: payload });
  },

  // ---- Authenticated (student) ----
  me() {
    return this.request('/auth/me', { auth: true });
  },
  myDashboard() {
    return this.request('/students/me/dashboard', { auth: true });
  },
  updateMyProfile(payload) {
    return this.request('/students/me', { method: 'PUT', body: payload, auth: true });
  },
  registerInterest(payload) {
    return this.request('/students/me/register-interest', { method: 'POST', body: payload, auth: true });
  },

  // ---- Calendar (role-aware) ----
  getStudentCalendar(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/students/me/calendar${qs ? '?' + qs : ''}`, { auth: true });
  },
  getTeacherCalendar(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/teacher/live-classes${qs ? '?' + qs : ''}`, { auth: true });
  },
  getAdminCalendar(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/calendar${qs ? '?' + qs : ''}`, { auth: true });
  },

  // ---- Teacher ----
  getMyTeachingCourses() {
    return this.request('/teacher/courses', { auth: true });
  },
  getCourseBatches(courseId) {
    return this.request(`/teacher/courses/${courseId}/batches`, { auth: true });
  },
  scheduleLiveClass(payload) {
    return this.request('/teacher/live-classes', { method: 'POST', body: payload, auth: true });
  },
  cancelLiveClass(id) {
    return this.request(`/teacher/live-classes/${id}`, { method: 'DELETE', auth: true });
  },
  getLiveClassRoster(id) {
    return this.request(`/teacher/live-classes/${id}/roster`, { auth: true });
  },
  recordAttendance(id, attendance) {
    return this.request(`/teacher/live-classes/${id}/attendance`, { method: 'POST', body: { attendance }, auth: true });
  },
  postAnnouncement(payload) {
    return this.request('/teacher/announcements', { method: 'POST', body: payload, auth: true });
  },
  getTeacherStats() {
    return this.request('/teacher/stats', { auth: true });
  },
  getTeacherStudents() {
    return this.request('/teacher/students', { auth: true });
  },

  // ---- Student announcements ----
  getMyAnnouncements() {
    return this.request('/students/me/announcements', { auth: true });
  },

  // ---- Admin ----
  getAdminDashboard() {
    return this.request('/admin/dashboard', { auth: true });
  },
  getAdminCourses() {
    return this.request('/admin/courses', { auth: true });
  },
  createCourse(payload) {
    return this.request('/admin/courses', { method: 'POST', body: payload, auth: true });
  },
  updateAdminCourse(id, payload) {
    return this.request(`/admin/courses/${id}`, { method: 'PUT', body: payload, auth: true });
  },
  getAdminInstructors() {
    return this.request('/admin/instructors', { auth: true });
  },
  createInstructor(payload) {
    return this.request('/admin/instructors', { method: 'POST', body: payload, auth: true });
  },
  createAdminBatch(payload) {
    return this.request('/admin/batches', { method: 'POST', body: payload, auth: true });
  },
  getAdminStudents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/students${qs ? '?' + qs : ''}`, { auth: true });
  },
  reviewAdmission(id, payload) {
    return this.request(`/admin/students/${id}/review`, { method: 'PUT', body: payload, auth: true });
  },
  allocateBatch(id, payload) {
    return this.request(`/admin/students/${id}/allocate-batch`, { method: 'PUT', body: payload, auth: true });
  },
  getAdminFaculty() {
    return this.request('/admin/faculty', { auth: true });
  },
  createFacultyProfile(formData) {
    return this.request('/admin/faculty', { method: 'POST', body: formData, auth: true, isForm: true });
  },
  updateFacultyProfile(id, formData) {
    return this.request(`/admin/faculty/${id}`, { method: 'PUT', body: formData, auth: true, isForm: true });
  },
  deleteFacultyProfile(id) {
    return this.request(`/admin/faculty/${id}`, { method: 'DELETE', auth: true });
  },
};
