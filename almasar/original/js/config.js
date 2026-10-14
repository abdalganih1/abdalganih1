// API Configuration
const CONFIG = {
    API_BASE_URL: 'https://masar-lms-api.abdalganih2.workers.dev/api/v1',

    // Endpoints
    ENDPOINTS: {
        // Auth
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        PROFILE: '/auth/profile',

        // Courses
        COURSES: '/courses',
        COURSE_DETAILS: (id) => `/courses/${id}`,
        COURSE_LESSONS: (id) => `/courses/${id}/lessons`,
        ENROLL: (id) => `/courses/${id}/enroll`,

        // Payments
        PAYMENTS: '/payments',
        SUBMIT_PAYMENT: '/payments',
        UPLOAD_RECEIPT: (id) => `/payments/${id}/receipt`,
        MY_PAYMENTS: '/payments/my',
        PAYMENT_DETAILS: (id) => `/payments/${id}`,
        CONFIRM_PAYMENT: (id) => `/payments/${id}/confirm`,

        // Notifications
        NOTIFICATIONS: '/notifications',
        NOTIFICATIONS_COUNT: '/notifications/count',
        NOTIFICATION_READ: (id) => `/notifications/${id}/read`,
        NOTIFICATIONS_READ_ALL: '/notifications/read-all',

        // Lessons
        ADD_LESSON: (courseId) => `/courses/${courseId}/lessons`,
        UPDATE_LESSON: (lessonId) => `/courses/lessons/${lessonId}`,
        DELETE_LESSON: (lessonId) => `/courses/lessons/${lessonId}`,

        // Quizzes
        QUIZ: (lessonId) => `/quizzes/${lessonId}`,
        ADD_QUESTION: '/quizzes/questions',
        DELETE_QUESTION: (questionId) => `/quizzes/questions/${questionId}`,
        SUBMIT_QUIZ: (quizId) => `/quizzes/${quizId}/submit`,

        // AI - Quiz generation
        GENERATE_QUIZ: '/ai/generate-quiz',

        // Enrollment & Progress
        ENROLLMENT_STATUS: (courseId) => `/courses/${courseId}/enrollment-status`,
        COURSE_QUIZZES: (courseId) => `/courses/${courseId}/quizzes`,
        COMPLETE_LESSON: (lessonId) => `/courses/lessons/${lessonId}/complete`,

        // Users (Admin)
        USERS: '/users',
        USER_DETAILS: (id) => `/users/${id}`,

        // Certificates
        CERT_TEMPLATES: '/certificates/templates',
        CERT_TEMPLATE: (courseId) => `/certificates/templates/${courseId}`,
        MY_CERTIFICATES: '/certificates/my',
        VERIFY_CERTIFICATE: (certNumber) => `/certificates/verify/${certNumber}`,
        ISSUE_CERTIFICATE: (courseId) => `/certificates/issue/${courseId}`,
        ISSUED_CERTIFICATES: '/certificates/issued',

        // Settings (Admin)
        SETTINGS: '/settings',
        SETTINGS_MIGRATE: '/settings/migrate',
        PAYMENT_METHODS_PUBLIC: '/settings/payment-methods',
    },

    // Storage Keys
    STORAGE_KEYS: {
        TOKEN: 'auth_token',
        USER: 'user_data',
    }
};

// Format price to US Dollars (unified currency across the platform)
function formatPrice(price, originalPrice = null, discountPercentage = null) {
    if (price === 0 && (!originalPrice || originalPrice === 0)) return 'مجاني';

    const hasDiscount = discountPercentage > 0 && originalPrice > 0;
    const formattedPrice = new Intl.NumberFormat('en-US').format(price) + ' $';

    if (hasDiscount) {
        const formattedOriginal = new Intl.NumberFormat('en-US').format(originalPrice) + ' $';
        return `<span style="text-decoration: line-through; color: #888; font-size: 0.85rem; margin-left: 8px;">${formattedOriginal}</span> ${formattedPrice}`;
    }

    return formattedPrice;
}

// Format duration
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
    }
    return `${mins} دقيقة`;
}
