// ── Helpers de sesión ────────────────────────────────────────────────────────
const Session = {
    save(token, usuario) {
        localStorage.setItem("ct_token",   token);
        localStorage.setItem("ct_usuario", JSON.stringify(usuario));
    },
    clear() {
        localStorage.removeItem("ct_token");
        localStorage.removeItem("ct_usuario");
    },
    token()   { return localStorage.getItem("ct_token"); },
    usuario() {
        const u = localStorage.getItem("ct_usuario");
        return u ? JSON.parse(u) : null;
    },
    exists()  { return !!localStorage.getItem("ct_token"); }
};

const RUTAS_ROL = {
    "Administrador": "/admin/home",
    "Laboratorista": "/lab/home",
    "Docente":       "/docente/home",
};

// ── Protección de página de login ────────────────────────────────────────────
// Si ya hay sesión activa, no dejes entrar al login
if (document.getElementById("loginForm") && Session.exists()) {
    const usuario = Session.usuario();
    window.location.replace(RUTAS_ROL[usuario?.rol] ?? "/");
}

// ── Protección de páginas privadas ───────────────────────────────────────────
// En cualquier página que NO sea login/register, verifica sesión
const esPublica = ["/login", "/register"].some(p => window.location.pathname.startsWith(p));
if (!esPublica && !Session.exists()) {
    window.location.replace("/login");
}

// ── Toggle mostrar/ocultar contraseña ────────────────────────────────────────
const togglePassword = document.getElementById("togglePassword");
const passwordInput  = document.getElementById("password");

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const visible = passwordInput.type === "text";
        passwordInput.type = visible ? "password" : "text";
        togglePassword.classList.toggle("fa-eye",        visible);
        togglePassword.classList.toggle("fa-eye-slash", !visible);
    });
}

// ── Login ─────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const correo   = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value;
        const btnLogin = document.getElementById("btnLogin");
        const errorMsg = document.getElementById("errorMsg");

        errorMsg.textContent = "";
        btnLogin.disabled    = true;
        btnLogin.textContent = "Ingresando...";

        try {
            const res  = await fetch("/api/login", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ correo, password }),
            });

            const data = await res.json();

            if (res.ok) {
                Session.save(data.token, data.usuario);
                window.location.replace(RUTAS_ROL[data.usuario.rol] ?? "/");
            } else {
                errorMsg.textContent = data.detail ?? "Error al iniciar sesión";
            }

        } catch (err) {
            errorMsg.textContent = "No se pudo conectar con el servidor";
        } finally {
            btnLogin.disabled    = false;
            btnLogin.textContent = "Ingresar";
        }
    });
}

// ── Logout ───────────────────────────────────────────────────────────────────
// Llama a esto desde cualquier botón de cerrar sesión:
// logout()
async function logout() {
    await fetch("/api/logout", { method: "POST" });
    Session.clear();
    window.location.replace("/login");
}