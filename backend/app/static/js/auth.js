// ── Toggle mostrar/ocultar contraseña ───────────────────────────────────────
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

// ── Login ────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const correo   = document.getElementById("correo").value.trim();
        const password = document.getElementById("password").value;
        const btnLogin = document.getElementById("btnLogin");
        const errorMsg = document.getElementById("errorMsg");

        // Limpiar error anterior
        errorMsg.textContent = "";
        btnLogin.disabled = true;
        btnLogin.textContent = "Ingresando...";

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Guardar datos básicos en sessionStorage
                sessionStorage.setItem("usuario", JSON.stringify(data.usuario));
                // Redirigir según rol
                const rutas = {
                    "Administrador":  "/admin/home",
                    "Laboratorista":  "/lab/home",
                    "Docente":        "/docente/home",
                };
                window.location.href = rutas[data.usuario.rol] ?? "/";
            } else {
                errorMsg.textContent = data.detail ?? "Error al iniciar sesión";
            }

        } catch (err) {
            errorMsg.textContent = "No se pudo conectar con el servidor";
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = "Ingresar";
        }
    });
}