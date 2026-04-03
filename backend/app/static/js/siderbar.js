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

    // ─── Menú según rol ───────────────────────────────────────────────────
    const usuario = Session.usuario();
    const rol = usuario?.rol;

    if (rol === "Administrador" || rol === "Laboratorista") {
        document.getElementById("menu-gestion")?.removeAttribute("style");
    }
    if (rol === "Administrador") {
        document.getElementById("menu-configuracion")?.removeAttribute("style");
    }

    // ─── Dark Mode Toggle ─────────────────────────────────────────
    const darkToggle = document.getElementById("darkModeToggle");
    const themeIcon  = document.getElementById("themeIcon");

    function applyTheme(dark) {
        if (dark) {
            document.body.classList.add("dark-mode");
            darkToggle.checked = true;
            themeIcon.classList.remove("fa-sun", "moon");
            themeIcon.classList.add("fa-moon", "moon");
        } else {
            document.body.classList.remove("dark-mode");
            darkToggle.checked = false;
            themeIcon.classList.remove("fa-moon", "moon");
            themeIcon.classList.add("fa-sun");
            themeIcon.style.color = "#f9d71c";
        }
    }

    // Restaurar preferencia guardada
    const savedTheme = localStorage.getItem("theme");
    applyTheme(savedTheme === "dark");

    darkToggle?.addEventListener("change", () => {
        const isDark = darkToggle.checked;
        localStorage.setItem("theme", isDark ? "dark" : "light");

        // Animación del ícono
        themeIcon.style.transform = "rotate(360deg) scale(0.7)";
        setTimeout(() => {
            applyTheme(isDark);
            themeIcon.style.transform = "rotate(0deg) scale(1)";
        }, 250);
    });
    
});