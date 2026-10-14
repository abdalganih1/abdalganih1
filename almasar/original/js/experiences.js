// AI Experiences Registry — التجارب الذكية المرتبطة بالكورسات
// مركز واحد: صفحة التجارب + المحطات 🎯 بالمسارات + بانر صفحة الكورس تقرأ من هنا
const AI_EXPERIENCES = [
    {
        id: 'arduino-lab',
        title: 'مختبر الأردوينو التفاعلي',
        description: 'محاكي دوائر ثلاثي الأبعاد: وصّل المكونات والحساسات، اكتب كود الأردوينو وشغّله مباشرة',
        icon: '⚡',
        url: 'https://arduino-lab.pages.dev/',
        courseId: 105,
        courseTitle: 'مبادئ وأساسيات شرائح الأردوينو',
        // محطة 🎯 هدف قريب داخل مسار الكورس (بعد دروس الأساسيات)
        milestone: {
            afterLessonId: 1183, // بعد «أردوينو IDE» — نهاية قسم الأساسيات
            afterLessonTitle: 'أردوينو IDE',
            title: 'صمّم دائرتك الأولى على المحاكي',
            hint: 'طبّق ما تعلمته: صمّم دارة LED على مختبر الأردوينو وشغّلها بكودك'
        }
    },
    {
        id: 'anmat',
        title: 'أنماط — اختبار وتحليل الشخصية',
        description: 'اختبار تفاعلي بالذكاء الاصطناعي يحدد نمط شخصيتك مع شرح مفصل لنقاط قوتك وطريقة تفكيرك',
        icon: '🧠',
        url: 'https://anmat-web.pages.dev/',
        courseId: 108,
        courseTitle: 'مسار ريادة المستقبل',
        // محطة 🎯 بعد درسي أنماط الشخصية (الجلسة الأولى والثانية)
        milestone: {
            afterLessonId: 1328, // بعد «انماط الشخصية الجلسة الثانية»
            afterLessonTitle: 'انماط الشخصية الجلسة الثانية',
            title: 'اكتشف نمط شخصيتك بتجربة أنماط',
            hint: 'حدد نمطك عبر اختبار ذكي ثم قارن النتيجة بما تعلمته بجلسات أنماط الشخصية'
        }
    }
];

// مساعدات الوصول
function getExperienceByCourse(courseId) {
    return AI_EXPERIENCES.find(e => e.courseId === Number(courseId)) || null;
}

function buildExperienceCard(exp) {
    return `
    <a href="${exp.url}" target="_blank" rel="noopener noreferrer" class="ai-exp-card">
        <div class="ai-exp-icon">${exp.icon}</div>
        <div class="ai-exp-body">
            <span class="ai-exp-tag">تجربة ذكية · ${exp.courseTitle}</span>
            <h3>${exp.title}</h3>
            <p>${exp.description}</p>
            <span class="ai-exp-cta">جرّب الآن ←</span>
        </div>
    </a>`;
}

// محطة 🎯 هدف قريب تُحقن بقائمة الدروس داخل مسار الكورس
function buildMilestoneHtml(exp) {
    if (!exp || !exp.milestone) return '';
    return `
    <div class="ai-milestone" onclick="window.open('${exp.url}', '_blank', 'noopener')" role="button" tabindex="0" aria-label="${exp.milestone.title}">
        <span class="ai-milestone-icon">🎯</span>
        <div class="ai-milestone-body">
            <span class="ai-milestone-label">هدف قريب</span>
            <h4>${exp.milestone.title}</h4>
            <p>${exp.milestone.hint}</p>
        </div>
        <span class="ai-milestone-cta">جرّب ←</span>
    </div>`;
}

// بانر صفحة الكورس: «طبّق ما تعلمته»
function buildCourseBanner(exp) {
    if (!exp) return '';
    return `
    <a href="${exp.url}" target="_blank" rel="noopener noreferrer" class="ai-course-banner">
        <span class="ai-banner-icon">🤖</span>
        <div class="ai-banner-body">
            <strong>طبّق ما تعلمته — تجربة تفاعلية بالذكاء الاصطناعي</strong>
            <span>${exp.title}: ${exp.description}</span>
        </div>
        <span class="ai-banner-cta">ابدأ التجربة ←</span>
    </a>`;
}

// مصفوفة آراء الطلاب (نصوص placeholder — يستبدلها المهندس لاحقاً)
const TESTIMONIALS = [
    {
        name: 'أحمد ت.',
        role: 'طالب برمجة',
        text: 'الطريقة العملية بالشرح خلتني أفهم البرمجة لأول مرة. الدروس مرتبة وكل خطوة مبنية على اللي قبلها.'
    },
    {
        name: 'سارة م.',
        role: 'طالبة ريادة',
        text: 'كورس ريادة المستقبل غيّر نظرتي لنفسي وقدراتي. حسيت إني صرت أعرف شو أبدأ ومن وين.'
    },
    {
        name: 'محمد خ.',
        role: 'مشارك بكورس الأردوينو',
        text: 'أول مرة أشتغل على متحكمات بهالسهولة. التطبيق والمحاكاة خلت التعلم متعة حقيقية.'
    }
];
