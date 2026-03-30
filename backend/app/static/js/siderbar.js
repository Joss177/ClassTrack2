document.addEventListener("DOMContentLoaded", () => {
    const sidebar   = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggleSidebar");
    const logoutBtn = document.getElementById("logoutBtn");

    // ─── Sidebar: restaurar estado sin animación ──────────────────────────
    const sidebarStatus = localStorage.getItem("sidebarStatus");
    if (window.innerWidth > 768 && sidebarStatus === "collapsed") {
        sidebar.classList.add("no-transition", "collapsed");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                sidebar.classList.remove("no-transition");
            });
        });
    }

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle("mobile-open");
            } else {
                sidebar.classList.toggle("collapsed");
                localStorage.setItem(
                    "sidebarStatus",
                    sidebar.classList.contains("collapsed") ? "collapsed" : "expanded"
                );
            }
        });
    }

    // ─── Logout ───────────────────────────────────────────────────────────
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => logout());
    }
});