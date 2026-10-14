
// === Toast Notification System (بديل alert) ===
(function(){
  if (document.getElementById('masar-toast-container')) return;
  const style = document.createElement('style');
  style.textContent = `
    #masar-toast-container{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-width:92vw;}
    .masar-toast{background:#1f2937;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.35);opacity:0;transform:translateY(12px);transition:all .25s ease;max-width:100%;text-align:center;border-inline-start:4px solid #18b8c4;}
    .masar-toast.show{opacity:1;transform:translateY(0);}
    .masar-toast.success{border-inline-start-color:#10b981;}
    .masar-toast.error{border-inline-start-color:#ef4444;}
    .masar-toast.warn{border-inline-start-color:#f59e0b;}
  `;
  document.head.appendChild(style);
  const c = document.createElement('div');
  c.id = 'masar-toast-container';
  document.body.appendChild(c);
})();

function showToast(msg, type) {
  try {
    const c = document.getElementById('masar-toast-container');
    if (!c) { alert(msg); return; }
    const t = document.createElement('div');
    t.className = 'masar-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 2600);
  } catch(e) { alert(msg); }
}

// Configure marked.js for exercise rendering
if (typeof marked !== 'undefined') {
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
        // marked v5+ passes a token object { text, lang }, older versions pass (string, lang)
        const codeText = typeof code === 'string' ? code : (code?.text ?? '');
        const lang = (typeof code === 'string' ? language : code?.lang) || 'python';
        const escaped = codeText.replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<div class="exercise-code-block">
            <div class="exercise-code-header">
                <div class="exercise-code-dots"><span></span><span></span><span></span></div>
                <span>${lang}</span>
            </div>
            <pre><code>${escaped}</code></pre>
        </div>`;
    };
    renderer.codespan = function(code) {
        // marked v5+ passes a token object { text, raw }, older versions pass a string
        const text = typeof code === 'string' ? code : (code?.text ?? '');
        const escaped = text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<span class="exercise-inline-code">${escaped}</span>`;
    };
    marked.setOptions({ renderer, breaks: true, gfm: true });
}

// Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // Check current page and initialize
    const path = window.location.pathname;
    const pageName = path.split('/').pop().toLowerCase();

    // Normalize page name (handle clean URLs)
    let page = pageName;
    if (pageName === '' || pageName === 'index' || pageName === 'index.html') page = 'index';
    else if (pageName === 'courses' || pageName === 'courses.html') page = 'courses';
    else if (pageName === 'course' || pageName === 'course.html') page = 'course';
    else if (pageName === 'login' || pageName === 'login.html') page = 'login';
    else if (pageName === 'register' || pageName === 'register.html') page = 'register';

    // Auto-redirect if on index and already logged in as Admin/Teacher
    if (page === 'index' && api.isLoggedIn()) {
        const user = api.getCurrentUser();
        if (user && user.role === 'admin') {
            window.location.href = 'admin/index.html';
        } else if (user && user.role === 'teacher') {
            window.location.href = 'teacher/index.html';
        }
    }

    console.log('Current page detected:', page); // Debugging

    // Update navigation based on auth state
    updateNavigation();

    // Mobile menu toggle (زر القائمة بالموبايل)
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const links = document.querySelector('.nav-links');
            if (!links) return;
            links.classList.toggle('open');
            mobileBtn.textContent = links.classList.contains('open') ? '✕' : '☰';
        });
    }

    // Page-specific initialization
    switch (page) {
        case 'index':
            loadFeaturedCourses();
            break;
        case 'courses':
            loadAllCourses();
            break;
        case 'course':
            loadCourseDetails().then(() => {
                // Deep-link: ?lesson=ID يفتح صفحة المشاهدة مباشرة بعد التحميل
                try {
                    const lid = parseInt(new URLSearchParams(window.location.search).get('lesson'), 10);
                    if (lid > 0 && window.currentCourse?.lessons?.some(l => l.id === lid)) playLesson(lid);
                } catch (e) { console.warn('[deep-link]', e); }
            });
            break;
        case 'login':
            initLoginForm();
            break;
        case 'register':
            initRegisterForm();
            break;
    }
});

// Update navigation based on login state
function updateNavigation() {
    const navButtons = document.querySelector('.nav-buttons');
    if (!navButtons) return;

    if (api.isLoggedIn()) {
        const user = api.getCurrentUser();
        let dashboardLink = '';
        if (user?.role === 'admin') {
            dashboardLink = '<a href="admin/index.html" class="btn btn-outline">لوحة التحكم</a>';
        } else if (user?.role === 'teacher') {
            dashboardLink = '<a href="teacher/index.html" class="btn btn-outline">لوحة المعلم</a>';
        }

        navButtons.innerHTML = `
            <span class="user-greeting">مرحباً، ${user?.name || 'المستخدم'}</span>
            ${dashboardLink}
            <button onclick="api.logout()" class="btn btn-outline">تسجيل الخروج</button>
        `;
    }
}

// Load featured courses on homepage
async function loadFeaturedCourses() {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    try {
        const data = await api.getCourses();
        const courses = data.results || [];

        if (courses.length === 0) {
            grid.innerHTML = '<p class="no-courses">لا توجد كورسات متاحة حالياً</p>';
            return;
        }

        grid.innerHTML = courses.map(course => createCourseCard(course)).join('');

        // Update stats
        const coursesCount = document.getElementById('coursesCount');
        if (coursesCount) {
            coursesCount.textContent = courses.length + '+';
        }
    } catch (error) {
        grid.innerHTML = `<p class="error-message">خطأ في تحميل الكورسات: ${error.message}</p>`;
    }
}

// Load all courses on courses page
async function loadAllCourses() {
    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    // Get category filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');

    try {
        const data = await api.getCourses();
        let courses = data.results || [];

        // Filter by category if specified
        if (categoryFilter) {
            courses = courses.filter(c => c.category === categoryFilter);

            // Update page title
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                pageTitle.textContent = `كورسات ${categoryFilter}`;
            }
        }

        if (courses.length === 0) {
            grid.innerHTML = '<p class="no-courses">لا توجد كورسات متاحة في هذا التصنيف</p>';
            return;
        }

        grid.innerHTML = courses.map(course => createCourseCard(course)).join('');
    } catch (error) {
        grid.innerHTML = `<p class="error-message">خطأ في تحميل الكورسات: ${error.message}</p>`;
    }
}

// Category-aware course cover with guaranteed no-404 fallback
function courseThumb(course, cls) {
    const covers = {
        'برمجة': 'https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/programming.png',
        'تصميم': 'https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/design.png',
        'لغات': 'https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/languages.png',
        'أكاديمي': 'https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/academic.png',
        'ريادة': 'https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/business.png',
    };
    const cat = Object.keys(covers).find(k => (course.category||'').includes(k));
    return `<img src="${course.thumbnail_url || covers[cat] || 'https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/general.png'}"
        alt="${course.title}" ${cls?'class="'+cls+'"':''} loading="lazy"
        onerror="this.onerror=null;this.src='https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/general.png'">`;
}

// Create course card HTML
function createCourseCard(course) {
    const isFree = course.price === 0 && (!course.original_price || course.original_price === 0);
    const hasDiscount = course.discount_percentage > 0 && course.original_price > 0;

    return `
        <a href="course.html?id=${course.id}" class="course-card">
            <div class="course-image">
                ${courseThumb(course)}
                ${isFree ? '<span class="course-badge free">مجاني</span>' : ''}
                ${hasDiscount ? `<span class="course-badge" style="position: absolute; bottom: 12px; right: 12px; top: auto; background: linear-gradient(135deg, #ef4444, #f97316);">خصم ${course.discount_percentage}%</span>` : ''}
            </div>
            <div class="course-content">
                <span class="course-category">${course.category}</span>
                <h3 class="course-title">${course.title}</h3>
                <p class="course-instructor">👨‍🏫 ${course.instructor}</p>
                <div class="course-meta">
                    <span class="course-price ${isFree ? 'free' : ''}">${formatPrice(course.price, course.original_price, course.discount_percentage)}</span>
                    <span class="course-duration">⏱ ${formatDuration(course.duration_minutes)}</span>
                </div>
            </div>
        </a>
    `;
}

// Load course details
async function loadCourseDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (!courseId) {
        window.location.href = 'courses.html';
        return;
    }

    const container = document.getElementById('courseDetails');
    if (!container) return;

    try {
        const promises = [
            api.getCourse(courseId),
            api.getCourseLessons(courseId)
        ];

        // Fetch enrollment status and quizzes if logged in
        let enrollmentData = null;
        let quizzesData = null;

        const [course, lessonsData] = await Promise.all(promises);

        // Merge full lessons data (with content_url) into course object
        if (lessonsData && lessonsData.results) {
            course.lessons = lessonsData.results;
        }

        // Guest enrollment check (cookie-based students, no account needed)
        if (!api.isLoggedIn()) {
            try {
                const gid = localStorage.getItem('masar_guest_id');
                if (gid) {
                    const gres = await fetch(`${CONFIG.API_BASE_URL}/grants/status?guest_id=${gid}&course_id=${courseId}`);
                    const gdata = await gres.json();
                    if (gdata.enrolled) enrollmentData = { enrolled: true, progress: 0, completed_lessons: 0, total_lessons: 0, completed_lesson_ids: [] };
                }
            } catch (e) { console.log('guest check failed', e.message); }
        }

    // Fetch enrollment status and quizzes if logged in (separate to avoid auth errors)
        if (api.isLoggedIn()) {
            try {
                [enrollmentData, quizzesData] = await Promise.all([
                    api.getEnrollmentStatus(courseId),
                    api.getCourseQuizzes(courseId)
                ]);
            } catch (e) {
                console.log('Could not fetch enrollment/quiz data:', e.message);
            }
        }

        displayCourseDetails(course, enrollmentData, quizzesData);
    } catch (error) {
        container.innerHTML = `<p class="error-message">خطأ في تحميل الكورس: ${error.message}</p>`;
    }
}

