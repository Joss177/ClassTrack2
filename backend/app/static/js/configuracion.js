document.addEventListener("DOMContentLoaded", () => {
    const usuario = Session.usuario();

    // ─── Cargar datos del usuario ─────────────────────────────────────────
    if (usuario) {
        document.getElementById("configNombre").value = usuario.nombre || "";
        document.getElementById("configCorreo").value = usuario.correo || "";

        const tema = usuario.tema || "claro";
        document.querySelectorAll("input[name='tema']").forEach(radio => {
            radio.checked = radio.value === tema;
        });
    }

    // ─── Cambiar tema ─────────────────────────────────────────────────────
    document.querySelectorAll("input[name='tema']").forEach(radio => {
        radio.addEventListener("change", () => {
            console.log("Tema seleccionado:", radio.value);
        });
    });

    // ─── Cambiar Información ──────────────────────────────────────────────
    document.getElementById("btnCambiarInfo")?.addEventListener("click", async () => {
        const nombre = document.getElementById("configNombre").value.trim();
        const correo = document.getElementById("configCorreo").value.trim();

        if (!nombre || !correo) { alert("Completa todos los campos"); return; }

        try {
            const res = await fetch("/api/me/info", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Session.token()}`
                },
                body: JSON.stringify({ nombre_completo: nombre, correo: correo })
            });

            if (res.ok) {
                alert("Información actualizada correctamente");
            } else {
                const err = await res.json();
                alert(err.detail || "Error al actualizar la información");
            }
        } catch (e) {
            console.error("Error al actualizar info:", e);
            alert("Error de conexión");
        }
    });

    // ─── Modal Cambiar Contraseña ─────────────────────────────────────────
    const modalPassword        = document.getElementById("modalPassword");
    const modalPasswordClose   = document.getElementById("modalPasswordClose");
    const btnCambiarPassword   = document.getElementById("btnCambiarPassword");
    const btnConfirmarPassword = document.getElementById("btnConfirmarPassword");

    btnCambiarPassword?.addEventListener("click", () => {
        modalPassword.classList.add("active");
    });

    modalPasswordClose?.addEventListener("click", () => {
        modalPassword.classList.remove("active");
    });

    modalPassword?.addEventListener("click", (e) => {
        if (e.target === modalPassword) modalPassword.classList.remove("active");
    });

    // ─── Toggle mostrar/ocultar contraseña ────────────────────────────────
    function togglePassword(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon  = document.getElementById(iconId);
        if (!input || !icon) return;
        icon.addEventListener("click", () => {
            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            icon.classList.toggle("fa-eye",       visible);
            icon.classList.toggle("fa-eye-slash", !visible);
        });
    }

    togglePassword("nuevaPassword",     "toggleNueva");
    togglePassword("confirmarPassword", "toggleConfirmar");

    // ─── Confirmar cambio de contraseña ───────────────────────────────────
    btnConfirmarPassword?.addEventListener("click", async () => {
        const nueva     = document.getElementById("nuevaPassword").value;
        const confirmar = document.getElementById("confirmarPassword").value;

        if (!nueva)                  { alert("Ingresa la nueva contraseña"); return; }
        if (nueva !== confirmar)     { alert("Las contraseñas no coinciden"); return; }
        if (nueva.length < 6)        { alert("La contraseña debe tener al menos 6 caracteres"); return; }

        try {
            const res = await fetch("/api/me/password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Session.token()}`
                },
                body: JSON.stringify({ password: nueva })
            });

            if (res.ok) {
                modalPassword.classList.remove("active");
                document.getElementById("nuevaPassword").value    = "";
                document.getElementById("confirmarPassword").value = "";
                alert("Contraseña actualizada correctamente");
            } else {
                const err = await res.json();
                alert(err.detail || "Error al cambiar la contraseña");
            }
        } catch (e) {
            console.error("Error al cambiar contraseña:", e);
            alert("Error de conexión");
        }
    });
});