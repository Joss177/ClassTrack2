document.addEventListener("DOMContentLoaded", () => {
    const usuario = Session.usuario();

    // ─── Cargar datos del usuario (solo lectura) ──────────────────────────
    if (usuario) {
        document.getElementById("configNombre").value = usuario.nombre || "";
        document.getElementById("configCorreo").value = usuario.correo || "";
    }

    // ─── Modal Cambiar Información ────────────────────────────────────────
    const modalInfo      = document.getElementById("modalInfo");
    const modalInfoClose = document.getElementById("modalInfoClose");
    const btnCambiarInfo = document.getElementById("btnCambiarInfo");

    btnCambiarInfo?.addEventListener("click", () => {
        document.getElementById("modalNombre").value = document.getElementById("configNombre").value;
        document.getElementById("modalCorreo").value = document.getElementById("configCorreo").value;
        modalInfo.classList.add("active");
    });

    modalInfoClose?.addEventListener("click", () => {
        modalInfo.classList.remove("active");
    });

    modalInfo?.addEventListener("click", (e) => {
        if (e.target === modalInfo) modalInfo.classList.remove("active");
    });

    // ─── Confirmar cambio de información ─────────────────────────────────
    document.getElementById("btnConfirmarInfo")?.addEventListener("click", async () => {
        const nombre = document.getElementById("modalNombre").value.trim();
        const correo = document.getElementById("modalCorreo").value.trim();

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
                const data = await res.json();

                // Actualizar campos visibles bloqueados
                document.getElementById("configNombre").value = data.usuario.nombre;
                document.getElementById("configCorreo").value = data.usuario.correo;

                // Actualizar sesión
                const usuarioActual = Session.usuario();
                Session.save(Session.token(), {
                    ...usuarioActual,
                    nombre: data.usuario.nombre,
                    correo: data.usuario.correo,
                });

                modalInfo.classList.remove("active");
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

    // ─── Toggle mostrar/ocultar contraseña ───────────────────────────────
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

    // ─── Confirmar cambio de contraseña ──────────────────────────────────
    btnConfirmarPassword?.addEventListener("click", async () => {
        const nueva     = document.getElementById("nuevaPassword").value;
        const confirmar = document.getElementById("confirmarPassword").value;

        if (!nueva)              { alert("Ingresa la nueva contraseña"); return; }
        if (nueva !== confirmar) { alert("Las contraseñas no coinciden"); return; }
        if (nueva.length < 6)   { alert("La contraseña debe tener al menos 6 caracteres"); return; }

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
                document.getElementById("nuevaPassword").value     = "";
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