/**
 * horarios.js — Módulo de Horarios dinámico
 */

document.addEventListener('DOMContentLoaded', async () => {

  /* ══════════════════════════════════════════════════════════
     CONSTANTES
  ══════════════════════════════════════════════════════════ */

  const DIA_SEMANA_MAP = { 1:'lunes', 2:'martes', 3:'miercoles', 4:'jueves', 5:'viernes' };
  const DIA_STRING_MAP = { lunes:1, martes:2, miercoles:3, jueves:4, viernes:5 };

  const TIME_SLOTS = [
    { start:'07:00', end:'07:50', receso:false },
    { start:'07:50', end:'08:40', receso:false },
    { start:'08:40', end:'09:30', receso:false },
    { start:'09:30', end:'10:20', receso:false },
    { start:'10:20', end:'10:50', receso:true  },
    { start:'10:50', end:'11:40', receso:false },
    { start:'11:40', end:'12:30', receso:false },
    { start:'12:30', end:'13:20', receso:false },
    { start:'13:20', end:'14:10', receso:false },
    { start:'14:10', end:'15:00', receso:false },
    { start:'15:00', end:'15:50', receso:false },
    { start:'15:50', end:'16:20', receso:true  },
    { start:'16:20', end:'17:10', receso:false },
    { start:'17:10', end:'18:00', receso:false },
  ];

  const SLOTS_ACTIVOS = TIME_SLOTS.filter(s => !s.receso);
  const DIAS_LABEL    = { 1:'Lunes', 2:'Martes', 3:'Miércoles', 4:'Jueves', 5:'Viernes' };

  // ── Helpers para parsear data-hora="HH:MM-HH:MM" de forma segura ──
  // El formato es "07:00-07:50", que contiene '-' también en las horas.
  // La única forma segura es buscar el '-' que está entre los dos tiempos,
  // es decir el que va después de los primeros 5 caracteres.
  function parsearDataHora(dataHora) {
    // "07:00-07:50"  →  inicio="07:00", fin="07:50"
    const separador = dataHora.indexOf('-', 5);   // buscar '-' a partir del índice 5
    if (separador === -1) return { inicio: dataHora, fin: dataHora };
    return {
      inicio: dataHora.slice(0, separador),
      fin:    dataHora.slice(separador + 1),
    };
  }

  /* ══════════════════════════════════════════════════════════
     DETECCIÓN DE MODO
  ══════════════════════════════════════════════════════════ */

  const wrapper   = document.querySelector('.horario-wrapper');
  const modo      = wrapper?.dataset.modo || null;
  let   entidadId = null;

  /* ══════════════════════════════════════════════════════════
     SELECTOR DE ENTIDAD
  ══════════════════════════════════════════════════════════ */

  const selectorEntidad = document.getElementById('selectorEntidad');
  const tituloHorario   = document.getElementById('tituloHorario');

  selectorEntidad?.addEventListener('change', async () => {
    entidadId = selectorEntidad.value;
    if (wrapper) wrapper.dataset.entidadId = entidadId;
    const nombre = selectorEntidad.options[selectorEntidad.selectedIndex].text;
    if (tituloHorario) tituloHorario.textContent = nombre;
    localStorage.setItem(`horario_selector_${modo}`, entidadId);
    await cargarYRenderizarHorarios();
  });

  /* ══════════════════════════════════════════════════════════
     CATÁLOGOS
  ══════════════════════════════════════════════════════════ */

  let catalogos = { docentes:[], materias:[], grupos:[], aulas:[] };

  async function cargarCatalogos() {
    try {
      const [docentes, materias, grupos, aulas] = await Promise.all([
        fetch('/api/docentes').then(r => r.json()),
        fetch('/api/materias').then(r => r.json()),
        fetch('/api/grupos').then(r => r.json()),
        fetch('/api/aulas').then(r => r.json()),
      ]);
      catalogos = { docentes, materias, grupos, aulas };
    } catch (e) {
      console.error('Error cargando catálogos', e);
    }
  }

  /* ══════════════════════════════════════════════════════════
     RENDER — CARDS
  ══════════════════════════════════════════════════════════ */

  function limpiarCards() {
    document.querySelectorAll('.casilla').forEach(c => c.innerHTML = '');
  }
  function crearCard(h) {
    const card = document.createElement('div');
    card.className = 'clase-card';

    card.dataset.horarioId  = h.id;
    card.dataset.nombre     = h.materia_nombre;
    card.dataset.clave      = h.materia_clave;
    card.dataset.color      = h.materia_color;
    card.dataset.docente    = h.docente_nombre;
    card.dataset.grupo      = h.grupo_nombre;
    card.dataset.aula       = h.aula_nombre;
    card.dataset.docenteId  = h.docente_id  || '';
    card.dataset.materiaId  = h.materia_id  || '';
    card.dataset.grupoId    = h.grupo_id    || '';
    card.dataset.aulaId     = h.aula_id     || '';
    card.dataset.diaSemana  = h.dia_semana;
    card.dataset.horaInicio = h.hora_inicio;
    card.dataset.horaFin    = h.hora_fin;

    // ── Aplicar color: borde izquierdo + fondo suave ──
    const color = h.materia_color || '#3b82f6';
    card.style.borderLeftColor = color;
    card.style.backgroundColor = color + '55';   // RR~13 % de opacidad

    card.innerHTML = `
      <span class="clase-clave">${h.materia_clave}</span>
      <span class="clase-nombre">${h.materia_nombre}</span>
      <span class="clase-grupo">${h.grupo_nombre}</span>
    `;

    return card;
  }

  /**
   * insertarCard — coloca la card en CADA casilla que cubre el bloque.
   *
   * El PDF fusiona bloques consecutivos, por lo que un horario puede tener
   * hora_inicio="07:00" y hora_fin="08:40" (dos slots de 50 min).
   * En ese caso se inserta la card (con texto completo) solo en el primer slot
   * y se marca el resto con la clase "casilla-ocupada" para indicar continuidad.
   */
  function insertarCard(h) {
    const diaStr = DIA_SEMANA_MAP[h.dia_semana];
    if (!diaStr) return;

    const idxInicio = SLOTS_ACTIVOS.findIndex(s => s.start === h.hora_inicio);
    const idxFin    = SLOTS_ACTIVOS.findIndex(s => s.end   === h.hora_fin);

    if (idxInicio === -1 || idxFin === -1) {
      console.warn('Horas no encontradas', h);
      return;
    }

    for (let i = idxInicio; i <= idxFin; i++) {

      const slot = SLOTS_ACTIVOS[i];
      const horaAttr = `${slot.start}-${slot.end}`;

      const casilla = document.querySelector(
        `.casilla[data-dia="${diaStr}"][data-hora="${horaAttr}"]`
      );

      if (!casilla) continue;
      if (casilla.querySelector(`[data-horario-id="${h.id}"]`)) continue;

      let card;

      if (i === idxInicio) {

        card = crearCard(h);
      } else {

        card = document.createElement('div');
        card.className = 'clase-card clase-card-cont';
        card.style.backgroundColor = (h.materia_color || '#3b82f6') + '33';
      }

      casilla.appendChild(card);

      if (i === idxInicio) {
        activarCard(card);
      }
    }
  }
  
  async function cargarYRenderizarHorarios() {
    if (!modo || !entidadId) return;
    limpiarCards();

    try {
      const horarios = await fetch(`/api/horarios/${modo}/${entidadId}`).then(r => r.json());
      horarios.forEach(insertarCard);
    } catch (e) {
      console.error('Error cargando horarios', e);
    }
  }

  /* ══════════════════════════════════════════════════════════
     MODAL AGREGAR / EDITAR
  ══════════════════════════════════════════════════════════ */

  const modalHorario    = document.getElementById('modalHorario');
  const btnAgregarClase = document.getElementById('btnAgregarClase');
  const btnModalClose   = document.getElementById('modalHorarioClose');
  const btnModalCancel  = document.getElementById('modalHorarioCancel');
  const btnModalSave    = document.getElementById('modalHorarioSave');
  const modalTitle      = modalHorario?.querySelector('.modal-title');

  const hDocente = document.getElementById('h-docente');
  const hMateria = document.getElementById('h-materia');
  const hGrupo   = document.getElementById('h-grupo');
  const hAula    = document.getElementById('h-aula');
  const hDia     = document.getElementById('h-dia');
  const hInicio  = document.getElementById('h-inicio');
  const hFin     = document.getElementById('h-fin');

  let editandoId = null;

  function poblarSelect(select, items, val, labelFn) {
    const placeholder = select.querySelector('option[disabled]');
    select.innerHTML = '';
    if (placeholder) select.appendChild(placeholder.cloneNode(true));
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[val];
      opt.textContent = labelFn(item);
      select.appendChild(opt);
    });
  }

  function poblarHoraInicio() {
    hInicio.innerHTML = '<option value="" disabled selected>Seleccionar</option>';
    SLOTS_ACTIVOS.forEach(slot => {
      const opt = document.createElement('option');
      opt.value = slot.start;
      opt.textContent = slot.start;
      hInicio.appendChild(opt);
    });
  }

  function actualizarHoraFin() {
    const inicio = hInicio.value;
    hFin.innerHTML = '<option value="" disabled selected>Seleccionar</option>';
    if (!inicio) return;

    const idx = TIME_SLOTS.findIndex(s => s.start === inicio);
    let primero = null;

    for (let i = idx + 1; i < TIME_SLOTS.length; i++) {
      if (TIME_SLOTS[i].receso) continue;
      const opt = document.createElement('option');
      opt.value = TIME_SLOTS[i].start;
      opt.textContent = TIME_SLOTS[i].start;
      hFin.appendChild(opt);
      if (!primero) primero = opt;
    }
    if (primero) primero.selected = true;
  }

  function poblarCatalogosModal() {
    poblarSelect(hDocente, catalogos.docentes, 'id', d => `${d.nombre} ${d.apellido ?? ''}`.trim());
    poblarSelect(hMateria, catalogos.materias, 'id', m => m.nombre);
    poblarSelect(hGrupo,   catalogos.grupos,   'id', g => g.nombre);
    poblarSelect(hAula,    catalogos.aulas,    'id', a => a.nombre);
  }

  function openModal(prefill = null) {
    editandoId = null;
    poblarCatalogosModal();
    poblarHoraInicio();
    hFin.innerHTML = '<option value="" disabled selected>Seleccionar</option>';

    if (entidadId) {
      if (modo === 'aula')    hAula.value    = entidadId;
      if (modo === 'docente') hDocente.value = entidadId;
      if (modo === 'grupo')   hGrupo.value   = entidadId;
    }

    if (prefill) {
      editandoId         = prefill.horarioId;
      hDocente.value     = prefill.docenteId;
      hMateria.value     = prefill.materiaId;
      hGrupo.value       = prefill.grupoId;
      hAula.value        = prefill.aulaId;
      hDia.value         = DIA_SEMANA_MAP[prefill.diaSemana] || 'lunes';
      hInicio.value      = prefill.horaInicio;
      actualizarHoraFin();
      hFin.value         = prefill.horaFin;
      if (modalTitle) modalTitle.textContent = 'Editar Horario';
    } else {
      if (modalTitle) modalTitle.textContent = 'Agregar Horario';
    }

    modalHorario.classList.add('active');
  }

  function closeModal() {
    modalHorario.classList.remove('active');
    editandoId = null;
  }

  async function guardarHorario() {
    const data = {
      docente_id:  parseInt(hDocente.value) || null,
      materia_id:  parseInt(hMateria.value) || null,
      grupo_id:    parseInt(hGrupo.value)   || null,
      aula_id:     parseInt(hAula.value)    || null,
      dia_semana:  DIA_STRING_MAP[hDia.value] || 1,
      hora_inicio: hInicio.value,
      hora_fin:    hFin.value,
    };

    if (!data.docente_id || !data.materia_id || !data.grupo_id ||
        !data.aula_id    || !data.hora_inicio || !data.hora_fin) {
      alert('Completa todos los campos');
      return;
    }

    try {
      const url    = editandoId ? `/api/horarios/${editandoId}` : '/api/horarios';
      const method = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      closeModal();
      await cargarYRenderizarHorarios();

    } catch (e) {
      console.error('Error guardando horario', e);
      alert('Ocurrió un error al guardar. Intenta de nuevo.');
    }
  }

  btnAgregarClase?.addEventListener('click', () => openModal());
  btnModalClose?.addEventListener('click', closeModal);
  btnModalCancel?.addEventListener('click', closeModal);
  btnModalSave?.addEventListener('click', guardarHorario);
  hInicio.addEventListener('change', actualizarHoraFin);
  modalHorario?.addEventListener('click', e => { if (e.target === modalHorario) closeModal(); });

  /* ══════════════════════════════════════════════════════════
     MODAL DETALLES
  ══════════════════════════════════════════════════════════ */

  const overlay     = document.getElementById('hmodalOverlay');
  const btnClose    = document.getElementById('hmodalClose');
  const btnEliminar = document.getElementById('hmodalEliminar');
  const btnEditar   = document.getElementById('hmodalEditar');

  const elNombre  = document.getElementById('hmodalNombre');
  const elClave   = document.getElementById('hmodalClave');
  const elColor   = document.getElementById('hmodalColor');
  const elDocente = document.getElementById('hmodalDocente');
  const elGrupo   = document.getElementById('hmodalGrupo');
  const elAula    = document.getElementById('hmodalAula');
  const elDia     = document.getElementById('hmodalDia');
  const elHorario = document.getElementById('hmodalHorario');

  let cardActiva = null;

  function abrirModalDetalle(card) {
    cardActiva = card;
    const d = card.dataset;

    if (elColor)   elColor.style.backgroundColor = d.color || '#3b82f6';
    if (elNombre)  elNombre.textContent  = d.nombre  || '—';
    if (elClave)   elClave.textContent   = d.clave   || '—';
    if (elDocente) elDocente.textContent = d.docente || '—';
    if (elGrupo)   elGrupo.textContent   = d.grupo   || '—';
    if (elAula)    elAula.textContent    = d.aula    || '—';
    if (elDia)     elDia.textContent     = DIAS_LABEL[d.diaSemana] || '—';
    if (elHorario) elHorario.textContent = `${d.horaInicio} - ${d.horaFin}`;

    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function cerrarModalDetalle() {
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
    cardActiva = null;
  }

  btnClose?.addEventListener('click', cerrarModalDetalle);
  overlay?.addEventListener('click', e => { if (e.target === overlay) cerrarModalDetalle(); });

  // ── Modal Eliminar ──
  const modalEliminar       = document.getElementById('modalEliminar');
  const btnEliminarCancelar = document.getElementById('btnEliminarCancelar');
  const btnEliminarConfirmar= document.getElementById('btnEliminarConfirmar');
  const btnVaciarTabla      = document.getElementById('btnVaciarTabla');

  let accionEliminar     = null;
  let horarioIdPendiente = null;

  btnEliminar?.addEventListener('click', () => {
    if (!cardActiva) return;
    horarioIdPendiente = cardActiva.dataset.horarioId;
    accionEliminar     = 'horario';
    cerrarModalDetalle();
    modalEliminar.classList.add('active');
  });

  btnVaciarTabla?.addEventListener('click', () => {
    accionEliminar     = 'vaciar';
    horarioIdPendiente = null;
    modalEliminar.classList.add('active');
  });

  btnEliminarCancelar?.addEventListener('click', () => {
    accionEliminar     = null;
    horarioIdPendiente = null;
    modalEliminar.classList.remove('active');
  });

  btnEliminarConfirmar?.addEventListener('click', async () => {
    modalEliminar.classList.remove('active');

    try {
      if (accionEliminar === 'horario' && horarioIdPendiente) {
        const res  = await fetch(`/api/horarios/${horarioIdPendiente}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(`Error al eliminar horario: ${res.status}`);

      } else if (accionEliminar === 'vaciar') {
        const res  = await fetch('/api/horarios/vaciar-todo', { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(`Error al vaciar: ${res.status}`);
      }

      await cargarYRenderizarHorarios();

    } catch (e) {
      console.error('Error al eliminar:', e);
      alert('No se pudo eliminar. Intenta de nuevo.');
    } finally {
      accionEliminar     = null;
      horarioIdPendiente = null;
    }
  });



  btnEditar?.addEventListener('click', () => {
    if (!cardActiva) return;
    const d = cardActiva.dataset;
    cerrarModalDetalle();
    openModal({
      horarioId:  d.horarioId,
      docenteId:  d.docenteId,
      materiaId:  d.materiaId,
      grupoId:    d.grupoId,
      aulaId:     d.aulaId,
      diaSemana:  parseInt(d.diaSemana),
      horaInicio: d.horaInicio,
      horaFin:    d.horaFin,
    });
  });

  /* ══════════════════════════════════════════════════════════
     DRAG & DROP + CLICK → modal detalle
  ══════════════════════════════════════════════════════════ */

  let origenCasilla = null;
  let isDragging    = false;

  function activarCard(card) {
    // Las cards de continuación no son interactivas
    if (card.classList.contains('clase-card-cont')) return;

    card.setAttribute('draggable', 'true');

    card.addEventListener('click', function (e) {
      if (isDragging) return;
      e.stopPropagation();
      abrirModalDetalle(card);
    });

    card.addEventListener('dragstart', function (e) {
      isDragging    = true;
      origenCasilla = card.closest('.casilla');
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', function () {
      card.classList.remove('dragging');
      origenCasilla = null;
      document.querySelectorAll('.casilla').forEach(c => c.classList.remove('drag-over'));
      setTimeout(() => { isDragging = false; }, 50);
    });
  }

  document.querySelectorAll('.casilla').forEach(casilla => {

    casilla.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      casilla.classList.add('drag-over');
    });

    casilla.addEventListener('dragleave', () => casilla.classList.remove('drag-over'));

    casilla.addEventListener('drop', async e => {
      e.preventDefault();
      casilla.classList.remove('drag-over');
      if (!origenCasilla || origenCasilla === casilla) return;

      const cardOrigen  = origenCasilla.querySelector('.clase-card:not(.clase-card-cont)');
      const cardDestino = casilla.querySelector('.clase-card:not(.clase-card-cont)');
      if (!cardOrigen) return;

      // Swap visual inmediato
      if (cardDestino) {
        origenCasilla.appendChild(cardDestino);
        casilla.appendChild(cardOrigen);
        activarCard(cardDestino);
      } else {
        casilla.appendChild(cardOrigen);
      }
      activarCard(cardOrigen);

      // ── Parsear data-hora de forma segura (formato "HH:MM-HH:MM") ──
      const { inicio: nuevoInicio, fin: nuevoFin } = parsearDataHora(casilla.dataset.hora);
      const nuevoDia  = DIA_STRING_MAP[casilla.dataset.dia];
      const horarioId = cardOrigen.dataset.horarioId;

      if (horarioId && nuevoDia && nuevoInicio && nuevoFin) {
        try {
          const res = await fetch(`/api/horarios/${horarioId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              docente_id:  parseInt(cardOrigen.dataset.docenteId) || null,
              materia_id:  parseInt(cardOrigen.dataset.materiaId) || null,
              grupo_id:    parseInt(cardOrigen.dataset.grupoId)   || null,
              aula_id:     parseInt(cardOrigen.dataset.aulaId)    || null,
              dia_semana:  nuevoDia,
              hora_inicio: nuevoInicio,
              hora_fin:    nuevoFin,
            }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          cardOrigen.dataset.diaSemana  = nuevoDia;
          cardOrigen.dataset.horaInicio = nuevoInicio;
          cardOrigen.dataset.horaFin    = nuevoFin;

        } catch (err) {
          console.error('Error al mover el horario', err);
          await cargarYRenderizarHorarios();
        }
      }
    });
  });

  /* ══════════════════════════════════════════════════════════
    SUBIR HORARIO (PDF)
  ══════════════════════════════════════════════════════════ */

  const btnSubirHorario   = document.getElementById('btnSubirHorario');
  const inputSubirHorario = document.getElementById('inputSubirHorario');

  btnSubirHorario?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputSubirHorario?.click();
  });

  inputSubirHorario?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;

  inputSubirHorario.value = '';  // resetear ANTES del fetch para evitar doble disparo

  const formData = new FormData();
  formData.append('archivo', file);

  try {
    const res  = await fetch('/api/horarios/subir-pdf', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

    let mensaje = `✅ Horario procesado.\n${data.insertados} clases insertadas.`;

    if (data.errores && data.errores.length > 0) {
      mensaje += `\n\n⚠️ No se encontraron (${data.errores.length}):\n`;
      mensaje += data.errores.slice(0, 10).join('\n');
      if (data.errores.length > 10) mensaje += `\n...y ${data.errores.length - 10} más.`;
    }

    alert(mensaje);
    await cargarYRenderizarHorarios();

  } catch (err) {
    console.error(err);
    alert(`❌ Error al procesar el PDF:\n${err.message}`);
  }
});

  /* ══════════════════════════════════════════════════════════
     ESCAPE GLOBAL
  ══════════════════════════════════════════════════════════ */

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      cerrarModalDetalle();
    }
  });

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  await cargarCatalogos();

  const guardado = localStorage.getItem(`horario_selector_${modo}`);
  if (guardado && selectorEntidad) {
    selectorEntidad.value = guardado;
    if (selectorEntidad.value === guardado) {
      entidadId = guardado;
      if (wrapper) wrapper.dataset.entidadId = entidadId;
      const nombre = selectorEntidad.options[selectorEntidad.selectedIndex]?.text || '';
      if (tituloHorario) tituloHorario.textContent = nombre;
      await cargarYRenderizarHorarios();
    }
  }

});

