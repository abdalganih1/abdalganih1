// Teacher Dashboard Logic

// Check Auth
function checkTeacherAuth() {
    if (!api.isLoggedIn()) {
        window.location.href = '../login.html';
        return;
    }
    const user = api.getCurrentUser();
    // In real app, check role === 'teacher'
    const teacherNameEl = document.getElementById('teacherName');
    if (teacherNameEl) {
        teacherNameEl.textContent = `مرحباً، ${user.name}`;
    }
}

function logout() {
    api.logout();
    window.location.href = '../index.html';
}

// Sidebar Rendering Logic
function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Robust page detection
    const path = window.location.pathname;
    let page = path.split('/').pop();

    // Handle URL parameters or hashes
    if (page.includes('?')) page = page.split('?')[0];
    if (page.includes('#')) page = page.split('#')[0];

    // Handle trailing slash or empty path
    if (page === '') page = 'index.html';

    // Normalize to page name without extension
    const currentPageName = page.replace('.html', '');

    const menuItems = [
        { name: 'الرئيسية', icon: '📊', link: 'index.html' },
        { name: 'كورساتي', icon: '📚', link: 'courses.html' },
        { name: 'طلابي', icon: '👥', link: 'students.html' },
        { name: 'الملف الشخصي', icon: '👤', link: 'profile.html' }
    ];

    const menuHtml = menuItems.map(item => {
        const itemPageName = item.link.replace('.html', '');
        // Check exact match or if current page implies this item (e.g. sub-pages)
        const isActive = currentPageName === itemPageName;

        return `
        <a href="${item.link}" class="nav-item ${isActive ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.name}</span>
        </a>
    `}).join('');

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <span class="logo-icon">👨‍🏫</span>
            <span class="logo-text">لوحة المعلم</span>
        </div>
        <nav class="sidebar-nav">
            ${menuHtml}
        </nav>
        <div class="sidebar-footer">
            <a href="../index.html" class="nav-item">
                <span class="nav-icon">🌐</span>
                <span>عرض الموقع</span>
            </a>
            <button class="nav-item logout-btn" onclick="logout()">
                <span class="nav-icon">🚪</span>
                <span>تسجيل الخروج</span>
            </button>
        </div>
    `;

    // Mobile Menu Toggle Logic
    setupMobileMenu();
}

function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    // Remove existing listeners to avoid duplicates if re-rendered
    const newToggle = menuToggle?.cloneNode(true);
    if (menuToggle && newToggle) {
        menuToggle.parentNode.replaceChild(newToggle, menuToggle);

        newToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            extractMenuToggle(e.target) !== newToggle) {

            // Helper to check if target is toggle or child of toggle
            function extractMenuToggle(el) {
                return el.closest('#menuToggle');
            }

            // If click is not on toggle button
            if (!e.target.closest('#menuToggle')) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Logic for Index Page
// Logic for Index Page
async function loadTeacherStats() {
    const coursesCountEl = document.getElementById('myCoursesCount');
    if (!coursesCountEl) return;

    try {
        // Backend returns only the logged-in teacher's courses (admins get all).
        const data = await api.getMyCourses();
        const myCourses = data.results || [];
        coursesCountEl.textContent = myCourses.length;
        document.getElementById('rating').textContent = '4.8';

        // Real student data for this teacher's courses.
        try {
            const studentsData = await api.getMyStudents(20);
            document.getElementById('myStudentsCount').textContent = studentsData.total_students || 0;
            loadRecentEnrollments(studentsData.results || []);
        } catch (e) {
            console.error('Failed to load students:', e);
            document.getElementById('myStudentsCount').textContent = 0;
            loadRecentEnrollments([]);
        }
    } catch (error) {
        console.error(error);
    }
}

// Render the real "recent enrollments" list for the teacher's courses.
function loadRecentEnrollments(enrollments) {
    const container = document.getElementById('recentEnrollments');
    if (!container) return;

    const list = (enrollments || []).slice(0, 5);

    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">لا يوجد تسجيلات بعد</div>`;
        return;
    }

    container.innerHTML = `
        <div class="item-list">
            ${list.map(s => `
                <div class="list-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                    <div>
                        <strong>${s.student_name}</strong> سجل في <span>${s.course_title}</span>
                    </div>
                    <span style="color:#888; font-size:0.8rem">${formatRelativeTime(s.enrolled_at)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Format a UTC SQLite datetime ("YYYY-MM-DD HH:MM:SS") as an Arabic relative time.
function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateStr;
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 2592000) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString('ar');
}

