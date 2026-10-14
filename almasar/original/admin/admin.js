// Admin Dashboard Logic

// Check if user is admin (Simple check for demo)
function checkAdminAuth() {
    if (!api.isLoggedIn()) {
        window.location.href = '../login.html';
        return;
    }

    // In a real app, we would check the user role here
    const user = api.getCurrentUser();
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = `مرحباً، ${user.name}`;
    }
}

// Logout function
function logout() {
    api.logout();
    window.location.href = '../index.html';
}

// Toggle Sidebar
document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const [coursesData, usersData] = await Promise.all([
            api.getCourses(),
            api.getUsers({ sort: 'created_at', order: 'DESC' })
        ]);

        const courses = coursesData.results || [];
        const users = usersData.results || [];

        // Update Stats (real data)
        document.getElementById('coursesCount').textContent = courses.length;
        document.getElementById('usersCount').textContent = usersData.counts?.total ?? users.length;

        // Enrollments + confirmed payment totals (best-effort).
        try {
            const [studentsData, paymentsData] = await Promise.all([
                api.getMyStudents(500),
                api.getAllPayments('confirmed')
            ]);
            document.getElementById('enrollmentsCount').textContent = studentsData.total_enrollments ?? 0;
            const total = (paymentsData.results || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
            document.getElementById('paymentsCount').textContent = formatMoney(total);
        } catch (e) {
            console.error('Error loading extra stats:', e);
        }

        // Render Recent Courses + Users (real data)
        renderRecentCourses(courses.slice(0, 5));
        renderRecentUsers(users.slice(0, 5));

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function formatMoney(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
}

function renderRecentCourses(courses) {
    const container = document.getElementById('recentCourses');
    if (!container) return;

    if (courses.length === 0) {
        container.innerHTML = '<p class="text-gray">لا توجد كورسات</p>';
        return;
    }

    container.innerHTML = `
        <div class="item-list">
            ${courses.map(course => `
                <div class="list-item">
                    <img src="${course.thumbnail_url}" class="item-img" alt="${course.title}" onerror="this.src='https://placehold.co/100x100?text=Course'">
                    <div class="item-details">
                        <h4>${course.title}</h4>
                        <p>${course.instructor} • ${course.category}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderRecentUsers(users) {
    const container = document.getElementById('recentUsers');
    if (!container) return;

    const list = users || [];
    if (list.length === 0) {
        container.innerHTML = '<p class="text-gray">لا يوجد مستخدمون</p>';
        return;
    }

    const roleLabel = { admin: 'مدير', teacher: 'معلم', student: 'طالب' };
    container.innerHTML = `
        <div class="item-list">
            ${list.map(user => {
                const avatar = user.avatar_url
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=6366f1&color=fff`;
                return `
                <div class="list-item">
                    <img src="${avatar}" class="item-img" alt="${user.name || ''}" onerror="this.src='https://ui-avatars.com/api/?name=U&background=6366f1&color=fff'">
                    <div class="item-details">
                        <h4>${user.name || ''}</h4>
                        <p>${roleLabel[user.role] || user.role || ''}</p>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();

    // Determine current page
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        loadDashboardStats();
    }

    // Initialize notifications
    initNotifications();
});

// ===== Notification System =====
let notificationInterval = null;

function initNotifications() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    // Inject notification bell HTML
    const bellWrapper = document.createElement('div');
    bellWrapper.className = 'notification-wrapper';
    bellWrapper.innerHTML = `
        <button class="notification-bell" id="notificationBell" onclick="toggleNotifications(event)">
            🔔
            <span class="notification-badge hidden" id="notificationBadge">0</span>
        </button>
        <div class="notification-dropdown" id="notificationDropdown">
            <div class="notification-dropdown-header">
                <h4>🔔 الإشعارات</h4>
                <button class="mark-all-read-btn" onclick="markAllRead(event)">تعيين الكل كمقروء</button>
            </div>
            <div class="notification-list" id="notificationList">
                <div class="notification-empty">
                    <span>🔔</span>
                    <p>لا توجد إشعارات</p>
                </div>
            </div>
            <div class="notification-dropdown-footer">
                <a href="payments.html">عرض كل المدفوعات</a>
            </div>
        </div>
    `;

    headerActions.prepend(bellWrapper);

    // Load initial count and start polling
    updateNotificationCount();
    notificationInterval = setInterval(updateNotificationCount, 30000);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const bell = document.getElementById('notificationBell');
        if (dropdown && bell && !dropdown.contains(e.target) && !bell.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

async function updateNotificationCount() {
    try {
        const data = await api.getNotificationCount();
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        const count = data.count || 0;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        // Silently fail — user might not be admin
    }
}

function toggleNotifications(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const isShowing = dropdown.classList.contains('show');
    if (isShowing) {
        dropdown.classList.remove('show');
    } else {
        dropdown.classList.add('show');
        loadNotifications();
    }
}

async function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    list.innerHTML = '<div class="notification-empty"><p>جاري التحميل...</p></div>';

    try {
        const data = await api.getNotifications(15);
        const items = data.results || [];

        if (items.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <span>✅</span>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
            return;
        }

        list.innerHTML = items.map(notif => {
            const isUnread = !notif.is_read;
            const timeAgo = getTimeAgo(notif.created_at);
            const icon = getNotificationIcon(notif.type);

            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="handleNotificationClick(${notif.id}, event)">
                    <div class="notification-icon-circle">${icon}</div>
                    <div class="notification-content">
                        <div class="notif-title">${notif.title}</div>
                        <div class="notif-message">${notif.message}</div>
                        <div class="notif-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        list.innerHTML = `
            <div class="notification-empty">
                <span>⚠️</span>
                <p>خطأ في تحميل الإشعارات</p>
            </div>
        `;
    }
}

async function handleNotificationClick(notifId, e) {
    e.stopPropagation();
    try {
        await api.markNotificationRead(notifId);
        updateNotificationCount();

        // Update the clicked item visually
        const item = e.currentTarget;
        item.classList.remove('unread');
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllRead(e) {
    e.stopPropagation();
    try {
        await api.markAllNotificationsRead();
        updateNotificationCount();

        // Update all items visually
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'receipt_uploaded': return '🧾';
        case 'new_payment': return '💳';
        case 'new_enrollment': return '📝';
        default: return '🔔';
    }
}

function getTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr + 'Z'); // Treat as UTC
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar');
}
