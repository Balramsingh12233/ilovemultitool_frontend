// Configuration for API endpoints
window.API_BASE_URL = "https://pdfcraft-backend-1.onrender.com"; // Production URL
// window.API_BASE_URL = "http://localhost:4000"; // Dev URL (Uncomment for local dev)

// Global Auth Check
// Run this on every page load to update Navbar state
document.addEventListener("DOMContentLoaded", async () => {
    // Only run if we are NOT on login/signup pages to avoid loops
    if (!document.querySelector('.auth-split-container')) {
        await checkAuthStatus();
    }
});

async function checkAuthStatus() {
    let user = null;
    let isAuthenticated = false;

    try {
        const res = await fetch(`${window.API_BASE_URL}/api/me`, { credentials: 'include' });
        const data = await res.json();

        if (data.isAuthenticated) {
            user = data.user;
            isAuthenticated = true;
            // Sync local storage so it's fresh
            localStorage.setItem('user_session', JSON.stringify(user));
        }
    } catch (err) {
        console.warn("Auth check failed (network/cors), checking fallback...");
    }

    // Fallback: Check LocalStorage if API didn't confirm auth
    if (!isAuthenticated) {
        const stored = localStorage.getItem('user_session');
        if (stored) {
            try {
                user = JSON.parse(stored);
                isAuthenticated = true;
                console.log("Restored session from LocalStorage");
            } catch (e) {
                console.error("Invalid stored session");
                localStorage.removeItem('user_session');
            }
        }
    }

    const navRight = document.querySelector('.nav-right');

    if (navRight && isAuthenticated && user) {
        const userInitial = user.name.charAt(0).toUpperCase();

        navRight.innerHTML = `
            <div class="nav-logged-in-group" style="display:flex; align-items:center; gap:15px;">
                <!-- 9-Dot App Launcher -->
                <div class="nav-item-dropdown">
                    <button class="icon-btn apps-btn" onclick="toggleDropdown('appsDropdown')" title="All Tools">
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
                         </svg>
                    </button>
                    <!-- Apps Dropdown -->
                    <div id="appsDropdown" class="custom-dropdown apps-menu">
                         <div class="apps-grid">
                            <a href="html_body/organize_pdfs/merge.html" class="app-item"><span class="app-icon">🔄</span> Merge</a>
                            <a href="html_body/organize_pdfs/split.html" class="app-item"><span class="app-icon">✂️</span> Split</a>
                            <a href="html_body/secure_pdfs/protect.html" class="app-item"><span class="app-icon">🔒</span> Protect</a>
                            <a href="html_body/secure_pdfs/unlock.html" class="app-item"><span class="app-icon">🔓</span> Unlock</a>
                         </div>
                    </div>
                </div>

                <!-- User Profile -->
                <div class="nav-item-dropdown">
                    <button class="profile-btn" onclick="toggleDropdown('profileDropdown')">
                        ${userInitial}
                    </button>
                    <!-- Profile Dropdown -->
                    <div id="profileDropdown" class="custom-dropdown profile-menu">
                         <div class="profile-header">
                             <div class="profile-circle">${userInitial}</div>
                             <div class="profile-info">
                                 <span class="p-name">${user.name}</span>
                                 <span class="p-email">${user.email}</span>
                             </div>
                         </div>
                         <div class="dropdown-divider"></div>
                         <a href="#" class="dropdown-item">Account Settings</a>
                         <a href="#" class="dropdown-item" onclick="logout()">Log out</a>
                    </div>
                </div>
            </div>
        `;

        // Add global click listener to close dropdowns if clicked outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-item-dropdown')) {
                document.querySelectorAll('.custom-dropdown').forEach(el => el.style.display = 'none');
            }
        });
    }
}

// LOGOUT Function
async function logout() {
    try {
        localStorage.removeItem('user_session'); // Clear fallback
        await fetch(`${window.API_BASE_URL}/api/logout`, { method: 'POST' });
        window.location.reload();
    } catch (err) {
        console.error("Logout failed", err);
        window.location.reload();
    }
}

// Helper to toggle specific dropdowns (Global)
window.toggleDropdown = function (id) {
    // Close others
    document.querySelectorAll('.custom-dropdown').forEach(el => {
        if (el.id !== id) el.style.display = 'none';
    });

    const target = document.getElementById(id);
    if (target) {
        target.style.display = target.style.display === 'block' ? 'none' : 'block';
    }
}