// Logic for Courses Page
async function loadTeacherCourses() {
    const grid = document.getElementById('myCoursesGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">جاري التحميل...</div>';

    try {
        // Only the teacher's own courses (admins get all) — prevents showing
        // courses the teacher doesn't own (which would 403 on quiz generation).
        const data = await api.getMyCourses();
        const allCourses = data.results || [];

        if (allCourses.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📚</div>
                    <h3>لا توجد كورسات بعد</h3>
                    <p>ابدأ بإضافة أول كورس للمنصة</p>
                    <button class="btn-primary" onclick="openAddCourseModal()">+ إضافة كورس جديد</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = allCourses.map(course => {
            const isFree = course.price === 0 && (!course.original_price || course.original_price === 0);
            const hasDiscount = course.discount_percentage > 0 && course.original_price > 0;

            let priceHTML = '';
            if (isFree) {
                priceHTML = '<span class="course-price free">مجاني</span>';
            } else if (hasDiscount) {
                priceHTML = `<span class="price-original">${new Intl.NumberFormat('ar-SY').format(course.original_price)} ل.س</span>
                             <span class="course-price">${new Intl.NumberFormat('ar-SY').format(course.price)} ل.س</span>`;
            } else {
                priceHTML = `<span class="course-price">${new Intl.NumberFormat('ar-SY').format(course.price)} ل.س</span>`;
            }

            return `
            <div class="course-card">
                <div class="course-img-wrapper">
                    <img src="${course.thumbnail_url || 'https://placehold.co/600x400?text=Course'}" class="course-img" alt="${course.title}" onerror="this.src='https://placehold.co/600x400?text=Course'">
                    <span class="course-badge ${isFree ? 'free' : ''}">${isFree ? 'مجاني' : course.category}</span>
                    ${hasDiscount ? `<span class="course-badge discount">خصم ${course.discount_percentage}%</span>` : ''}
                </div>
                <div class="course-body">
                    <div class="course-title">${course.title}</div>
                    <div class="course-instructor">${course.instructor}</div>
                    <div class="course-meta">
                        <span class="meta-item">
                            <span class="icon">📖</span>
                            ${course.category}
                        </span>
                        ${priceHTML}
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <button class="btn-primary" style="flex: 1; margin-top: 0;" onclick="openAddLesson(${course.id})">
                            + إضافة درس
                        </button>
                        <button class="btn-primary" style="flex: 1; background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); margin-top: 0;" onclick="openGenerateQuizModal(${course.id})" title="توليد اختبار بالذكاء الاصطناعي">
                            🧠 اختبار AI
                        </button>
                    </div>
                    <div class="course-actions">
                        <button class="btn-action btn-view" onclick="window.open('../course.html?id=${course.id}', '_blank')" style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534;">👁️ مشاهدة</button>
                        <button class="btn-action btn-edit" onclick="editCourse(${course.id})">✏️ تعديل</button>
                        <button class="btn-action btn-delete" onclick="deleteCourse(${course.id})">🗑️ حذف</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (error) {
        console.error('Error loading courses:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>حدث خطأ</h3>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="loadTeacherCourses()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// Course Modal Functions
function openAddCourseModal() {
    document.getElementById('courseModalTitle').textContent = 'إضافة كورس جديد';
    document.getElementById('courseForm').reset();
    document.getElementById('editCourseId').value = '';

    // Set default instructor to current user
    const user = api.getCurrentUser();
    if (user) {
        document.getElementById('courseInstructor').value = user.name;
    }

    document.getElementById('courseModal').classList.add('active');
    document.body.classList.add('modal-open');
}

function closeCourseModal() {
    document.getElementById('courseModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.getElementById('courseForm').reset();
    document.getElementById('editCourseId').value = '';
}

async function editCourse(courseId) {
    try {
        const data = await api.getCourses();
        const course = (data.results || []).find(c => c.id === courseId);

        if (course) {
            document.getElementById('courseModalTitle').textContent = 'تعديل الكورس';
            document.getElementById('editCourseId').value = courseId;
            document.getElementById('courseTitle').value = course.title || '';
            document.getElementById('courseDescription').value = course.description || '';
            document.getElementById('courseInstructor').value = course.instructor || '';
            document.getElementById('courseThumbnail').value = course.thumbnail_url || '';
            document.getElementById('courseDuration').value = course.duration || '';
            document.getElementById('courseRequirements').value = course.requirements || '';
            document.getElementById('courseExtraContent').value = course.extra_content || '';
            document.getElementById('coursePrice').value = course.price || 0;
            document.getElementById('courseCategory').value = course.category || 'برمجة';
            const promoEl = document.getElementById('coursePromoVideo');
            if (promoEl) promoEl.value = course.promo_video_url || '';

            document.getElementById('courseModal').classList.add('active');
            document.body.classList.add('modal-open');
        }
    } catch (error) {
        alert('خطأ في تحميل بيانات الكورس: ' + error.message);
    }
}

async function deleteCourse(courseId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }

    try {
        await api.deleteCourse(courseId);
        alert('تم حذف الكورس بنجاح!');
        loadTeacherCourses();
    } catch (error) {
        alert('خطأ في حذف الكورس: ' + error.message);
    }
}

async function submitCourseForm(event) {
    event.preventDefault();

    const form = event.target;
    const courseId = document.getElementById('editCourseId').value;

    // Handle Image Upload
    const fileInput = document.getElementById('courseThumbnailFile');
    let thumbnailUrl = document.getElementById('courseThumbnail').value.trim();

    // If a file is selected, try to upload it
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadBtn = form.querySelector('button[type="submit"]');
            const originalText = uploadBtn.textContent;
            uploadBtn.textContent = 'جاري رفع الصورة...';
            uploadBtn.disabled = true;

            const uploadResponse = await api.request('/courses/upload', {
                method: 'POST',
                body: formData
            });

            if (uploadResponse && uploadResponse.url) {
                thumbnailUrl = uploadResponse.url;
            }

            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        } catch (error) {
            console.warn('Image upload failed, using URL or default:', error.message);
            // Don't return - continue with URL or default
            const uploadBtn = form.querySelector('button[type="submit"]');
            if (uploadBtn) {
                uploadBtn.textContent = 'حفظ';
                uploadBtn.disabled = false;
            }
        }
    }

    const courseData = {
        title: document.getElementById('courseTitle').value,
        description: document.getElementById('courseDescription').value,
        instructor: document.getElementById('courseInstructor').value,
        thumbnail_url: thumbnailUrl,
        duration: document.getElementById('courseDuration').value, // Handled by backend map
        requirements: document.getElementById('courseRequirements').value,
        extra_content: document.getElementById('courseExtraContent').value,
        price: parseFloat(document.getElementById('coursePrice').value) || 0,
        category: document.getElementById('courseCategory').value
    };
    const promoEl2 = document.getElementById('coursePromoVideo');
    if (promoEl2) courseData.promo_video_url = promoEl2.value.trim();

    console.log('Sending course data:', courseData);

    try {
        if (courseId) {
            await api.updateCourse(courseId, courseData);
            alert('تم تحديث الكورس بنجاح!');
        } else {
            const result = await api.createCourse(courseData);
            console.log('Course created successfully:', result);
            alert('تم إضافة الكورس بنجاح!');
        }

        closeCourseModal();
        loadTeacherCourses();
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
}

// Modal Logic
function openAddLesson(courseId) {
    document.getElementById('courseIdField').value = courseId;
    document.getElementById('addLessonModal').classList.add('active');
}

function closeLessonModal() {
    document.getElementById('addLessonModal').classList.remove('active');
}

async function uploadVideo(file) {
    const progressBar = document.getElementById('uploadProgressBar');
    const statusText = document.getElementById('uploadStatusText');
    const container = document.getElementById('uploadProgressContainer');

    container.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.textContent = 'جاري التحضير للرفع...';

    try {
        // 1. Get Presigned URL
        statusText.textContent = 'جاري طلب رابط الرفع...';
        const presignResponse = await api.request('/courses/upload-url', {
            method: 'POST',
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type
            })
        });

        const { uploadUrl, publicUrl } = presignResponse;

        // 2. Upload to R2 directly using XHR for progress
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percentComplete + '%';
                    statusText.textContent = `جاري الرفع: ${percentComplete}%`;
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    progressBar.style.width = '100%';
                    statusText.textContent = 'تم الرفع بنجاح!';
                    resolve(publicUrl);
                } else {
                    reject(new Error('Upload failed with status: ' + xhr.status));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));

            xhr.send(file);
        });

    } catch (error) {
        container.style.display = 'none';
        throw error;
    }
}

async function submitLessonForm(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;

    const courseId = document.getElementById('courseIdField').value;
    const lessonType = document.getElementById('lessonType').value;
    let contentUrl = document.getElementById('lessonUrl').value;
    let typeToSend = lessonType;

    try {
        // Handle Video Upload
        if (lessonType === 'video_upload') {
            const fileInput = document.getElementById('lessonVideoFile');
            if (fileInput.files.length === 0) {
                throw new Error('يرجى اختيار ملف فيديو للرفع');
            }

            submitBtn.textContent = 'جاري رفع الفيديو...';
            contentUrl = await uploadVideo(fileInput.files[0]);
            typeToSend = 'video'; // Store as standard video type in DB
        }

        const lessonData = {
            title: document.getElementById('lessonTitle').value,
            type: typeToSend,
            content_url: contentUrl,
            duration_seconds: parseInt(document.getElementById('lessonDuration').value) || 0,
            order_num: 0 // Default order
        };

        submitBtn.textContent = 'جاري الحفظ...';
        await api.createLesson(courseId, lessonData);
        alert('تم إضافة الدرس بنجاح!');
        closeLessonModal();

        // Reset form specific elements
        document.getElementById('uploadProgressContainer').style.display = 'none';
        document.getElementById('uploadProgressBar').style.width = '0%';

    } catch (error) {
        alert('خطأ: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// ============= AI Quiz Generation =============

// Store generated questions for editing
let gqGeneratedQuestions = [];

// Open the AI quiz generation modal and load the course's lessons.
async function openGenerateQuizModal(courseId) {
    const modal = document.getElementById('generateQuizModal');
    const select = document.getElementById('gqLessonId');
    const preview = document.getElementById('gqPreview');
    const status = document.getElementById('gqStatus');
    const submitBtn = document.getElementById('gqSubmitBtn');

    if (!modal || !select) return;

    document.getElementById('gqCourseId').value = courseId;
    document.getElementById('gqNumQuestions').value = 5;
    document.getElementById('gqDifficulty').value = 'medium';
    document.getElementById('gqCustomPrompt').value = '';
    document.getElementById('gqPreviewList').innerHTML = '';
    preview.style.display = 'none';
    status.style.display = 'none';
    status.innerHTML = '';
    document.getElementById('gqSubmitBtnText').textContent = 'توليد الاختبار';
    submitBtn.disabled = false;
    gqGeneratedQuestions = [];

    select.innerHTML = '<option value="">-- جارٍ تحميل الدروس... --</option>';
    modal.classList.add('active');
    document.body.classList.add('modal-open');

    try {
        const data = await api.request(`/courses/${courseId}/lessons`);
        const lessons = data?.results || data?.lessons || data || [];
        if (!Array.isArray(lessons) || lessons.length === 0) {
            select.innerHTML = '<option value="">-- لا توجد دروس في هذا الكورس --</option>';
            return;
        }
        select.innerHTML = '<option value="">-- اختر درساً --</option>' +
            lessons.map((l) => `<option value="${l.id}">${l.title || ('درس #' + l.id)}</option>`).join('');
    } catch (e) {
        console.error('Failed to load lessons:', e);
        select.innerHTML = '<option value="">-- تعذّر تحميل الدروس --</option>';
    }
}

function closeGenerateQuizModal() {
    const modal = document.getElementById('generateQuizModal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    gqGeneratedQuestions = [];
}

// Set prompt hint from quick buttons
function setPromptHint(text) {
    const field = document.getElementById('gqCustomPrompt');
    if (field) {
        field.value = text;
        field.focus();
    }
}

// Render editable quiz preview
function renderQuizPreview(questions) {
    const list = document.getElementById('gqPreviewList');
    gqGeneratedQuestions = questions || [];

    if (!questions || questions.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">لا توجد أسئلة</div>';
        return;
    }

    list.innerHTML = questions.map((q, qi) => {
        const answers = q.answers || [];
        return `
        <div class="gq-question-card" data-qi="${qi}" style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: #fafafa; transition: all 0.2s;">
            <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
                <span style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; flex-shrink: 0;">${qi + 1}</span>
                <div style="flex: 1;">
                    <textarea class="gq-q-text" data-qi="${qi}" rows="2"
                        style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; font-weight: 600; color: #1e293b; resize: vertical; font-family: inherit; line-height: 1.5;"
                    >${q.question_text || ''}</textarea>
                </div>
                <button type="button" onclick="removeQuestion(${qi})" title="حذف السؤال"
                    style="background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;">×</button>
            </div>
            <div style="display: grid; gap: 6px; padding-right: 38px;">
                ${answers.map((a, ai) => `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="radio" name="gq_correct_${qi}" value="${ai}" ${a.is_correct ? 'checked' : ''}
                            style="width: 18px; height: 18px; accent-color: #10b981; cursor: pointer;" title="الإجابة الصحيحة">
                        <input type="text" class="gq-a-text" data-qi="${qi}" data-ai="${ai}" value="${a.answer_text || ''}"
                            style="flex: 1; padding: 8px 12px; border: 1px solid ${a.is_correct ? '#86efac' : '#d1d5db'}; border-radius: 8px; font-size: 0.9rem; color: ${a.is_correct ? '#166534' : '#475569'}; background: ${a.is_correct ? '#f0fdf4' : 'white'}; font-family: inherit; transition: all 0.2s;"
                            onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='${a.is_correct ? '#86efac' : '#d1d5db'}'">
                    </div>
                `).join('')}
            </div>
        </div>`;
    }).join('');
}

// Remove a question from the preview
function removeQuestion(qi) {
    gqGeneratedQuestions.splice(qi, 1);
    renderQuizPreview(gqGeneratedQuestions);
}

// Collect edited questions from the form
function collectEditedQuestions() {
    const questions = [];
    const qTexts = document.querySelectorAll('.gq-q-text');
    const aTexts = document.querySelectorAll('.gq-a-text');

    qTexts.forEach((qEl) => {
        const qi = parseInt(qEl.dataset.qi);
        const questionText = qEl.value.trim();
        if (!questionText) return;

        const answers = [];
        const correctRadio = document.querySelector(`input[name="gq_correct_${qi}"]:checked`);
        const correctAi = correctRadio ? parseInt(correctRadio.value) : 0;

        aTexts.forEach((aEl) => {
            if (parseInt(aEl.dataset.qi) === qi) {
                answers.push({
                    answer_text: aEl.value.trim(),
                    is_correct: parseInt(aEl.dataset.ai) === correctAi,
                });
            }
        });

        if (answers.length >= 2) {
            questions.push({
                question_text: questionText,
                type: 'multiple_choice',
                points: 1,
                answers: answers,
            });
        }
    });

    return questions;
}

function setGqStatus(kind, message) {
    const status = document.getElementById('gqStatus');
    if (!status) return;
    status.style.display = 'block';
    const colors = {
        info: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
        success: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
        error: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    };
    const c = colors[kind] || colors.info;
    status.innerHTML = `
        <div style="background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text}; border-radius: 10px; padding: 12px 14px; font-size: 0.95rem;">
            ${message}
        </div>`;
}

async function handleGenerateQuizSubmit(event) {
    event.preventDefault();

    const lessonId = document.getElementById('gqLessonId').value;
    const numQuestions = parseInt(document.getElementById('gqNumQuestions').value) || 5;
    const difficulty = document.getElementById('gqDifficulty').value;
    const customPrompt = document.getElementById('gqCustomPrompt').value.trim();
    const submitBtn = document.getElementById('gqSubmitBtn');
    const submitText = document.getElementById('gqSubmitBtnText');

    if (!lessonId) {
        setGqStatus('error', '⚠️ يرجى اختيار درس أولاً.');
        return;
    }

    submitBtn.disabled = true;
    submitText.textContent = 'جارٍ التوليد...';
    setGqStatus('info', '⏳ يقوم الذكاء الاصطناعي بتوليد الأسئلة... قد يستغرق ذلك من 10 إلى 30 ثانية.');

    try {
        const body = {
            lesson_id: parseInt(lessonId),
            num_questions: numQuestions,
            difficulty: difficulty,
        };
        if (customPrompt) {
            body.custom_prompt = customPrompt;
        }

        const result = await api.request('/ai/generate-quiz', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const questions = result?.questions || [];
        renderQuizPreview(questions);
        document.getElementById('gqPreview').style.display = 'block';
        submitText.textContent = 'تحديث الاختبار';
        setGqStatus('success', `✅ تم توليد ${questions.length} سؤالاً. يمكنك تعديلها أدناه ثم الضغط على "حفظ الاختبار المعدّل" لحفظها.`);

        // Add save button if not exists
        addSaveEditedButton();
    } catch (e) {
        console.error('Generate quiz error:', e);
        submitText.textContent = 'توليد الاختبار';
        let msg = '⚠️ حدث خطأ أثناء توليد الاختبار.';
        if (e.status === 401) msg = '🔒 انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.';
        else if (e.status === 403) msg = '🚫 ليس لديك صلاحية لتوليد اختبارات لهذا الكورس.';
        else if (e.status === 429) msg = '⏳ الذكاء الاصطناعي مشغول حالياً (تجاوز حد الطلبات). حاول بعد دقيقة.';
        else if (e.status === 502) msg = '⚠️ فشل توليد الاختبار من الذكاء الاصطناعي. حاول مرة أخرى.';
        else if (e.message) msg = `⚠️ ${e.message}`;
        setGqStatus('error', msg);
    } finally {
        submitBtn.disabled = false;
    }
}

// Add a save button for edited questions
function addSaveEditedButton() {
    const existingBtn = document.getElementById('gqSaveEditedBtn');
    if (existingBtn) return;

    const btnContainer = document.querySelector('#generateQuizForm > div:last-child');
    if (!btnContainer) return;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.id = 'gqSaveEditedBtn';
    saveBtn.textContent = '💾 حفظ الاختبار المعدّل';
    saveBtn.style.cssText = 'width: 100%; padding: 14px; font-size: 1.05rem; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 10px; font-weight: bold; color: white; display: flex; justify-content: center; align-items: center; gap: 8px; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);';
    saveBtn.onclick = saveEditedQuiz;
    btnContainer.insertBefore(saveBtn, btnContainer.firstChild);
}

// Save edited questions to backend
async function saveEditedQuiz() {
    const questions = collectEditedQuestions();
    if (questions.length === 0) {
        setGqStatus('error', '⚠️ لا توجد أسئلة صالحة للحفظ. تأكد من إدخال نص السؤال وإجابتين على الأقل.');
        return;
    }

    const lessonId = document.getElementById('gqLessonId').value;
    if (!lessonId) return;

    const saveBtn = document.getElementById('gqSaveEditedBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري الحفظ...';
    }

    try {
        // Replace the lesson's questions with the edited set in one call.
        // (generate-quiz already saved the originals, so a per-question append
        // would duplicate them — this endpoint clears and re-inserts instead.)
        await api.request('/quizzes/questions/bulk', {
            method: 'POST',
            body: JSON.stringify({
                lesson_id: parseInt(lessonId),
                questions: questions,
            }),
        });

        setGqStatus('success', `✅ تم حفظ ${questions.length} سؤالاً بنجاح!`);
    } catch (e) {
        console.error('Save edited quiz error:', e);
        let msg = '⚠️ حدث خطأ أثناء حفظ الأسئلة المعدّلة.';
        if (e.status === 403) msg = '🚫 ليس لديك صلاحية لتعديل اختبارات هذا الكورس.';
        else if (e.message) msg = `⚠️ ${e.message}`;
        setGqStatus('error', msg);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 حفظ الاختبار المعدّل';
        }
    }
}

// ============= End AI Quiz Generation =============

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderSidebar(); // Initializing dynamic sidebar first
    checkTeacherAuth();

    // Normalize page name
    let page = window.location.pathname.split('/').pop();
    if (page.includes('?')) page = page.split('?')[0];
    if (page.includes('#')) page = page.split('#')[0];
    const pageName = page.replace('.html', '');

    if (pageName === 'index' || pageName === '') {
        loadTeacherStats();
    } else if (pageName === 'courses') {
        loadTeacherCourses();
    } else if (pageName === 'students') {
        // loadTeacherStudents(); // Future implementation
    } else if (pageName === 'profile') {
        // loadTeacherProfile(); // Future implementation
    }

    // Lesson Form Listener
    document.getElementById('addLessonForm')?.addEventListener('submit', submitLessonForm);

    // Lesson Type Toggle Listener
    const lessonTypeSelect = document.getElementById('lessonType');
    const urlGroup = document.getElementById('urlGroup');
    const videoUploadGroup = document.getElementById('videoUploadGroup');

    if (lessonTypeSelect) {
        lessonTypeSelect.addEventListener('change', () => {
            const type = lessonTypeSelect.value;
            if (type === 'video_upload') {
                urlGroup.style.display = 'none';
                videoUploadGroup.style.display = 'block';
                document.getElementById('lessonUrl').required = false;
            } else {
                urlGroup.style.display = 'block';
                videoUploadGroup.style.display = 'none';
                // Reset file input
                document.getElementById('lessonVideoFile').value = '';
                document.getElementById('uploadProgressContainer').style.display = 'none';
            }
        });
    }

    // Course Form Listener
    document.getElementById('courseForm')?.addEventListener('submit', submitCourseForm);

    // AI Quiz Generation Form Listener
    document.getElementById('generateQuizForm')?.addEventListener('submit', handleGenerateQuizSubmit);
});
