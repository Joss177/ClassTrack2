document.addEventListener("DOMContentLoaded", () => {
    const btnAgregar = document.getElementById("btnAgregar");

    // ─── Referencias modales ──────────────────────────────────────────────
    const modalDocente        = document.getElementById("modalDocente");
    const modalEditarDocente  = document.getElementById("modalEditarDocente");
    const modalMateria        = document.getElementById("modalMateria");
    const modalEditarMateria  = document.getElementById("modalEditarMateria");
    const modalGrupo          = document.getElementById("modalGrupo");
    const modalEditarGrupo    = document.getElementById("modalEditarGrupo");
    const modalAula           = document.getElementById("modalAula");
    const modalEditarAula     = document.getElementById("modalEditarAula");
    const modalEliminar       = document.getElementById("modalEliminar");

    // ─── Abrir modal según página ─────────────────────────────────────────
    if (btnAgregar) {
        btnAgregar.addEventListener("click", () => {
            if (modalDocente) { modalDocente.classList.add("active"); return; }
            if (modalMateria) { modalMateria.classList.add("active"); return; }
            if (modalGrupo)   { modalGrupo.classList.add("active");   return; }
            if (modalAula)    { modalAula.classList.add("active");    return; }
        });
    }

    // ─── Helper genérico para cerrar ──────────────────────────────────────
    function bindCerrar(modal, ...triggers) {
        if (!modal) return;
        triggers.forEach(t => t?.addEventListener("click", () => modal.classList.remove("active")));
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove("active");
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DOCENTES
    // ═══════════════════════════════════════════════════════════════════════

    bindCerrar(modalDocente,
        document.getElementById("modalClose"),
        document.getElementById("btnCancelar")
    );

    document.getElementById("btnConfirmar")?.addEventListener("click", async () => {
        const nombre = document.getElementById("docenteNombre").value.trim();
        const email  = document.getElementById("docenteEmail").value.trim();

        if (!nombre) { alert("El nombre es requerido"); return; }

        const res = await fetch("/api/docentes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, email })
        });

        if (res.ok) { modalDocente.classList.remove("active"); window.location.reload(); }
        else { alert("Error al agregar docente"); }
    });

    // Editar docente
    let docenteEditandoId = null;

    bindCerrar(modalEditarDocente,
        document.getElementById("modalEditarClose"),
        document.getElementById("btnEditarCancelar")
    );

    document.getElementById("btnGuardar")?.addEventListener("click", async () => {
        const nombre = document.getElementById("editarNombre").value.trim();
        const email  = document.getElementById("editarEmail").value.trim();

        if (!nombre) { alert("El nombre es requerido"); return; }

        const res = await fetch(`/api/docentes/${docenteEditandoId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, email })
        });

        if (res.ok) { modalEditarDocente.classList.remove("active"); window.location.reload(); }
        else { alert("Error al editar docente"); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // MATERIAS
    // ═══════════════════════════════════════════════════════════════════════

    bindCerrar(modalMateria,
        document.getElementById("modalMateriaClose"),
        document.getElementById("btnMateriaCancelar")
    );

    document.getElementById("btnMateriaConfirmar")?.addEventListener("click", async () => {
        const nombre = document.getElementById("materiaNombre").value.trim();
        const codigo = document.getElementById("materiaCodigo").value.trim();
        const color  = document.getElementById("materiaColor").value;

        if (!nombre || !codigo) { alert("Nombre y código son requeridos"); return; }

        const res = await fetch("/api/materias", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, codigo, color })
        });

        if (res.ok) { modalMateria.classList.remove("active"); window.location.reload(); }
        else { alert("Error al agregar materia"); }
    });

    // Editar materia
    let materiaEditandoId = null;

    bindCerrar(modalEditarMateria,
        document.getElementById("modalEditarMateriaClose"),
        document.getElementById("btnEditarMateriaCancelar")
    );

    document.getElementById("btnEditarMateriaGuardar")?.addEventListener("click", async () => {
        const nombre = document.getElementById("editarMateriaNombre").value.trim();
        const codigo = document.getElementById("editarMateriaCodigo").value.trim();
        const color  = document.getElementById("editarMateriaColor").value;

        if (!nombre || !codigo) { alert("Nombre y código son requeridos"); return; }

        const res = await fetch(`/api/materias/${materiaEditandoId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, codigo, color })
        });

        if (res.ok) { modalEditarMateria.classList.remove("active"); window.location.reload(); }
        else { alert("Error al editar materia"); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // GRUPOS
    // ═══════════════════════════════════════════════════════════════════════

    bindCerrar(modalGrupo,
        document.getElementById("modalGrupoClose"),
        document.getElementById("btnGrupoCancelar")
    );

    document.getElementById("btnGrupoConfirmar")?.addEventListener("click", async () => {
        const nombre   = document.getElementById("grupoNombre").value.trim();
        const cantidad = document.getElementById("grupoCantidad").value;

        if (!nombre) { alert("El nombre es requerido"); return; }

        const res = await fetch("/api/grupos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, cantidad_estudiantes: parseInt(cantidad) || 0 })
        });

        if (res.ok) { modalGrupo.classList.remove("active"); window.location.reload(); }
        else { alert("Error al agregar grupo"); }
    });

    // Editar grupo
    let grupoEditandoId = null;

    bindCerrar(modalEditarGrupo,
        document.getElementById("modalEditarGrupoClose"),
        document.getElementById("btnEditarGrupoCancelar")
    );

    document.getElementById("btnEditarGrupoGuardar")?.addEventListener("click", async () => {
        const nombre   = document.getElementById("editarGrupoNombre").value.trim();
        const cantidad = document.getElementById("editarGrupoCantidad").value;

        if (!nombre) { alert("El nombre es requerido"); return; }

        const res = await fetch(`/api/grupos/${grupoEditandoId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, cantidad_estudiantes: parseInt(cantidad) || 0 })
        });

        if (res.ok) { modalEditarGrupo.classList.remove("active"); window.location.reload(); }
        else { alert("Error al editar grupo"); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // AULAS
    // ═══════════════════════════════════════════════════════════════════════

    bindCerrar(modalAula,
        document.getElementById("modalAulaClose"),
        document.getElementById("btnAulaCancelar")
    );

    document.getElementById("btnAulaConfirmar")?.addEventListener("click", async () => {
        const nombre   = document.getElementById("aulaNombre").value.trim();
        const edificio = document.getElementById("aulaEdificio").value.trim();
        const piso     = document.getElementById("aulaPiso").value;

        if (!nombre) { alert("El nombre es requerido"); return; }

        const res = await fetch("/api/aulas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, edificio, piso: parseInt(piso) || 0 })
        });

        if (res.ok) { modalAula.classList.remove("active"); window.location.reload(); }
        else { alert("Error al agregar aula"); }
    });

    // Editar aula
    let aulaEditandoId = null;

    bindCerrar(modalEditarAula,
        document.getElementById("modalEditarAulaClose"),
        document.getElementById("btnEditarAulaCancelar")
    );

    document.getElementById("btnEditarAulaGuardar")?.addEventListener("click", async () => {
        const nombre   = document.getElementById("editarAulaNombre").value.trim();
        const edificio = document.getElementById("editarAulaEdificio").value.trim();
        const piso     = document.getElementById("editarAulaPiso").value;

        if (!nombre) { alert("El nombre es requerido"); return; }

        const res = await fetch(`/api/aulas/${aulaEditandoId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Session.token()}`
            },
            body: JSON.stringify({ nombre, edificio, piso: parseInt(piso) || 0 })
        });

        if (res.ok) { modalEditarAula.classList.remove("active"); window.location.reload(); }
        else { alert("Error al editar aula"); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ELIMINAR — compartido
    // ═══════════════════════════════════════════════════════════════════════

    let eliminandoId  = null;
    let eliminandoUrl = null;

    bindCerrar(modalEliminar,
        document.getElementById("btnEliminarCancelar")
    );

    document.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".card");
            eliminandoId  = card.dataset.id;
            eliminandoUrl = card.dataset.url; // e.g. /api/docentes
            modalEliminar.classList.add("active");
        });
    });

    document.getElementById("btnEliminarConfirmar")?.addEventListener("click", async () => {
        const res = await fetch(`${eliminandoUrl}/${eliminandoId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${Session.token()}` }
        });

        if (res.ok) { modalEliminar.classList.remove("active"); window.location.reload(); }
        else { alert("Error al eliminar"); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // EDITAR — abrir modal con datos según página
    // ═══════════════════════════════════════════════════════════════════════

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".card");

            if (modalEditarDocente) {
                docenteEditandoId = card.dataset.id;
                document.getElementById("editarNombre").value = card.dataset.nombre || "";
                document.getElementById("editarEmail").value  = card.dataset.email  || "";
                modalEditarDocente.classList.add("active");
                return;
            }

            if (modalEditarMateria) {
                materiaEditandoId = card.dataset.id;
                document.getElementById("editarMateriaNombre").value = card.dataset.nombre || "";
                document.getElementById("editarMateriaCodigo").value = card.dataset.codigo || "";
                document.getElementById("editarMateriaColor").value  = card.dataset.color  || "#3b82f6";
                modalEditarMateria.classList.add("active");
                return;
            }

            if (modalEditarGrupo) {
                grupoEditandoId = card.dataset.id;
                document.getElementById("editarGrupoNombre").value   = card.dataset.nombre   || "";
                document.getElementById("editarGrupoCantidad").value = card.dataset.cantidad || "";
                modalEditarGrupo.classList.add("active");
                return;
            }

            if (modalEditarAula) {
                aulaEditandoId = card.dataset.id;
                document.getElementById("editarAulaNombre").value   = card.dataset.nombre   || "";
                document.getElementById("editarAulaEdificio").value = card.dataset.edificio || "";
                document.getElementById("editarAulaPiso").value     = card.dataset.piso     || "";
                modalEditarAula.classList.add("active");
                return;
            }
        });
    });
});