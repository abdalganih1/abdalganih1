// API Service Class
class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
    }

    // Get auth token from storage
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    }

    // Set auth token
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    }

    // Remove auth token
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    }

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getToken();
    }

    // Get current user
    getCurrentUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return userData ? JSON.parse(userData) : null;
    }

    // Make API request
    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;

        const headers = {
            ...options.headers
        };

        // Only set JSON content type if not FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        // Add auth token if available
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'حدث خطأ ما');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth Methods
    async login(email, password) {
        const data = await this.request(CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.user));
        }

        return data;
    }

    async register(name, email, password, phone = '') {
        const data = await this.request(CONFIG.ENDPOINTS.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone }),
        });

        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.user));
        }

        return data;
    }

    async getProfile() {
        return this.request(CONFIG.ENDPOINTS.PROFILE);
    }

    logout() {
        this.removeToken();
        window.location.href = 'index.html';
    }

    // Course Methods
    async getCourses() {
        return this.request(CONFIG.ENDPOINTS.COURSES);
    }

    // Courses owned by the logged-in teacher (admins get all)
    async getMyCourses() {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/mine`);
    }

    async getMyStudents(limit = 50) {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/my-students?limit=${limit}`);
    }

    async getCourse(id) {
        return this.request(CONFIG.ENDPOINTS.COURSE_DETAILS(id));
    }

    async getCourseLessons(id) {
        return this.request(CONFIG.ENDPOINTS.COURSE_LESSONS(id));
    }

    async enrollInCourse(id) {
        return this.request(CONFIG.ENDPOINTS.ENROLL(id), {
            method: 'POST',
        });
    }

    // Course Management Methods (Admin/Teacher)
    async createCourse(courseData) {
        return this.request(CONFIG.ENDPOINTS.COURSES, {
            method: 'POST',
            body: JSON.stringify(courseData),
        });
    }

    async updateCourse(id, courseData) {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(courseData),
        });
    }

    async deleteCourse(id) {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/${id}`, {
            method: 'DELETE',
        });
    }

    // Lesson Management Methods
    async createLesson(courseId, lessonData) {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/${courseId}/lessons`, {
            method: 'POST',
            body: JSON.stringify(lessonData),
        });
    }

    async updateLesson(lessonId, lessonData) {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/lessons/${lessonId}`, {
            method: 'PUT',
            body: JSON.stringify(lessonData),
        });
    }

    async deleteLesson(lessonId) {
        return this.request(`${CONFIG.ENDPOINTS.COURSES}/lessons/${lessonId}`, {
            method: 'DELETE',
        });
    }

    // Payment Methods
    async submitPayment(courseId, paymentData) {
        return this.request(CONFIG.ENDPOINTS.SUBMIT_PAYMENT, {
            method: 'POST',
            body: JSON.stringify({
                course_id: courseId,
                ...paymentData
            }),
        });
    }

    async uploadReceipt(paymentId, file) {
        const formData = new FormData();
        formData.append('receipt', file);

        return this.request(CONFIG.ENDPOINTS.UPLOAD_RECEIPT(paymentId), {
            method: 'POST',
            body: formData,
        });
    }

    async getMyPayments() {
        return this.request(CONFIG.ENDPOINTS.MY_PAYMENTS);
    }

    async getPaymentDetails(paymentId) {
        return this.request(CONFIG.ENDPOINTS.PAYMENT_DETAILS(paymentId));
    }

    // Admin Payment Methods
    async getAllPayments(status = '') {
        const query = status ? `?status=${status}` : '';
        return this.request(`${CONFIG.ENDPOINTS.PAYMENTS}${query}`);
    }

    async confirmPayment(paymentId, status) {
        return this.request(CONFIG.ENDPOINTS.CONFIRM_PAYMENT(paymentId), {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }

    // Notification Methods
    async getNotifications(limit = 20) {
        return this.request(`${CONFIG.ENDPOINTS.NOTIFICATIONS}?limit=${limit}`);
    }

    async getNotificationCount() {
        return this.request(CONFIG.ENDPOINTS.NOTIFICATIONS_COUNT);
    }

    async markNotificationRead(id) {
        return this.request(CONFIG.ENDPOINTS.NOTIFICATION_READ(id), {
            method: 'PUT',
        });
    }

    async markAllNotificationsRead() {
        return this.request(CONFIG.ENDPOINTS.NOTIFICATIONS_READ_ALL, {
            method: 'PUT',
        });
    }

    // Lesson Methods
    async addLesson(courseId, lessonData) {
        return this.request(CONFIG.ENDPOINTS.ADD_LESSON(courseId), {
            method: 'POST',
            body: JSON.stringify(lessonData),
        });
    }

    async updateLesson(lessonId, lessonData) {
        return this.request(CONFIG.ENDPOINTS.UPDATE_LESSON(lessonId), {
            method: 'PUT',
            body: JSON.stringify(lessonData),
        });
    }

    async deleteLesson(lessonId) {
        return this.request(CONFIG.ENDPOINTS.DELETE_LESSON(lessonId), {
            method: 'DELETE',
        });
    }

    // Quiz Methods
    async getQuiz(lessonId) {
        return this.request(CONFIG.ENDPOINTS.QUIZ(lessonId));
    }

    async addQuestion(questionData) {
        return this.request(CONFIG.ENDPOINTS.ADD_QUESTION, {
            method: 'POST',
            body: JSON.stringify(questionData),
        });
    }

    async deleteQuestion(questionId) {
        return this.request(CONFIG.ENDPOINTS.DELETE_QUESTION(questionId), {
            method: 'DELETE',
        });
    }

    // Enrollment & Progress Methods
    async getEnrollmentStatus(courseId) {
        return this.request(CONFIG.ENDPOINTS.ENROLLMENT_STATUS(courseId));
    }

    async getCourseQuizzes(courseId) {
        return this.request(CONFIG.ENDPOINTS.COURSE_QUIZZES(courseId));
    }

    async completeLesson(lessonId) {
        return this.request(CONFIG.ENDPOINTS.COMPLETE_LESSON(lessonId), {
            method: 'POST',
        });
    }

    async submitQuiz(quizId, answers) {
        return this.request(CONFIG.ENDPOINTS.SUBMIT_QUIZ(quizId), {
            method: 'POST',
            body: JSON.stringify({ answers }),
        });
    }

    // Certificate Methods
    async getCertTemplates() {
        return this.request(CONFIG.ENDPOINTS.CERT_TEMPLATES);
    }

    async getCertTemplate(courseId) {
        return this.request(CONFIG.ENDPOINTS.CERT_TEMPLATE(courseId));
    }

    async saveCertTemplate(data) {
        return this.request(CONFIG.ENDPOINTS.CERT_TEMPLATES, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCertTemplate(id, data) {
        return this.request(`${CONFIG.ENDPOINTS.CERT_TEMPLATES}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCertTemplate(id) {
        return this.request(`${CONFIG.ENDPOINTS.CERT_TEMPLATES}/${id}`, {
            method: 'DELETE',
        });
    }

    async getMyCertificates() {
        return this.request(CONFIG.ENDPOINTS.MY_CERTIFICATES);
    }

    async verifyCertificate(certNumber) {
        return this.request(CONFIG.ENDPOINTS.VERIFY_CERTIFICATE(certNumber));
    }

    async issueCertificate(courseId) {
        return this.request(CONFIG.ENDPOINTS.ISSUE_CERTIFICATE(courseId), {
            method: 'POST',
        });
    }

    async getIssuedCertificates() {
        return this.request(CONFIG.ENDPOINTS.ISSUED_CERTIFICATES);
    }

    // User Management Methods (Admin)
    async getUsers(params = {}) {
        const query = new URLSearchParams();
        if (params.search) query.set('search', params.search);
        if (params.role) query.set('role', params.role);
        if (params.sort) query.set('sort', params.sort);
        if (params.order) query.set('order', params.order);
        const qs = query.toString();
        return this.request(`${CONFIG.ENDPOINTS.USERS}${qs ? '?' + qs : ''}`);
    }

    async getUser(id) {
        return this.request(CONFIG.ENDPOINTS.USER_DETAILS(id));
    }

    async createUser(data) {
        return this.request(CONFIG.ENDPOINTS.USERS, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id, data) {
        return this.request(CONFIG.ENDPOINTS.USER_DETAILS(id), {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id) {
        return this.request(CONFIG.ENDPOINTS.USER_DETAILS(id), {
            method: 'DELETE',
        });
    }
}

// Create global API instance
const api = new ApiService();