// Play the course promo/trailer video (available to everyone)
function playPromoVideo() {
    const course = window.currentCourse;
    if (!course || !course.promo_video_url) return;
    const player = document.getElementById('coursePlayer');
    if (!player) return;
    let vid = '';
    const m = (course.promo_video_url || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    vid = m ? m[1] : '';
    // الفيديو التعريفي: صفحة مشاهدة كاملة مثل الدروس
    const fake = { id: 0, type: 'video', title: '🎬 الفيديو التعريفي — ' + (course.title || ''), content_url: course.promo_video_url, duration_seconds: 0, text_content: '' };
    buildWatchPage(fake);
}

// Display course details
function displayCourseDetails(course, enrollmentData, quizzesData) {
    window.currentCourseTitle = (course && course.title) || '';
    const container = document.getElementById('courseDetails');
    const isFree = course.price === 0;
    const lessons = course.lessons || [];

    window.currentCourse = course;
    window.currentEnrollment = enrollmentData;
    window.currentQuizzes = quizzesData?.results || [];

    // SEO ديناميكي: عنوان + canonical + description خاص بكل كورس (نفس حل post.html)
    try {
        if (course.title) document.title = course.title + ' | منصة مسار التعليمية';
        let can = document.querySelector('link[rel="canonical"]');
        if (!can) { can = document.createElement('link'); can.setAttribute('rel','canonical'); document.head.appendChild(can); }
        can.setAttribute('href', 'https://almasar.org/course?id=' + encodeURIComponent(course.id));
        let md = document.querySelector('meta[name="description"]');
        if (!md) { md = document.createElement('meta'); md.setAttribute('name','description'); document.head.appendChild(md); }
        const cleanDesc = (course.description || '').replace(/[*_#>`~]/g, ' ').replace(/\s+/g, ' ').trim();
        md.setAttribute('content', (cleanDesc || 'تفاصيل الكورس: دروس فيديو، اختبارات تفاعلية، وشهادة إتمام من منصة مسار').slice(0, 155));
        if (course.thumbnail_url) {
            let oi = document.querySelector('meta[property="og:image"]') || (() => { const m = document.createElement('meta'); m.setAttribute('property','og:image'); document.head.appendChild(m); return m; })();
            oi.setAttribute('content', course.thumbnail_url);
        }
    } catch (e) { console.log('SEO meta failed', e.message); }

    const currentUser = api.getCurrentUser();
    const isInstructor = currentUser && (currentUser.role === 'admin' ||
        (currentUser.role === 'teacher' && (course.instructor_id === currentUser.id || course.instructor === currentUser.name)));

    const isEnrolled = enrollmentData && enrollmentData.enrolled;
    const progress = enrollmentData ? enrollmentData.progress : 0;
    const completedLessonIds = enrollmentData?.completed_lesson_ids || [];

    // Build quizzes map: lesson_id -> quiz
    const quizzesMap = {};
    (quizzesData?.results || []).forEach(q => {
        quizzesMap[q.lesson_id] = q;
    });

    // التجربة الذكية المرتبطة بالكورس (محطة 🎯 + بانر)
    const aiExp = (typeof getExperienceByCourse === 'function') ? getExperienceByCourse(course.id) : null;


    // Build enrollment button HTML
    let enrollButtonHtml = '';
    if (isInstructor) {
        enrollButtonHtml = ''; // Instructors don't need enroll button
    } else if (isEnrolled) {
        enrollButtonHtml = `
            <div class="enrolled-badge" id="enrollBtn">
                <span class="enrolled-icon">✅</span>
                <span>مسجل في هذا الكورس</span>
            </div>
        `;
    } else if (api.isLoggedIn()) {
        enrollButtonHtml = `<button class="btn btn-primary btn-lg" id="enrollBtn" onclick="enrollInCourse(${course.id})">سجل الآن</button>`;
    } else if (course.price > 0) {
        enrollButtonHtml = `<button class="btn btn-primary btn-lg" onclick="openGrantModal(${course.id}, '${(course.title||'').replace(/'/g, "\\'").substring(0, 40)}')">🎓 ادخل بمنحة مجانية</button>
        <button class="btn btn-outline btn-lg" onclick="applyCouponInline(${course.id})">🎫 عندي كوبون</button>`;
    } else {
        enrollButtonHtml = `<button class="btn btn-primary btn-lg" onclick="quickFreeEnroll(${course.id})">ابدأ التعلم كضيف</button>
        <a href="login.html?redirect=course.html?id=${course.id}" class="btn btn-outline btn-lg">تسجيل دخول</a>`;
    }

    // Build progress bar HTML
    let progressHtml = '';
    if (isEnrolled) {
        progressHtml = `
            <div class="progress-section">
                <div class="progress-header">
                    <span class="progress-label">📊 تقدمك في الكورس</span>
                    <span class="progress-value">${progress}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-details">
                    ${enrollmentData.completed_lessons || 0} من ${enrollmentData.total_lessons || 0} درس مكتمل
                </div>
                ${progress === 100 ? (enrollmentData.certificate_number ? `
                <div style="margin-top: 15px; text-align: center;">
                    <a href="certificate.html?id=${enrollmentData.certificate_number}" target="_blank" class="btn btn-primary" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: bold; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                        🏆 عرض الشهادة
                    </a>
                </div>
                ` : `
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="requestCertificate(${course.id})" class="btn btn-primary" style="width: 100%; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; font-weight: bold; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                        🎓 إصدار الشهادة الآن
                    </button>
                </div>
                `) : ''}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="course-header">
            <div class="container">
                <div class="course-header-content">
                    <span class="course-category">${course.category}</span>
                    <h1>${course.title}</h1>
                    <p class="course-description">${course.description}</p>
                    <div class="course-meta-info">
                        <span>👨‍🏫 ${course.instructor}</span>
                        <span>📚 ${lessons.length} درس</span>
                        <span>⏱ ${formatDuration(course.duration_minutes)}</span>
                    </div>
                </div>
                <div class="course-header-image" id="coursePlayer">
                    ${courseThumb(course)}
                    <div class="hero-buttons">
                        ${course.promo_video_url ? `<button class="btn btn-glass" onclick="playPromoVideo()">🎬 شاهد الفيديو التعريفي</button>` : ''}
                        ${lessons.length > 0 ? `<button class="btn btn-primary" onclick="playLesson(${lessons[0].id})">▶ ابدأ المشاهدة</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="course-body">
            ${aiExp ? buildCourseBanner(aiExp) : ''}
            <div class="course-content-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>محتوى الكورس</h2>
                    ${isInstructor ? `
                        <button class="btn btn-primary" onclick="openAddLessonModal(${course.id})">
                            ➕ إضافة درس جديد
                        </button>
                    ` : ''}
                </div>
                <div class="lessons-list">
                    ${lessons.length === 0 ? '<p style="text-align: center; color: #666; padding: 40px;">لا توجد دروس في هذا الكورس بعد</p>' : ''}
                    ${lessons.map((lesson, index) => {
        const hasQuiz = quizzesMap[lesson.id];
        const isCompleted = completedLessonIds.includes(lesson.id);
        const isExercise = lesson.title && (lesson.title.includes('تطبيق عملي') || lesson.title.includes('التطبيق العملي'));
        const isSummary = lesson.title && lesson.title.includes('ملخص الكورس');
        const isClickable = (lesson.content_url || lesson.text_content || isExercise) && !isInstructor;
        const extraClass = isExercise ? 'is-exercise' : isSummary ? 'is-summary' : '';
        const icon = isCompleted ? '✅' : isExercise ? '🧠' : isSummary ? '📘' : (index + 1);
        const badge = isExercise ? '<span class="exercise-type-badge">تطبيق عملي</span>' : isSummary ? '<span class="summary-type-badge">ملخص</span>' : '';
        // محطة 🎯 هدف قريب: تُدرج بعد الدرس المرتبط بالتجربة الذكية
        const milestoneHtml = (aiExp && aiExp.milestone && lesson.id === aiExp.milestone.afterLessonId)
            ? buildMilestoneHtml(aiExp) : '';
        return `
                        <div class="lesson-item ${isClickable ? 'clickable' : ''} ${isCompleted ? 'lesson-completed' : ''} ${extraClass}" 
                             onclick="${isClickable ? `playLesson(${lesson.id})` : ''}" 
                             style="${isClickable ? 'cursor: pointer;' : ''}">
                            <span class="lesson-number">${icon}</span>
                            <div class="lesson-info">
                                <h4>${badge}${lesson.title}</h4>
                                <div class="lesson-badges">
                                    <span class="lesson-type">${getLessonTypeIcon(lesson.type)} ${getLessonTypeName(lesson.type)}</span>
                                    ${hasQuiz ? `<span class="quiz-badge" onclick="event.stopPropagation(); openStudentQuiz(${lesson.id})" title="يوجد اختبار - ${hasQuiz.question_count} أسئلة">📝 اختبار (${hasQuiz.question_count})</span>` : ''}
                                </div>
                            </div>
                            <span class="lesson-duration">${formatLessonDuration(lesson.duration_seconds)}</span>
                            ${isInstructor ? `
                                <div class="lesson-actions" onclick="event.stopPropagation()">
                                    <button class="action-btn view-btn" onclick="playLesson(${lesson.id})" title="معاينة الدرس">👁️</button>
                                    <button class="action-btn edit-btn" onclick="openEditLessonModal(${lesson.id})" title="تعديل">✏️</button>
                                    <button class="action-btn delete-btn" onclick="deleteLesson(${lesson.id}, '${lesson.title.replace(/'/g, "\\'")}')" title="حذف">🗑️</button>
                                    <button class="action-btn quiz-btn" onclick="openQuizModal(${lesson.id})" title="إدارة الاختبار">📝</button>
                                    ${index > 0 ? `<button class="action-btn move-btn" onclick="moveLessonUp(${lesson.id}, ${index})" title="تحريك للأعلى">👆</button>` : ''}
                                    ${index < lessons.length - 1 ? `<button class="action-btn move-btn" onclick="moveLessonDown(${lesson.id}, ${index})" title="تحريك للأسفل">👇</button>` : ''}
                                </div>
                            ` : `
                                <div class="lesson-right-actions">
                                    ${isEnrolled && !isCompleted ? `<button class="action-btn complete-btn" onclick="event.stopPropagation(); markLessonComplete(${lesson.id})" title="تحديد كمكتمل">☑️</button>` : ''}
                                    ${(lesson.content_url || lesson.text_content || isExercise) ? '<span>▶</span>' : '<span>🔒</span>'}
                                </div>
                            `}
                        </div>
                        ${milestoneHtml}
                    `}).join('')}
                </div>

            </div>
            
            <div class="course-sidebar">
                <div class="price-card">
                    ${course.discount_percentage > 0 && course.original_price > 0 ? `<div style="text-align: center; margin-bottom: 10px;">
                        <span style="background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 5px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">خصم ${course.discount_percentage}%</span>
                    </div>` : ''}
                    <div class="price-value ${isFree ? 'free' : ''}">${formatPrice(course.price, course.original_price, course.discount_percentage)}</div>
                    ${enrollButtonHtml}
                    ${progressHtml}
                    <ul class="course-includes">
                        <li>✅ ${lessons.length} درس فيديو</li>
                        <li>✅ وصول مدى الحياة</li>
                        <li>✅ شهادة عند الإكمال</li>
                        ${course.can_download ? '<li>✅ قابل للتحميل</li>' : ''}
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Add student-specific styles
    addStudentStyles();

    if (isInstructor) {
        addInstructorModals();
    }
}

// Play Lesson Function
function playLesson(lessonId) {
    if (!window.currentCourse || !window.currentCourse.lessons) return;

    const lesson = window.currentCourse.lessons.find(l => l.id == lessonId);
    if (!lesson) return;

    const isExercise = lesson.title && (lesson.title.includes('تطبيق عملي') || lesson.title.includes('التطبيق العملي'));
    if (!lesson.content_url && !lesson.text_content && !isExercise) {
        showToast('هذا الدرس غير متاح حالياً', 'warn');
        return;
    }

    // === LMS WATCH PAGE: صفحة مشاهدة كاملة بدل النافذة المنبثقة ===
    if (!document.getElementById('courseDetails')) return;
    buildWatchPage(lesson);

    // === FIX: سجّل الدرس بالتاريخ حتى يعمل زر الرجوع بالموبايل/المتصفح ===
    try {
        const courseIdParam = new URLSearchParams(window.location.search).get('id') || window.currentCourse?.id || '';
        const newState = { lesson: String(lessonId), course: String(courseIdParam), ts: Date.now() };
        if (!history.state || history.state.lesson !== newState.lesson) {
            const url = new URL(window.location.href);
            url.searchParams.set('lesson', newState.lesson);
            history.pushState(newState, '', url);
        }
        if (!window.__popstateBound) {
            window.__popstateBound = true;
            window.addEventListener('popstate', function(e) {
                // رجوع: أغلق صفحة المشاهدة وارجع لصفحة الكورس (أو الدرس السابق بالتاريخ)
                try {
                    if (e.state && e.state.lesson) {
                        const lid = parseInt(e.state.lesson, 10);
                        if (lid > 0) { playLesson(lid); return; }
                    }
                    // تراجع لما قبل الدرس: صفحة الكورس الأصلية
                    const url = new URL(window.location.href);
                    url.searchParams.delete('lesson');
                    history.replaceState({}, '', url);
                    if (typeof loadCourseDetails === 'function') loadCourseDetails();
                } catch(err) { console.error('[back-fix]', err); }
            });
        }
    } catch(e) { console.warn('[pushState]', e); }

    return; // كل العرض صار في buildWatchPage (صفحة المشاهدة الكاملة)
}

// واجهة إغلاق صفحة المشاهدة والعودة لصفحة الكورس (تستخدمها أزرار الرجوع)
function closeWatchPage() {
    collapseVideo();
}

window.__defaultExercise = `
## تعليمات التطبيق العملي

قم بتطبيق ما تعلمته في هذا الدرس من خلال الخطوات التالية:

### الخطوة 1: مراجعة المفاهيم
- راجع جميع المفاهيم التي تم شرحها في الدرس السابق
- تأكد من فهمك لكل نقطة قبل الانتقال للتطبيق

### الخطوة 2: التطبيق العملي
1. افتح بيئة التطوير الخاصة بك
2. أنشئ مشروع جديد
3. طبق المفاهيم التي تعلمتها خطوة بخطوة
4. اختبر الكود وتأكد من عمله بشكل صحيح

### الخطوة 3: التحقق من النتائج
- قارن نتائجك مع المطلوب
- إذا واجهتك مشكلة، راجع الدرس مرة أخرى
- استعن بالمساعد الذكي للحصول على مساعدة

### ملاحظات مهمة
- لا تتردد في تجربة حلول مختلفة
- الخطأ جزء من عملية التعلم

\`\`\`python
# مثال: جرّب كتابة كودك هنا
print("مرحباً بك في التطبيق العملي!")
\`\`\`
`;

// بناء صفحة المشاهدة الكاملة: فيديو كبير + قائمة تشغيل جانبية + تنقل سابق/تالي
function buildWatchPage(lesson) {
    const course = window.currentCourse || {};
    const lessons = course.lessons || [];
    const idx = lessons.findIndex(l => l.id === lesson.id);
    const enroll = window.currentEnrollment;
    const completed = (enroll && enroll.completed_lesson_ids) || [];
    const isInstructor = (() => {
        const u = (typeof api !== 'undefined') && api.getCurrentUser();
        return !!(u && (u.role === 'admin' || (u.role === 'teacher' &&
            (course.instructor_id === u.id || (course.instructor && course.instructor === u.name)))));
    })();
    const isEnrolled = !!(enroll && enroll.enrolled) || isInstructor;
    const completedCount = lessons.filter(l => completed.includes(l.id)).length;

    const prev = idx > 0 ? lessons[idx - 1] : null;
    const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;

    // عنوان نوع الدرس
    const typeIcon = getLessonTypeIcon(lesson.type);
    const typeName = getLessonTypeName(lesson.type);
    const dur = lesson.duration_seconds ? formatLessonDuration(lesson.duration_seconds) : '';

    // شارة الإكمال وزر الإكمال
    const isDone = completed.includes(lesson.id);
    const canComplete = isEnrolled && !isDone;

    // قائمة التشغيل
    const plItems = lessons.map((l, i) => {
        const cur = l.id === lesson.id;
        const done = completed.includes(l.id);
        const icon = done ? '✅' : getLessonTypeIcon(l.type);
        const num = cur ? '▶' : (done ? '✓' : (i + 1));
        return `
            <div class="watch-pl-item ${cur ? 'current' : ''}" onclick="playLesson(${l.id})">
                <span class="watch-pl-num">${num}</span>
                <div class="watch-pl-info">
                    <h4>${icon} ${l.title}</h4>
                    <span>${getLessonTypeName(l.type)}${l.duration_seconds ? ' · ' + formatLessonDuration(l.duration_seconds) : ''}${done ? ' · مكتمل' : ''}</span>
                </div>
            </div>`;
    }).join('');

    // جسم المحتوى حسب نوع الدرس
    let bodyHtml = '';
    const ytMatch = (lesson.content_url || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    const isYT = lesson.type === 'video' && (ytMatch || (lesson.content_url || '').includes('youtube.com') || (lesson.content_url || '').includes('youtu.be'));
    const isDead = lesson.type === 'video' && /almasar\.org/.test(lesson.content_url || '');
    const isExercise = lesson.title && (lesson.title.includes('تطبيق عملي') || lesson.title.includes('التطبيق العملي'));
    const isSummary = lesson.type === 'pdf' && lesson.title && lesson.title.includes('ملخص الكورس') && lesson.content_url;

    if (lesson.type === 'video' && !isExercise) {
        if (isDead) {
            bodyHtml = `
                <div class="dead-note" style="padding:40px 24px;text-align:center;background:#1a1a2e;border-radius:14px;">
                    <div style="font-size:52px;margin-bottom:14px;">📺</div>
                    <div style="font-weight:800;font-size:18px;color:#fff;">هذا الدرس متوفر عبر تطبيق مسار للجوال</div>
                    <div style="color:#9ca3af;font-size:14px;margin-top:10px;line-height:1.8;">محتوى هذا الدرس متاح كاملاً في تطبيق أندرويد</div>
                    <a href="/download.html" style="display:inline-block;margin-top:18px;padding:11px 26px;background:#18b8c4;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;">📱 تحميل التطبيق</a>
                </div>`;
        } else if (ytMatch) {
            bodyHtml = `<div class="watch-video"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1" title="${lesson.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
        } else if (isYT) {
            bodyHtml = `<div class="watch-body-panel" style="text-align:center;padding:50px 24px;">
                <div style="font-size:3rem;margin-bottom:10px;">🎬</div>
                <a href="${lesson.content_url}" target="_blank" class="btn btn-primary">شاهد الفيديو على يوتيوب ←</a>
            </div>`;
        } else {
            bodyHtml = `<div class="watch-video"><video controls autoplay playsinline><source src="${lesson.content_url}" type="video/mp4">متصفحك لا يدعم تشغيل الفيديو.</video></div>`;
        }
    } else if (isExercise) {
        const defaultExerciseContent = window.__defaultExercise || '';
        const contentToRender = (lesson.text_content && lesson.text_content.trim()) ? lesson.text_content : (defaultExerciseContent || '### التعليمات\nنفّذ ما تعلمته في هذا الدرس خطوة بخطوة.');
        const rendered = (typeof marked !== 'undefined') ? marked.parse(contentToRender) : contentToRender;
        bodyHtml = `
            <div class="watch-body-panel exercise-body" style="direction:rtl">
                <div style="background:#eef2ff;padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                    <span style="font-size:1.3rem;">🧠</span>
                    <strong style="color:#4330ca;font-size:.95rem;">تطبيق عملي — أثبت مهاراتك</strong>
                </div>
                <div style="color:#374151;line-height:2;">${rendered}</div>
            </div>`;
    } else if (isSummary) {
        bodyHtml = `
            <div class="watch-body-panel" style="padding:0;overflow:hidden;">
                <iframe src="${lesson.content_url}" style="width:100%;height:78vh;border:0;" frameborder="0" allowfullscreen title="${lesson.title}"></iframe>
            </div>
            <div style="margin-top:12px;text-align:center;">
                <a href="${lesson.content_url}" target="_blank" class="btn btn-primary">🔗 فتح الملخص بنافذة جديدة</a>
            </div>`;
    } else if (lesson.type === 'pdf' && lesson.content_url) {
        bodyHtml = `
            <div class="watch-body-panel" style="text-align:center;padding:50px 24px;">
                <div style="font-size:3rem;margin-bottom:10px;">📄</div>
                <h3 style="font-weight:800;color:var(--dark);margin:0 0 6px;">${lesson.title}</h3>
                <p style="color:#64748b;margin:0 0 18px;">هذا الدرس عبارة عن ملف PDF</p>
                <a href="${lesson.content_url}" target="_blank" class="btn btn-primary">📂 فتح الملف</a>
            </div>`;
    } else {
        // نص عادي
        const rendered = (typeof marked !== 'undefined' && lesson.text_content) ? marked.parse(lesson.text_content) : (lesson.text_content || 'لا يوجد محتوى نصي.');
        bodyHtml = `
            <div class="watch-body-panel" style="direction:rtl">
                <div style="color:#374151;line-height:2;font-size:.98rem;">${rendered}</div>
            </div>`;
    }

    // الهيكل الكامل لصفحة المشاهدة
    const html = `
    <div class="watch-shell">
        <div class="watch-grid">
            <div class="watch-main">
                ${bodyHtml}
                <div class="watch-titlebar">
                    <span style="font-size:1.4rem;">${typeIcon}</span>
                    <h2>${lesson.title}</h2>
                    ${isDone ? '<span class="watch-chip" style="background:#dcfce7;color:#15803d;">✅ مكتمل</span>' : ''}
                </div>
                <div class="watch-meta">
                    <span class="watch-chip">${typeName}</span>
                    ${dur ? `<span class="watch-chip">⏱ ${dur}</span>` : ''}
                    <span class="watch-chip">الدرس ${idx + 1} من ${lessons.length}</span>
                    <span class="watch-chip">${course.title || ''}</span>
                </div>
                <div class="watch-actions">
                    <div class="watch-nav">
                        <button class="btn btn-outline" ${prev ? `onclick="playLesson(${prev.id})"` : 'disabled style="opacity:.45;cursor:not-allowed;"'}>→ السابق</button>
                        <button class="btn btn-primary" ${next ? `onclick="playLesson(${next.id})"` : 'disabled style="opacity:.45;cursor:not-allowed;"'}>التالي ←</button>
                    </div>
                    ${canComplete ? `<button class="btn btn-primary" style="background:linear-gradient(135deg,#10b981,#059669);border:none;" onclick="markLessonComplete(${lesson.id})">✅ إكمال الدرس</button>` : ''}
                    <a href="course.html?id=${course.id}" class="btn btn-outline">↩ عودة للكورس</a>
                </div>
                ${(!isEnrolled && lesson.type === 'video') ? `
                <div class="watch-desc" style="border-inline-start:4px solid #18b8c4;">
                    <h3>مشاهدة كضيف</h3>
                    سجّل بالكورس لتتبع تقدمك والحصول على شهادة إتمام عند إنهاء جميع الدروس.
                </div>` : ''}
            </div>
            <aside class="watch-playlist">
                <div class="watch-playlist-head">
                    <h3>📚 محتوى الكورس</h3>
                    <p>${lessons.length} درس · ${completedCount} مكتمل${isEnrolled && lessons.length ? ' · ' + Math.round(completedCount / lessons.length * 100) + '%' : ''}</p>
                </div>
                <div class="watch-playlist-items">${plItems}</div>
            </aside>
        </div>
    </div>`;

    // حقن داخل حاوية صفحة الكورس (بديل الهيدر الملون) مع الحفاظ على القائمة للرجوع
    const page = document.getElementById('courseDetails');
    window._coursePageBackup = page.innerHTML;
    page.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // حدّث الدرس النشط بالرابط
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('lesson', String(lesson.id));
        history.pushState({ lesson: String(lesson.id), course: String(course.id || ''), ts: Date.now() }, '', url);
    } catch (e) { console.warn('[watch pushState]', e); }
}

// Helper functions for lessons
function getLessonTypeIcon(type) {
    switch (type) {
        case 'video': return '🎬';
        case 'text': return '📝';
        case 'pdf': return '📄';
        default: return '📚';
    }
}

function getLessonTypeName(type) {
    switch (type) {
        case 'video': return 'فيديو';
        case 'text': return 'نص';
        case 'pdf': return 'PDF';
        default: return 'درس';
    }
}

function formatLessonDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Instructor Management Functions
function addInstructorModals() {
    if (document.getElementById('lessonModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <!-- Add/Edit Lesson Modal -->
        <div class="modal" id="lessonModal">
            <div class="modal-content modal-lesson">
                <div class="modal-header">
                    <h2 class="modal-title" id="lessonModalTitle">➕ إضافة درس جديد</h2>
                    <span class="modal-close" onclick="closeLessonModal()">&times;</span>
                </div>
                <form id="lessonForm" onsubmit="saveLesson(event)">
                    <input type="hidden" id="lessonId">
                    <input type="hidden" id="lessonCourseId">
                    
                    <div class="modal-body">
                        <div class="form-section">
                            <div class="section-title">📋 معلومات الدرس</div>
                            
                            <div class="form-group">
                                <label for="lessonTitle">عنوان الدرس <span class="required">*</span></label>
                                <input type="text" id="lessonTitle" required placeholder="مثال: مقدمة في البرمجة">
                            </div>
                            
                            <div class="form-group">
                                <label for="lessonType">نوع المحتوى <span class="required">*</span></label>
                                <div class="type-selector">
                                    <label class="type-option">
                                        <input type="radio" name="lessonTypeRadio" value="video" checked onchange="updateLessonTypeUI()">
                                        <span class="type-card">
                                            <span class="type-icon">🎬</span>
                                            <span class="type-name">فيديو</span>
                                        </span>
                                    </label>
                                    <label class="type-option">
                                        <input type="radio" name="lessonTypeRadio" value="text" onchange="updateLessonTypeUI()">
                                        <span class="type-card">
                                            <span class="type-icon">📝</span>
                                            <span class="type-name">نص</span>
                                        </span>
                                    </label>
                                    <label class="type-option">
                                        <input type="radio" name="lessonTypeRadio" value="pdf" onchange="updateLessonTypeUI()">
                                        <span class="type-card">
                                            <span class="type-icon">📄</span>
                                            <span class="type-name">PDF</span>
                                        </span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-group" id="videoUrlGroup">
                                <label for="lessonContentUrl">رابط المحتوى</label>
                                <div class="input-with-icon">
                                    <span class="input-icon">🔗</span>
                                    <input type="url" id="lessonContentUrl" placeholder="الصق رابط YouTube أو رابط الفيديو المباشر">
                                </div>
                                <div class="helper-text">
                                    <span>💡</span> يمكنك رفع الفيديوهات من <a href="teacher/courses.html" target="_blank">لوحة تحكم المعلم</a>
                                </div>
                            </div>
                            
                            <div class="form-group" id="textContentGroup" style="display: none;">
                                <label for="lessonTextContent">محتوى الدرس النصي</label>
                                <textarea id="lessonTextContent" rows="8" placeholder="اكتب محتوى الدرس هنا... يمكنك استخدام Markdown للتنسيق"></textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <div class="section-title">⚙️ إعدادات إضافية</div>
                            
                            <div class="form-group">
                                <label for="lessonDescription">وصف الدرس</label>
                                <textarea id="lessonDescription" rows="2" placeholder="وصف مختصر للدرس (اختياري)"></textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="lessonDuration">
                                        <span>⏱️</span> المدة (دقيقة)
                                    </label>
                                    <input type="number" id="lessonDuration" min="0" placeholder="0">
                                </div>
                                <div class="form-group">
                                    <label for="lessonOrder">
                                        <span>🔢</span> ترتيب الدرس
                                    </label>
                                    <input type="number" id="lessonOrder" min="1" placeholder="1">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="lessonIsFree">
                                    <span class="checkbox-custom"></span>
                                    <span class="checkbox-text">
                                        <strong>درس مجاني</strong>
                                        <small>متاح للمشاهدة بدون تسجيل</small>
                                    </span>
                                </label>
                            </div>
                        </div>
                        
                        <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 10px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1.15rem; background: linear-gradient(135deg, #6366f1, #4f46e5); border: none; box-shadow: 0 4px 15px rgba(99,102,241,0.4); font-weight: bold; border-radius: 12px; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 8px; color: white; cursor: pointer;">
                                <span style="font-size: 1.3rem;">💾</span> حفظ الدرس
                            </button>
                            <button type="button" class="btn btn-outline" onclick="closeLessonModal()" style="width: 100%; padding: 12px; border-radius: 12px; cursor: pointer;">إلغاء</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Quiz Modal -->
        <div class="modal" id="quizModal">
            <div class="modal-content modal-quiz modern-modal">
                <div class="modal-header quiz-header">
                    <h2 class="modal-title">📝 إدارة الاختبار</h2>
                    <span class="modal-close" onclick="closeQuizModal()">&times;</span>
                </div>
                <div id="quizContent" class="modal-body modern-quiz-body">
                    <p>جاري التحميل...</p>
                </div>
            </div>
        </div>
    `);

    addInstructorStyles();
}

function addInstructorStyles() {
    if (document.getElementById('instructorStyles')) return;

    const style = document.createElement('style');
    style.id = 'instructorStyles';
    style.textContent = `
        .lesson-actions {
            display: flex;
            gap: 5px;
            margin-right: 10px;
        }
        .action-btn {
            background: none;
            border: none;
            font-size: 1.1rem;
            cursor: pointer;
            padding: 5px 8px;
            border-radius: 5px;
            transition: all 0.2s;
        }
        .action-btn:hover {
            background: #f0f0f0;
        }
        .edit-btn:hover { background: #e0f2fe; }
        .delete-btn:hover { background: #fee2e2; }
        .quiz-btn:hover { background: #fef3c7; }
        .move-btn:hover { background: #e0e7ff; }
        .view-btn:hover { background: #dcfce7; }
        
        /* Modal Styles */
        .modal-lesson, .modal-quiz {
            max-width: 650px;
            width: 95%;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .modern-modal {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .quiz-header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border-bottom: 1px solid #475569;
        }
        .modern-quiz-body {
            padding: 24px;
            background: #ffffff;
        }
        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header .modal-title {
            margin: 0;
            font-size: 1.25rem;
            color: white;
        }
        .modal-header .modal-close {
            color: #fecaca;
            opacity: 1;
            font-size: 1.5rem;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .modal-header .modal-close:hover {
            color: white;
            background: #ef4444;
        }
        .modal-body {
            padding: 24px;
            max-height: 70vh;
            overflow-y: auto;
        }
        .modal-footer {
            padding: 16px 24px;
            background: #f8f9fa;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            border-top: 1px solid #e9ecef;
        }
        .modal-footer .btn {
            min-width: 120px;
            padding: 12px 24px;
            font-weight: 600;
        }
        
        /* Form Styles */
        .form-section {
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #e9ecef;
        }
        .form-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .section-title {
            font-size: 1rem;
            font-weight: 700;
            color: #374151;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        .form-group:last-child {
            margin-bottom: 0;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #4b5563;
            font-size: 0.9rem;
        }
        .required {
            color: #ef4444;
        }
        .form-group input[type="text"],
        .form-group input[type="url"],
        .form-group input[type="number"],
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px 14px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-family: inherit;
            font-size: 0.95rem;
            transition: all 0.2s;
            background: white;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .form-group textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        /* Type Selector */
        .type-selector {
            display: flex;
            gap: 12px;
        }
        .type-option {
            flex: 1;
            cursor: pointer;
        }
        .type-option input {
            display: none;
        }
        .type-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            transition: all 0.2s;
            background: white;
        }
        .type-option input:checked + .type-card {
            border-color: #667eea;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }
        .type-icon {
            font-size: 1.5rem;
            margin-bottom: 6px;
        }
        .type-name {
            font-weight: 600;
            color: #4b5563;
            font-size: 0.9rem;
        }
        
        /* Input with Icon */
        .input-with-icon {
            position: relative;
        }
        .input-with-icon .input-icon {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
        }
        .input-with-icon input {
            padding-left: 44px;
        }
        
        /* Helper Text */
        .helper-text {
            margin-top: 8px;
            padding: 10px 12px;
            background: #f0f9ff;
            border-radius: 8px;
            font-size: 0.85rem;
            color: #0369a1;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .helper-text a {
            color: #667eea;
            font-weight: 600;
        }
        
        /* Form Row */
        .form-row {
            display: flex;
            gap: 16px;
        }
        .form-row .form-group {
            flex: 1;
        }
        
        /* Checkbox Label */
        .checkbox-label {
            display: flex !important;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
            padding: 14px;
            background: #f8f9fa;
            border-radius: 10px;
            transition: all 0.2s;
        }
        .checkbox-label:hover {
            background: #f0f0f0;
        }
        .checkbox-label input {
            display: none;
        }
        .checkbox-custom {
            width: 22px;
            height: 22px;
            border: 2px solid #d1d5db;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .checkbox-label input:checked + .checkbox-custom {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-color: #667eea;
        }
        .checkbox-label input:checked + .checkbox-custom::after {
            content: '✓';
            color: white;
            font-size: 14px;
        }
        .checkbox-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .checkbox-text strong {
            color: #374151;
        }
        .checkbox-text small {
            color: #6b7280;
            font-size: 0.8rem;
        }
        
        /* Question Item */
        .question-item {
            background: #ffffff;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .question-item:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            transform: translateY(-2px);
        }
        .answer-option {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 12px 0;
            padding: 8px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
        }
        .answer-option input[type="text"] {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 0.95rem;
            transition: border-color 0.2s;
        }
        .answer-option input[type="text"]:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .answer-option input[type="checkbox"] {
            width: 22px;
            height: 22px;
            accent-color: #3b82f6;
            cursor: pointer;
        }
        
        /* New Question Editor Styles */
        .quiz-card-editor {
            background: #ffffff;
            border: 2px solid #3b82f6;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.1);
        }
        .question-input-wrapper {
            margin-bottom: 20px;
        }
        .question-label {
            display: block;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }
        .modern-input {
            width: 100%;
            padding: 14px 18px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font-size: 1.05rem;
            transition: all 0.2s;
            background: #f8fafc;
        }
        .modern-input:focus {
            background: #ffffff;
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            outline: none;
        }
        
        .tf-options-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }
        .tf-option-card {
            cursor: pointer;
            position: relative;
        }
        .tf-option-card input {
            position: absolute;
            opacity: 0;
        }
        .tf-card-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            border: 2px solid #e2e8f0;
            border-radius: 14px;
            transition: all 0.2s;
            background: white;
            font-weight: 600;
            font-size: 1.1rem;
        }
        .tf-option-card input:checked + .tf-card-content {
            border-color: #3b82f6;
            background: #eff6ff;
            color: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }
        .tf-card-icon {
            font-size: 1.8rem;
            margin-bottom: 8px;
        }
        
        .mc-answer-item {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            background: #f1f5f9;
            padding: 8px 12px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .mc-letter {
            width: 32px;
            height: 32px;
            background: #64748b;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.9rem;
        }
        .correct-toggle {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: white;
            border: 1px solid #cbd5e1;
            transition: all 0.2s;
            font-size: 1.2rem;
        }
        .correct-toggle input {
            display: none;
        }
        .correct-toggle input:checked + .toggle-icon {
            color: #22c55e;
        }
        .correct-toggle:has(input:checked) {
            background: #dcfce7;
            border-color: #22c55e;
        }
        
        /* Quiz Type Buttons */
        .quiz-type-btn {
            flex: 1;
            padding: 14px 24px;
            border: 2px solid #e2e8f0;
            background: white;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 1rem;
        }
        .quiz-type-btn:hover {
            border-color: #cbd5e1;
            background: #f8fafc;
        }
        .quiz-type-btn.active {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border-color: transparent;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
        }
    `;
    document.head.appendChild(style);
}

function openAddLessonModal(courseId) {
    document.getElementById('lessonModalTitle').textContent = '➕ إضافة درس جديد';
    document.getElementById('lessonId').value = '';
    document.getElementById('lessonCourseId').value = courseId;
    document.getElementById('lessonForm').reset();
    document.querySelector('input[name="lessonTypeRadio"][value="video"]').checked = true;
    updateLessonTypeUI();
    document.getElementById('lessonModal').style.display = 'flex';
}

function openEditLessonModal(lessonId) {
    const lesson = window.currentCourse.lessons.find(l => l.id == lessonId);
    if (!lesson) return;

    document.getElementById('lessonModalTitle').textContent = '✏️ تعديل الدرس';
    document.getElementById('lessonId').value = lessonId;
    document.getElementById('lessonCourseId').value = window.currentCourse.id;
    document.getElementById('lessonTitle').value = lesson.title;

    const typeRadio = document.querySelector(`input[name="lessonTypeRadio"][value="${lesson.type || 'video'}"]`);
    if (typeRadio) typeRadio.checked = true;

    document.getElementById('lessonContentUrl').value = lesson.content_url || '';
    document.getElementById('lessonTextContent').value = lesson.text_content || '';
    document.getElementById('lessonDescription').value = lesson.description || '';
    document.getElementById('lessonDuration').value = Math.floor((lesson.duration_seconds || 0) / 60);
    document.getElementById('lessonOrder').value = lesson.order_num || 1;
    document.getElementById('lessonIsFree').checked = lesson.is_free;
    updateLessonTypeUI();
    document.getElementById('lessonModal').style.display = 'flex';
}

function closeLessonModal() {
    document.getElementById('lessonModal').style.display = 'none';
}

function updateLessonTypeUI() {
    const selectedType = document.querySelector('input[name="lessonTypeRadio"]:checked');
    const type = selectedType ? selectedType.value : 'video';

    const videoUrlGroup = document.getElementById('videoUrlGroup');
    const textContentGroup = document.getElementById('textContentGroup');
    const videoUrlLabel = videoUrlGroup.querySelector('label');
    const videoUrlInput = document.getElementById('lessonContentUrl');

    if (type === 'text') {
        videoUrlGroup.style.display = 'none';
        textContentGroup.style.display = 'block';
    } else {
        videoUrlGroup.style.display = 'block';
        textContentGroup.style.display = 'none';

        if (type === 'video') {
            videoUrlLabel.textContent = 'رابط الفيديو';
            videoUrlInput.placeholder = 'الصق رابط YouTube أو رابط الفيديو المباشر';
        } else if (type === 'pdf') {
            videoUrlLabel.textContent = 'رابط ملف PDF';
            videoUrlInput.placeholder = 'الصق رابط ملف PDF';
        }
    }
}

async function saveLesson(e) {
    e.preventDefault();

    const lessonId = document.getElementById('lessonId').value;
    const courseId = document.getElementById('lessonCourseId').value;
    const selectedType = document.querySelector('input[name="lessonTypeRadio"]:checked');
    const type = selectedType ? selectedType.value : 'video';

    const data = {
        title: document.getElementById('lessonTitle').value,
        type: type,
        description: document.getElementById('lessonDescription').value,
        duration_seconds: parseInt(document.getElementById('lessonDuration').value || 0) * 60,
        order_num: parseInt(document.getElementById('lessonOrder').value || 1),
        is_free: document.getElementById('lessonIsFree').checked
    };

    if (type === 'video' || type === 'pdf') {
        data.content_url = document.getElementById('lessonContentUrl').value;
    } else if (type === 'text') {
        data.text_content = document.getElementById('lessonTextContent').value;
    }

    try {
        if (lessonId) {
            await api.updateLesson(lessonId, data);
            showToast('✅ تم تحديث الدرس بنجاح', 'success');
        } else {
            await api.addLesson(courseId, data);
            showToast('✅ تم إضافة الدرس بنجاح', 'success');
        }
        closeLessonModal();
        loadCourseDetails();
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

async function deleteLesson(lessonId, lessonTitle) {
    if (!confirm(`هل أنت متأكد من حذف الدرس "${lessonTitle}"؟\n\n⚠️ سيتم حذف جميع الاختبارات المرتبطة بهذا الدرس.`)) {
        return;
    }

    try {
        await api.deleteLesson(lessonId);
        showToast('✅ تم حذف الدرس بنجاح', 'success');
        loadCourseDetails();
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

async function moveLessonUp(lessonId, currentIndex) {
    if (currentIndex <= 0) return;
    const lessons = window.currentCourse.lessons;

    try {
        await api.updateLesson(lessonId, { order_num: currentIndex });
        await api.updateLesson(lessons[currentIndex - 1].id, { order_num: currentIndex + 1 });
        loadCourseDetails();
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

async function moveLessonDown(lessonId, currentIndex) {
    const lessons = window.currentCourse.lessons;
    if (currentIndex >= lessons.length - 1) return;

    try {
        await api.updateLesson(lessonId, { order_num: currentIndex + 2 });
        await api.updateLesson(lessons[currentIndex + 1].id, { order_num: currentIndex + 1 });
        loadCourseDetails();
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// Quiz Management
async function openQuizModal(lessonId) {
    window.currentQuizLessonId = lessonId;
    const lesson = window.currentCourse.lessons.find(l => l.id == lessonId);

    document.getElementById('quizModal').style.display = 'flex';
    document.getElementById('quizContent').innerHTML = `
        <div class="modern-quiz-header" style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0; color: #1e293b; font-size: 1.3rem; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.5rem;">📝</span> اختبار: ${lesson.title}
            </h3>
        </div>
        <div id="quizManager">
            <div style="display: flex; gap: 16px; margin-bottom: 24px; background: #f1f5f9; padding: 6px; border-radius: 14px;">
                <button class="quiz-type-btn active" onclick="selectQuizType('multiple_choice')" id="mcBtn">
                    🔘 اختيار متعدد
                </button>
                <button class="quiz-type-btn" onclick="selectQuizType('true_false')" id="tfBtn">
                    ✅ صح أو خطأ
                </button>
            </div>
            
            <div id="questionsList" style="margin-bottom: 24px;">جاري تحميل الأسئلة...</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #e2e8f0; gap: 10px;">
                <button class="btn btn-primary" onclick="generateQuizWithAI(${lesson.id})" id="aiQuizBtn" style="padding: 12px 20px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; box-shadow: 0 4px 6px -1px rgba(99,102,241,0.4);">
                    <span>🤖</span> توليد اختبار بالذكاء الاصطناعي
                </button>
                <button class="btn btn-primary" onclick="addQuestion()" style="padding: 12px 24px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                    <span>➕</span> إضافة سؤال يدوي
                </button>
            </div>
        </div>
    `;

    await loadQuizQuestions(lessonId);
}

function closeQuizModal() {
    document.getElementById('quizModal').style.display = 'none';
}

let currentQuizType = 'multiple_choice';

function selectQuizType(type) {
    currentQuizType = type;
    document.querySelectorAll('.quiz-type-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(type === 'multiple_choice' ? 'mcBtn' : 'tfBtn').classList.add('active');
}

async function loadQuizQuestions(lessonId) {
    try {
        const quiz = await api.getQuiz(lessonId);
        window.currentQuiz = quiz;
        renderQuestions(quiz.questions || []);
    } catch (error) {
        window.currentQuiz = null;
        renderQuestions([]);
    }
}

// Generate a full quiz for a lesson using the AI endpoint (teacher/admin).
// Replaces any existing quiz for the lesson after confirmation.
async function generateQuizWithAI(lessonId) {
    const lesson = window.currentCourse?.lessons?.find(l => l.id == lessonId);
    if (!lesson) return;

    const existing = window.currentQuiz && window.currentQuiz.questions && window.currentQuiz.questions.length > 0;
    if (existing && !confirm('يوجد اختبار محفوظ لهذا الدرس. التوليد بالذكاء الاصطناعي سيستبدله بالكامل.\nمتابعة؟')) {
        return;
    }

    const num = prompt('كم عدد الأسئلة المطلوبة؟ (1-20)', '5');
    if (num === null) return;
    const numQ = Math.max(1, Math.min(20, parseInt(num) || 5));

    const diff = prompt('مستوى الصعوبة: easy / medium / hard', 'medium') || 'medium';

    const btn = document.getElementById('aiQuizBtn');
    const listEl = document.getElementById('questionsList');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = '⏳ جاري التوليد...'; }
    if (listEl) listEl.innerHTML = '<div style="text-align:center; padding:30px; color:#6366f1;">🤖 الذكاء الاصطناعي يجهّز الأسئلة...<br><small>قد تستغرق العملية حتى دقيقة</small></div>';

    try {
        await api.request(CONFIG.ENDPOINTS.GENERATE_QUIZ, {
            method: 'POST',
            body: JSON.stringify({
                lesson_id: lessonId,
                lesson_title: lesson.title,
                lesson_description: lesson.description || '',
                lesson_content: lesson.text_content || '',
                num_questions: numQ,
                difficulty: diff,
            })
        });
        await loadQuizQuestions(lessonId);
        showToast('✅ تم توليد الاختبار وحفظه بنجاح!', 'success');
    } catch (error) {
        showToast('فشل توليد الاختبار: ' + (error.message || 'خطأ غير متوقع'), 'error');
        await loadQuizQuestions(lessonId);
    } finally {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '🤖 توليد اختبار بالذكاء الاصطناعي'; }
    }
}

function renderQuestions(questions) {
    const container = document.getElementById('questionsList');

    if (questions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لا توجد أسئلة بعد. أضف سؤالك الأول!</p>';
        return;
    }

    container.innerHTML = questions.map((q, index) => `
        <div class="question-item">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>سؤال ${index + 1}</strong>
                <button class="action-btn delete-btn" onclick="deleteQuestion(${q.id})" title="حذف السؤال">🗑️</button>
            </div>
            <p>${q.question_text}</p>
            ${q.type === 'true_false' ? `
                <div style="color: ${q.correct_answer ? '#22c55e' : '#ef4444'};">
                    الإجابة الصحيحة: ${q.correct_answer ? '✅ صح' : '❌ خطأ'}
                </div>
            ` : `
                <div style="margin-top: 10px;">
                    ${(q.answers || []).map(a => `
                        <div style="color: ${a.is_correct ? '#22c55e' : '#666'};">
                            ${a.is_correct ? '✓' : '○'} ${a.answer_text}
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `).join('');
}

function addQuestion() {
    const container = document.getElementById('questionsList');

    // Remove any existing "New Question" form if present to avoid duplicates
    const existing = document.getElementById('newQuestion');
    if (existing) existing.remove();

    const questionHtml = currentQuizType === 'true_false' ? `
        <div class="quiz-card-editor" id="newQuestion">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">سؤال جديد (صح أو خطأ)</span>
                <button class="action-btn delete-btn" onclick="document.getElementById('newQuestion').remove()" title="إلغاء">🗑️</button>
            </div>
            
            <div class="question-input-wrapper">
                <label class="question-label">نص السؤال</label>
                <textarea id="questionText" class="modern-input" placeholder="اكتب السؤال هنا... مثلاً: هل تعتبر لغة JavaScript لغة برمجة؟" rows="3"></textarea>
            </div>
            
            <label class="question-label">اختر الإجابة الصحيحة</label>
            <div class="tf-options-grid">
                <label class="tf-option-card">
                    <input type="radio" name="tfAnswer" value="true" checked>
                    <div class="tf-card-content">
                        <span class="tf-card-icon">✅</span>
                        <span>صح (True)</span>
                    </div>
                </label>
                <label class="tf-option-card">
                    <input type="radio" name="tfAnswer" value="false">
                    <div class="tf-card-content">
                        <span class="tf-card-icon">❌</span>
                        <span>خطأ (False)</span>
                    </div>
                </label>
            </div>
            
            <button class="btn btn-primary" onclick="saveQuestion('true_false')" style="width: 100%; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1rem;">
                💾 حفظ السؤال بالبنك
            </button>
        </div>
    ` : `
        <div class="quiz-card-editor" id="newQuestion">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">سؤال جديد (اختيار متعدد)</span>
                <button class="action-btn delete-btn" onclick="document.getElementById('newQuestion').remove()" title="إلغاء">🗑️</button>
            </div>
            
            <div class="question-input-wrapper">
                <label class="question-label">نص السؤال</label>
                <textarea id="questionText" class="modern-input" placeholder="اكتب السؤال هنا... مثلاً: أي مما يلي هو محرك تنسيق صفحات الويب؟" rows="3"></textarea>
            </div>
            
            <label class="question-label">خيارات الإجابة (حدد الإجابة الصحيحة)</label>
            <div id="answersContainer">
                ${[0, 1, 2, 3].map(i => `
                    <div class="mc-answer-item">
                        <span class="mc-letter">${String.fromCharCode(65 + i)}</span>
                        <input type="text" id="answer${i}" class="modern-input" style="padding: 10px 14px; font-size: 0.95rem;" placeholder="الخيار ${i + 1}">
                        <label class="correct-toggle" title="تحديد كإجابة صحيحة">
                            <input type="checkbox" id="correct${i}">
                            <span class="toggle-icon">✓</span>
                        </label>
                    </div>
                `).join('')}
            </div>
            
            <button class="btn btn-primary" onclick="saveQuestion('multiple_choice')" style="width: 100%; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1rem; margin-top: 10px;">
                💾 حفظ السؤال بالبنك
            </button>
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', questionHtml);
    document.getElementById('newQuestion').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveQuestion(type) {
    const questionText = document.getElementById('questionText').value;
    if (!questionText.trim()) {
        showToast('⚠️ الرجاء كتابة نص السؤال', 'warn');
        return;
    }

    const data = {
        lesson_id: window.currentQuizLessonId,
        question_text: questionText,
        type: type,
        answers: []
    };

    if (type === 'true_false') {
        data.correct_answer = document.querySelector('input[name="tfAnswer"]:checked').value === 'true';
    } else {
        for (let i = 0; i < 4; i++) {
            const answerText = document.getElementById(`answer${i}`).value;
            if (answerText.trim()) {
                data.answers.push({
                    answer_text: answerText,
                    is_correct: document.getElementById(`correct${i}`).checked
                });
            }
        }

        if (data.answers.length < 2) {
            showToast('⚠️ الرجاء إضافة خيارين على الأقل', 'warn');
            return;
        }
        if (!data.answers.some(a => a.is_correct)) {
            showToast('⚠️ الرجاء تحديد الإجابة الصحيحة', 'warn');
            return;
        }
    }

    try {
        await api.addQuestion(data);
        document.getElementById('newQuestion').remove();
        await loadQuizQuestions(window.currentQuizLessonId);
        showToast('✅ تم حفظ السؤال بنجاح', 'success');
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

async function deleteQuestion(questionId) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
        await api.deleteQuestion(questionId);
        await loadQuizQuestions(window.currentQuizLessonId);
    } catch (error) {
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

// Mark lesson as completed
async function markLessonComplete(lessonId) {
    try {
        const result = await api.completeLesson(lessonId);

        // Update progress bar
        const progressFill = document.querySelector('.progress-bar-fill');
        const progressValue = document.querySelector('.progress-value');
        const progressDetails = document.querySelector('.progress-details');

        if (progressFill) progressFill.style.width = result.progress + '%';
        if (progressValue) progressValue.textContent = result.progress + '%';
        if (progressDetails) progressDetails.textContent = `${result.completed_lessons} من ${result.total_lessons} درس مكتمل`;

        // Check if certificate was issued
        if (result.progress === 100 && result.certificate_number) {
            const viewCert = confirm('🎉 تهانينا! لقد أتممت الكورس بنجاح وحصلت على شهادة إتمام.\n\nهل تريد عرض الشهادة الآن؟');
            if (viewCert) {
                window.open(`certificate.html?id=${result.certificate_number}`, '_blank');
            }
        }

        // Reload page to show updated lesson status
        // داخل صفحة المشاهدة: حدّث الحالة محلياً (بدون قتل الفيديو بإعادة التحميل)
        const wl = (window.currentCourse?.lessons || []).find(l => l.id == lessonId);
        if (wl && document.querySelector('.watch-shell')) {
            if (window.currentEnrollment?.enrolled && !window.currentEnrollment.completed_lesson_ids.includes(lessonId)) {
                window.currentEnrollment.completed_lesson_ids.push(lessonId);
            }
            buildWatchPage(wl); // إعادة رسم بنفس الدرس مع ✅ وتحديث القائمة
            showToast('✅ تم احتساب الدرس — تقدمك محدّث', 'success');
        } else {
            loadCourseDetails();
        }
    } catch (error) {
        showToast('خطأ: ' + error.message, 'error');
    }
}

// Open student quiz modal
async function openStudentQuiz(lessonId) {
    const quizzes = window.currentQuizzes || [];
    const quiz = quizzes.find(q => q.lesson_id === lessonId);

    if (!quiz) {
        showToast('لا يوجد اختبار لهذا الدرس');
        return;
    }

    // Fetch full quiz with questions
    try {
        const quizData = await api.getQuiz(lessonId);

        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
            showToast('لا توجد أسئلة في هذا الاختبار بعد');
            return;
        }

        // Create student quiz modal if not exists
        let modal = document.getElementById('studentQuizModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal" id="studentQuizModal">
                    <div class="modal-content modal-quiz modern-modal" style="max-width: 700px;">
                        <div class="modal-header quiz-header">
                            <h2 class="modal-title">📝 الاختبار</h2>
                            <span class="modal-close" onclick="closeStudentQuizModal()">&times;</span>
                        </div>
                        <div id="studentQuizContent" class="modal-body modern-quiz-body" style="max-height: 75vh; overflow-y: auto;">
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('studentQuizModal');
        }

        // Render quiz
        const content = document.getElementById('studentQuizContent');
        window.currentStudentQuiz = quizData;
        const quizInfo = quizData.quiz || {};

        let questionsHtml = quizData.questions.map((q, qIndex) => {
            let answersHtml = '';

            if (q.type === 'true_false') {
                answersHtml = `
                    <label class="quiz-answer-option">
                        <input type="radio" name="q_${q.id}" value="true">
                        <span class="quiz-answer-text">صحيح ✓</span>
                    </label>
                    <label class="quiz-answer-option">
                        <input type="radio" name="q_${q.id}" value="false">
                        <span class="quiz-answer-text">خطأ ✗</span>
                    </label>
                `;
            } else if (q.answers && q.answers.length > 0) {
                answersHtml = q.answers.map(a => `
                    <label class="quiz-answer-option">
                        <input type="radio" name="q_${q.id}" value="${a.id}">
                        <span class="quiz-answer-text">${a.answer_text}</span>
                    </label>
                `).join('');
            }

            return `
                <div class="student-question-item">
                    <div class="question-header">
                        <span class="question-num">السؤال ${qIndex + 1}</span>
                        <span class="question-points">${q.points} ${q.points > 1 ? 'نقاط' : 'نقطة'}</span>
                    </div>
                    <p class="question-text">${q.question_text}</p>
                    <div class="quiz-answers">
                        ${answersHtml}
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div class="quiz-info-bar">
                <span>📋 ${quizInfo.title || 'اختبار الدرس'}</span>
                <span>${quizData.questions.length} أسئلة</span>
                ${quizInfo.time_limit_minutes > 0 ? `<span>⏱ ${quizInfo.time_limit_minutes} دقيقة</span>` : ''}
            </div>
            ${quiz.attempts_count > 0 ? `
                <div class="quiz-previous-result">
                    <span>📊 أفضل نتيجة سابقة: ${quiz.best_score}/${quizData.questions.reduce((sum, q) => sum + q.points, 0)}</span>
                    <span>عدد المحاولات: ${quiz.attempts_count}</span>
                </div>
            ` : ''}
            <form id="studentQuizForm" onsubmit="submitStudentQuiz(event)">
                <input type="hidden" id="studentQuizId" value="${quizInfo.id}">
                ${questionsHtml}
                <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 20px;">
                    📤 إرسال الإجابات
                </button>
            </form>
        `;

        modal.classList.add('active');
        modal.style.display = 'flex';
    } catch (error) {
        showToast('خطأ في تحميل الاختبار: ' + error.message, 'error');
    }
}

function closeStudentQuizModal() {
    const modal = document.getElementById('studentQuizModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

async function submitStudentQuiz(event) {
    event.preventDefault();

    const quizId = document.getElementById('studentQuizId').value;
    const quizData = window.currentStudentQuiz;

    if (!quizData || !quizData.questions) return;

    // Collect answers as array for backend
    const answers = [];
    let unanswered = 0;

    quizData.questions.forEach(q => {
        const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (selected) {
            if (q.type === 'true_false') {
                answers.push({ question_id: q.id, answer: selected.value === 'true' });
            } else {
                answers.push({ question_id: q.id, answer_id: parseInt(selected.value) });
            }
        } else {
            unanswered++;
        }
    });

    if (unanswered > 0) {
        if (!confirm(`لم تجب على ${unanswered} أسئلة. هل تريد إرسال الإجابات؟`)) {
            return;
        }
    }

    try {
        const result = await api.submitQuiz(quizId, answers);

        // If passed, try to automatically mark the lesson as completed
        if (result.passed && quizData.quiz?.lesson_id) {
            try {
                await api.completeLesson(quizData.quiz.lesson_id);
            } catch (e) {
                console.log('Could not auto-complete lesson:', e);
            }
        }

        const content = document.getElementById('studentQuizContent');
        content.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">${result.passed ? '🎉' : '😔'}</div>
                <h3 style="margin-bottom: 10px;">${result.passed ? 'أحسنت! لقد نجحت!' : 'للأسف لم تنجح'}</h3>
                ${result.passed ? '<p style="color: #059669; font-weight: bold;">تم احتساب هذا الدرس ضمن إنجازك 📈</p>' : ''}
                <div style="background: ${result.passed ? '#dcfce7' : '#fee2e2'}; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <div style="font-size: 2rem; font-weight: 700; color: ${result.passed ? '#16a34a' : '#dc2626'};">
                        ${result.score}/${result.total_points}
                    </div>
                    <p style="color: #666; margin-top: 5px;">النتيجة: ${Math.round((result.score / result.total_points) * 100)}%</p>
                </div>
                <button class="btn btn-primary" onclick="closeStudentQuizModal(); loadCourseDetails();">إغلاق وتحديث الصفحة</button>
            </div>
        `;
    } catch (error) {
        showToast('خطأ في إرسال الاختبار: ' + error.message, 'error');
    }
}

// Add student-specific styles
function addStudentStyles() {
    if (document.getElementById('studentStyles')) return;

    const style = document.createElement('style');
    style.id = 'studentStyles';
    style.textContent = `
        /* Enrolled Badge */
        .enrolled-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 20px;
            background: linear-gradient(135deg, #dcfce7, #bbf7d0);
            border: 2px solid #86efac;
            border-radius: 12px;
            color: #166534;
            font-weight: 700;
            font-size: 1rem;
            margin-bottom: 16px;
        }
        .enrolled-icon {
            font-size: 1.3rem;
        }

        /* Progress Section */
        .progress-section {
            margin: 16px 0;
            padding: 16px;
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border-radius: 12px;
            border: 1px solid #bae6fd;
        }
        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .progress-label {
            font-weight: 600;
            color: #0c4a6e;
            font-size: 0.95rem;
        }
        .progress-value {
            font-weight: 800;
            color: #0369a1;
            font-size: 1.2rem;
        }
        .progress-bar-container {
            width: 100%;
            height: 12px;
            background: #e0e7ff;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #06b6d4);
            border-radius: 10px;
            transition: width 0.6s ease;
            min-width: 0;
        }
        .progress-details {
            text-align: center;
            margin-top: 8px;
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 500;
        }

        /* Quiz Badge */
        .lesson-badges {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .quiz-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #fbbf24;
        }
        .quiz-badge:hover {
            background: linear-gradient(135deg, #fde68a, #fbbf24);
            transform: scale(1.05);
        }

        /* Completed Lesson */
        .lesson-completed {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7) !important;
            border-right: 4px solid #22c55e !important;
        }

        /* Lesson Right Actions */
        .lesson-right-actions {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .complete-btn {
            font-size: 1.1rem;
            cursor: pointer;
            background: none;
            border: none;
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .complete-btn:hover {
            background: #dcfce7;
        }

        /* Student Quiz Modal Styles */
        .quiz-info-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: linear-gradient(135deg, #1e293b, #334155);
            color: white;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .quiz-previous-result {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            background: #f1f5f9;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 0.85rem;
            color: #475569;
        }
        .student-question-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .question-num {
            font-weight: 700;
            color: #667eea;
            font-size: 0.9rem;
        }
        .question-points {
            font-size: 0.8rem;
            color: #94a3b8;
            background: #f1f5f9;
            padding: 2px 10px;
            border-radius: 20px;
        }
        .question-text {
            font-size: 1.05rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 14px;
            line-height: 1.6;
        }
        .quiz-answers {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .quiz-answer-option {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        .quiz-answer-option:hover {
            border-color: #667eea;
            background: #f8f9ff;
        }
        .quiz-answer-option input[type="radio"] {
            accent-color: #667eea;
            width: 18px;
            height: 18px;
        }
        .quiz-answer-option input[type="radio"]:checked + .quiz-answer-text {
            color: #667eea;
            font-weight: 700;
        }
    `;
    document.head.appendChild(style);
}

// Enroll in course
async function enrollInCourse(courseId) {
    if (!window.currentCourse) return;

    const course = window.currentCourse;
    const isFree = course.price === 0 && (!course.original_price || course.original_price === 0);

    if (isFree) {
        // Free course - direct enrollment
        try {
            const result = await api.enrollInCourse(courseId);

            // Update the button to show enrolled state
            const enrollBtn = document.getElementById('enrollBtn');
            if (enrollBtn) {
                enrollBtn.outerHTML = `
                    <div class="enrolled-badge" id="enrollBtn">
                        <span class="enrolled-icon">✅</span>
                        <span>مسجل في هذا الكورس</span>
                    </div>
                `;
            }

            if (result.message === 'Already enrolled') {
                showToast('أنت مسجل مسبقاً في هذا الكورس! ✅');
            } else {
                showToast('تم التسجيل بنجاح! 🎉');
            }
            // FIX: إعادة تحميل الصفحة لتفعيل أزرار الدروس فوراً بعد التسجيل
            setTimeout(() => { window.location.reload(); }, 1200);
        } catch (error) {
            if (error.message && error.message.includes('Already enrolled')) {
                // Still update the button
                const enrollBtn = document.getElementById('enrollBtn');
                if (enrollBtn) {
                    enrollBtn.outerHTML = `
                        <div class="enrolled-badge" id="enrollBtn">
                            <span class="enrolled-icon">✅</span>
                            <span>مسجل في هذا الكورس</span>
                        </div>
                    `;
                }
                showToast('أنت مسجل مسبقاً في هذا الكورس! ✅', 'success');
            } else {
                showToast('خطأ: ' + error.message, 'error');
            }
        }
    } else {
        // Paid course - show payment modal
        showPaymentModal(course);
    }
}

// Payment System Functions
let currentPaymentData = {};

function showPaymentModal(course) {
    window.currentPaymentCourse = course;

    // Update course info in modal
    const infoDiv = document.getElementById('coursePaymentInfo');
    infoDiv.innerHTML = `
        <h3>${course.title}</h3>
        <div class="price">${formatPrice(course.price, course.original_price, course.discount_percentage)}</div>
    `;

    // Reset modal to step 1
    document.getElementById('paymentStep1').style.display = 'block';
    document.getElementById('paymentStep2').style.display = 'none';
    document.getElementById('paymentStep3').style.display = 'none';

    // Show modal
    const modal = document.getElementById('paymentModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);

    // Reset data
    currentPaymentData = {};
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected');
    });
}

function selectPaymentMethod(method) {
    currentPaymentData.method = method;
    currentPaymentData.amount = window.currentPaymentCourse.price;

    // Highlight selected method
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.payment-method-card').classList.add('selected');

    // Show step 2 with payment details
    document.getElementById('paymentStep1').style.display = 'none';
    document.getElementById('paymentStep2').style.display = 'block';

    // Generate payment details based on method
    const detailsDiv = document.getElementById('paymentDetails');

    if (method === 'cash') {
        detailsDiv.innerHTML = `
            <div class="cash-info">
                <h3>💵 الدفع كاش</h3>
                <p>قم بالدفع مباشرة لدى مكتب المنصة أو مندوبها المعتمد</p>
                <p><strong>ساعات العمل:</strong> 9 صباحاً - 6 مساءً</p>
                <p style="margin-top: 15px; font-size: 0.9rem;">بعد الدفع، قم برفع صورة الإيصال للتأكيد</p>
            </div>
            <div class="payment-info-row">
                <span class="payment-info-label">المبلغ المطلوب:</span>
                <span class="payment-info-value" style="font-size: 1.3rem; color: #667eea;">${formatPrice(currentPaymentData.amount, null, null)}</span>
            </div>
        `;
    } else if (method === 'bank_transfer') {
        detailsDiv.innerHTML = `
            <div class="bank-info">
                <h3>🏦 معلومات الحساب البنكي</h3>
                <div class="bank-account-detail">
                    <span><strong>اسم البنك:</strong> Standard Chartered Bank</span>
                </div>
                <div class="bank-account-detail">
                    <span><strong>رقم الحساب:</strong> 123456789</span>
                    <button class="copy-btn" onclick="copyToClipboard('123456789')">نسخ</button>
                </div>
                <div class="bank-account-detail">
                    <span><strong>الاسم:</strong> منصة مسار التعليمية</span>
                </div>
                <p style="margin-top: 15px; font-size: 0.9rem; text-align: center;">بعد التحويل، قم برفع صورة الإيصال للتأكيد</p>
            </div>
            <div class="payment-info-row">
                <span class="payment-info-label">المبلغ المطلوب:</span>
                <span class="payment-info-value" style="font-size: 1.3rem; color: #4facfe;">${formatPrice(currentPaymentData.amount, null, null)}</span>
            </div>
        `;
    } else if (method === 'online') {
        detailsDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 20px; border-radius: 15px; text-align: center; color: #333;">
                <h3>💳 الدفع الإلكتروني</h3>
                <p>سيتم توجيهك إلى بوابة الدفع الآمنة</p>
                <p style="margin-top: 15px; font-size: 0.9rem;">⚡ الدفع الإلكتروني سيتم تفعيله قريباً</p>
            </div>
            <div class="payment-info-row">
                <span class="payment-info-label">المبلغ المطلوب:</span>
                <span class="payment-info-value" style="font-size: 1.3rem; color: #a8edea;">${formatPrice(currentPaymentData.amount, null, null)}</span>
            </div>
        `;
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم النسخ بنجاح! ✅', 'success');
    });
}

async function submitPayment() {
    const notes = document.getElementById('paymentNotes').value;
    currentPaymentData.notes = notes;

    try {
        const response = await api.submitPayment(window.currentPaymentCourse.id, currentPaymentData);

        window.currentPaymentId = response.payment_id;

        document.getElementById('paymentStep2').style.display = 'none';
        document.getElementById('paymentStep3').style.display = 'block';

        if (response.status === 'pending' && response.message?.includes('pending')) {
            showToast('لديك طلب دفع قيد الانتظار لهذا الكورس. يمكنك رفع الإيصال الآن.');
        }

    } catch (error) {
        if (error.message.includes('already paid')) {
            showToast('✅ تم تأكيد دفعك مسبقاً!\n\nيمكنك الوصول للكورس مباشرة.', 'success');
            closePaymentModal();
        } else if (error.message.includes('pending')) {
            showToast('⏳ لديك طلب دفع قيد المراجعة.\n\nيرجى الانتظار حتى يتم مراجعة إيصالك من الإدارة.', 'success');
            closePaymentModal();
        } else {
            showToast('⚠️ حدث خطأ أثناء إرسال طلب الدفع.\n\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم.', 'warn');
        }
    }
}

function handleReceiptSelected() {
    const fileInput = document.getElementById('receiptFile');
    const file = fileInput.files[0];

    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById('receiptPreview');
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Receipt">
            <div class="upload-progress" style="display: none;">
                <div class="upload-progress-bar" id="uploadProgressBar"></div>
            </div>
            <button class="btn btn-primary" onclick="uploadReceipt()">📤 رفع الإيصال</button>
        `;
    };
    reader.readAsDataURL(file);
}

async function uploadReceipt() {
    const fileInput = document.getElementById('receiptFile');
    const file = fileInput.files[0];

    if (!file || !window.currentPaymentId) {
        showToast('حدث خطأ. الرجاء المحاولة مرة أخرى.', 'warn');
        return;
    }

    // Show progress
    const progressContainer = document.querySelector('.upload-progress');
    const progressBar = document.getElementById('uploadProgressBar');
    progressContainer.style.display = 'block';
    progressBar.style.width = '30%';

    try {
        await api.uploadReceipt(window.currentPaymentId, file);

        progressBar.style.width = '100%';

        setTimeout(() => {
            showToast('تم رفع الإيصال بنجاح! ✅\nسيتم مراجعة الدفع وتفعيل الكورس قريباً.', 'success');
            closePaymentModal();
            window.location.reload();
        }, 500);

    } catch (error) {
        progressBar.style.width = '0%';
        progressContainer.style.display = 'none';
        showToast('خطأ في رفع الإيصال: ' + error.message, 'error');
    }
}

// Login form
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = form.email.value;
        const password = form.password.value;
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('loginError');

        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري تسجيل الدخول...';
        errorDiv.textContent = '';

        try {
            await api.login(email, password);

            // Get user and check role for redirect
            const user = api.getCurrentUser();
            const urlParams = new URLSearchParams(window.location.search);
            let redirect = urlParams.get('redirect');

            if (!redirect) {
                if (user.role === 'admin') {
                    redirect = 'admin/index.html';
                } else if (user.role === 'teacher') {
                    redirect = 'teacher/index.html';
                } else {
                    redirect = 'index.html';
                }
            }

            window.location.href = redirect;
        } catch (error) {
            errorDiv.textContent = error.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'تسجيل الدخول';
        }
    });
}

// Register form
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.name.value;
        const email = form.email.value;
        const password = form.password.value;
        const phone = form.phone?.value || '';
        const submitBtn = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('registerError');

        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري إنشاء الحساب...';
        errorDiv.textContent = '';

        try {
            await api.register(name, email, password, phone);
            window.location.href = 'index.html';
        } catch (error) {
            errorDiv.textContent = error.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'إنشاء حساب';
        }
    });
}

async function requestCertificate(courseId) {
    try {
        const btn = event?.target || document.querySelector(`button[onclick="requestCertificate(${courseId})"]`);
        if (btn) {
            btn.disabled = true;
            btn.textContent = '...جاري الإصدار';
        }

        const result = await api.issueCertificate(courseId);
        if (result.status === 'success' || result.status === 'already_issued') {
            showToast('تم إصدار الشهادة بنجاح! 🎉', 'success');
            loadCourseDetails(); // Refresh to show the "View Certificate" link
        } else {
            showToast('حدث خطأ في إصدار الشهادة: ' + (result.error || 'خطأ غير معروف'), 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🎓 إصدار الشهادة الآن';
            }
        }
    } catch (error) {
        showToast('خطأ: ' + error.message, 'error');
        const btn = document.querySelector(`button[onclick="requestCertificate(${courseId})"]`);
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🎓 إصدار الشهادة الآن';
        }
    }
}


// ===================== Guest Identity & Grants System =====================
const GUEST_COOKIE = 'masar_guest_id';

function getGuestId() {
    let gid = localStorage.getItem(GUEST_COOKIE);
    if (!gid) {
        gid = (crypto.randomUUID ? crypto.randomUUID() : 'g' + Date.now() + Math.random()).replace(/-/g, '').substring(0, 24);
        localStorage.setItem(GUEST_COOKIE, gid);
    }
    return gid;
}

function showRegisterHint() {
    // lightweight nudge for guests (not blocking)
    if (api.isLoggedIn()) return;
    const existing = document.getElementById('syncHint');
    if (existing || !document.querySelector('.course-body, #courseDetails')) return;
    const hint = document.createElement('div');
    hint.id = 'syncHint';
    hint.className = 'guest-note';
    hint.innerHTML = '💡 <b>نصيحة:</b> أنت تتصفح كضيف — بياناتك ومتابعتك محفوظة بهذا المتصفح. <a href="register.html" style="color:#4f46e5;font-weight:700">أنشئ حساباً مجانياً</a> حتى لا تفقد تقدمك وتتابع من أي جهاز.';
    const anchor = document.querySelector('.course-body') || document.getElementById('courseDetails');
    if (anchor) anchor.prepend(hint);
}

// Grant & coupon UI injection on course page
function injectGrantUI(course) {
    const container = document.querySelector('.course-content-section') || document.getElementById('courseDetails');
    if (!container || document.getElementById('grantWidget')) return;
    const isPaid = course.price > 0;
    const isGuest = !api.isLoggedIn();

    const widget = document.createElement('div');
    widget.id = 'grantWidget';
    // كورس مجاني: لا بانر منحة ولا حقل كوبون — الدخول فوري من زر واحد
    widget.innerHTML = `
        ${isGuest ? `<div class="guest-note">👤 تتصفح <b>كضيف</b> — رابط حسابك محفوظ بهالمتصفح (كوكيز) وبتقدر تتابع وتتعلم بدون تسجيل. <a href="register.html" style="color:#4f46e5;font-weight:700">أنشئ حساب</a> لتزامن تقدمك على كل أجهزتك 🔄</div>` : ''}
    `;
    container.prepend(widget);
}

function openGrantModal(courseId, courseTitle) {
    let modal = document.getElementById('grantModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'grantModal';
        modal.className = 'overlay';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal">
            <h3>🎓 طلب منحة: ${courseTitle}</h3>
            <p class="sub">املأ البيانات وبتقبل منحتك فوراً — وبتظهر للمدير للمتابعة</p>
            <label>الاسم الكامل *</label>
            <input id="gName" type="text" placeholder="اسمك الكريم">
            <div class="row2">
                <div><label>رقم الموبايل (واتساب)</label><input id="gPhone" type="tel" placeholder="09xxxxxxxx"></div>
                <div><label>المدينة</label><input id="gCity" type="text" placeholder="مدينتك"></div>
            </div>
            <div class="row2">
                <div><label>التعليم / التخصص</label><input id="gEdu" type="text" placeholder="مثال: طالب هندسة معلوماتية"></div>
                <div><label>هدفك من الكورس</label><input id="gGoal" type="text" placeholder="شو بتريد تتعلم؟"></div>
            </div>
            <label>ليك منحة؟ شو اللي بخليك تستاهلها؟ (اختياري)</label>
            <textarea id="gNeeds" placeholder="اكتب شي عن ظروفك أو دوافعك..."></textarea>
            <div style="margin-top:18px;display:flex;gap:10px">
                <button class="grant-btn" style="background:#10b981;color:#fff" onclick="submitGrant(${courseId})">🚀 أرسل وادخل فوراً</button>
                <button class="grant-btn" style="background:#f3f4f6" onclick="document.getElementById('grantModal').classList.remove('open')">إلغاء</button>
            </div>
        </div>`;
    modal.classList.add('open');
}

async function submitGrant(courseId) {
    const full_name = document.getElementById('gName').value.trim();
    if (!full_name) { showToast('اكتب اسمك من فضلك'); return; }
    const btn = document.querySelector('#grantModal .grant-btn') || (typeof event !== 'undefined' ? event.target : null);
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التقديم...'; }
    try {
        const res = await fetch(CONFIG.API_BASE_URL + '/grants/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guest_id: getGuestId(),
                course_id: courseId,
                full_name,
                phone: document.getElementById('gPhone').value.trim(),
                city: document.getElementById('gCity').value.trim(),
                education: document.getElementById('gEdu').value.trim(),
                goal: document.getElementById('gGoal').value.trim(),
                needs: document.getElementById('gNeeds').value.trim(),
            })
        });
        const data = await res.json();
        const modal = document.getElementById('grantModal');
        if (data.ok) {
            modal.innerHTML = `<div class="modal"><div class="grant-success">🎉 تم قبول منحتك فوراً!<br><span style="font-weight:400;font-size:.85rem;display:block;margin-top:8px">صرت مسجل بالكورس — <b>حمّل الصفحة</b> لتبدأ التعلم</span><br><button class="grant-btn" style="margin-top:14px" onclick="location.reload()">ابدأ التعلم ←</button></div></div>`;
        } else {
            showToast('حدث خطأ: ' + (data.error || 'جرّب مرة ثانية'), 'error');
            btn.disabled = false; btn.textContent = '🚀 أرسل وادخل فوراً';
        }
    } catch (e) {
        showToast('تعذر الاتصال: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = '🚀 أرسل وادخل فوراً';
    }
}

async function applyCoupon(courseId) {
    const code = document.getElementById('couponCode').value.trim();
    if (!code) { showToast('اكتب الكود أولاً'); return; }
    try {
        const res = await fetch(CONFIG.API_BASE_URL + '/grants/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: getGuestId(), code, course_id: courseId, full_name: 'طالب كوبون' })
        });
        const data = await res.json();
        if (data.ok) {
            showToast('✅ ' + data.message);
            setTimeout(() => location.reload(), 800);
        } else {
            showToast(data.error || 'كود غير صالح', true);
        }
    } catch (e) { showToast('تعذر الاتصال', true); }
}

// Hook into course page render (safe window-level override)
window._origDisplayCourseDetails = displayCourseDetails;
window.displayCourseDetails = function(course, enrollmentData, quizzesData) {
    window._origDisplayCourseDetails(course, enrollmentData, quizzesData);
    injectGrantUI(course);
    showRegisterHint();
    // نسخة احتياطية من هيرو الكورس (صورة + أزرار) لاسترجاعها عند إغلاق الفيديو
    const hero = document.getElementById('coursePlayer');
    if (hero) window._courseHeroBackup = hero.innerHTML;
};


// Guest quick enroll for free courses + inline coupon
async function quickFreeEnroll(courseId) {
    try {
        const res = await fetch(CONFIG.API_BASE_URL + '/grants/apply', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: getGuestId(), course_id: courseId, full_name: 'ضيف مسار', goal: 'تعلم مجاني' })
        });
        const data = await res.json();
        if (data.ok) {
            // إشعار inline بدل alert المزعج + تحديث تلقائي
            const n = document.createElement('div');
            n.style.cssText = 'position:fixed;top:18px;right:50%;transform:translateX(50%);background:#10b981;color:#fff;padding:14px 26px;border-radius:12px;font-weight:700;box-shadow:0 8px 24px rgba(16,185,129,.4);z-index:99999;font-family:inherit';
            n.textContent = '🎉 أهلاً فيك! جاري تجهيز الكورس...';
            document.body.appendChild(n);
            setTimeout(() => location.reload(), 900);
        } else {
            const n = document.createElement('div');
            n.style.cssText = 'position:fixed;top:18px;right:50%;transform:translateX(50%);background:#ef4444;color:#fff;padding:14px 26px;border-radius:12px;font-weight:700;z-index:99999;font-family:inherit';
            n.textContent = data.error || 'خطأ';
            document.body.appendChild(n);
            setTimeout(() => n.remove(), 3000);
        }
    } catch (e) {
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;top:18px;right:50%;transform:translateX(50%);background:#ef4444;color:#fff;padding:14px 26px;border-radius:12px;z-index:99999;font-family:inherit';
        n.textContent = 'تعذر الاتصال';
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3000);
    }
}

function applyCouponInline(courseId) {
    const code = prompt('اكتب كود الكوبون:');
    if (!code) return;
    document.getElementById('couponCode') ? (document.getElementById('couponCode').value = code, applyCoupon(courseId)) : null;
    if (!document.getElementById('couponCode')) {
        // widget مش محمّل — استدعاء مباشر
        fetch(CONFIG.API_BASE_URL + '/grants/redeem', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: getGuestId(), code, course_id: courseId, full_name: 'طالب كوبون' })
        }).then(r => r.json()).then(d => {
            if (d.ok) { showToast('✅ ' + d.message, 'success'); location.reload(); }
            else showToast(d.error || 'كود غير صالح', 'error');
        }).catch(() => showToast('تعذر الاتصال'));
    }
}


// إشعار عائم أنيق بدل alert
function showToast(msg, isErr) {
    document.querySelectorAll('.m-toast').forEach(t => t.remove());
    const n = document.createElement('div');
    n.className = 'm-toast';
    n.style.cssText = 'position:fixed;top:18px;right:50%;transform:translateX(50%);background:' + (isErr ? '#ef4444' : '#10b981') + ';color:#fff;padding:14px 26px;border-radius:12px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:99999;font-family:inherit;max-width:90%;text-align:center';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

// لم تعد هناك نافذة منبثقة — المشاهدة صفحة كاملة. الدالة محفوظة للتوافق.
function expandVideoShell(shell) {
    if (!shell) return;
    // no-op: watch page replaces the old overlay behavior
}
// ESC يغلق صفحة المشاهدة ويعود لصفحة الكورس
if (!window._escVideoHandler) {
    window._escVideoHandler = (e) => { if (e.key === 'Escape' && document.querySelector('.watch-shell')) collapseVideo(); };
    document.addEventListener('keydown', window._escVideoHandler);
}

// إغلاق صفحة المشاهدة والعودة لصفحة الكورس بدون إعادة تحميل
function collapseVideo() {
    document.querySelectorAll('.video-shell').forEach(s => s.remove());
    document.body.style.overflow = '';
    const page = document.getElementById('courseDetails');
    if (page && window._coursePageBackup) {
        page.innerHTML = window._coursePageBackup;
        window._coursePageBackup = null;
        // أعد ربط نسخة الهيرو الاحتياطية (يستخدمها كود المنح القديم)
        const hero = document.getElementById('coursePlayer');
        if (hero) window._courseHeroBackup = hero.innerHTML;
    }
    const player = document.getElementById('coursePlayer');
    if (player) player.classList.remove('playing');
}
