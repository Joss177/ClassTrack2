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

    // ─── Modal Cambiar Contraseña ─────────────────────────────────────────
    const modalPassword      = document.getElementById("modalPassword");
    const modalPasswordClose = document.getElementById("modalPasswordClose");
    const btnCambiarPassword = document.getElementById("btnCambiarPassword");
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

    togglePassword("nuevaPassword",      "toggleNueva");
    togglePassword("confirmarPassword",  "toggleConfirmar");

    // ─── Confirmar cambio de contraseña ───────────────────────────────────
    btnConfirmarPassword?.addEventListener("click", async () => {
        const nueva     = document.getElementById("nuevaPassword").value;
        const confirmar = document.getElementById("confirmarPassword").value;

        if (!nueva) { alert("Ingresa la nueva contraseña"); return; }
        if (nueva !== confirmar) { alert("Las contraseñas no coinciden"); return; }
        if (nueva.length < 6)   { alert("La contraseña debe tener al menos 6 caracteres"); return; }

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
            alert("Error al cambiar la contraseña");
        }
    });
});