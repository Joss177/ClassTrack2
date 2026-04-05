/**
 * horario.js
 * Lógica del módulo de Horarios
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Data ──────────────────────────────────────────────────
  const DAYS   = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const COLORS = ['blue', 'green', 'orange', 'rose', 'teal', 'purple'];

  const TIME_SLOTS = [
    { label: '07:00', start: '07:00', end: '07:50', receso: false },
    { label: '07:50', start: '07:50', end: '08:40', receso: false },
    { label: '08:40', start: '08:40', end: '09:30', receso: false },
    { label: '09:30', start: '09:30', end: '10:20', receso: false },
    { label: '10:20', start: '10:20', end: '10:50', receso: true  },
    { label: '10:50', start: '10:50', end: '11:40', receso: false },
    { label: '11:40', start: '11:40', end: '12:30', receso: false },
    { label: '12:30', start: '12:30', end: '13:20', receso: false },
    { label: '13:20', start: '13:20', end: '14:10', receso: false },
    { label: '14:10', start: '14:10', end: '15:00', receso: false },
    { label: '15:00', start: '15:00', end: '15:50', receso: false },
    { label: '15:50', start: '15:50', end: '16:20', receso: true  },
    { label: '16:20', start: '16:20', end: '17:10', receso: false },
    { label: '17:10', start: '17:10', end: '18:00', receso: false },
  ];

  const HORAS = [
    '07:00','07:50','08:40','09:30',
    '10:50','11:40','12:30',
    '13:20','14:10','15:00','15:50',
    '16:20','17:10','18:00'
  ];

  const AULAS = ['Aula 101', 'Aula 102', 'Aula 201', 'Laboratorio A'];

  let classes = [
    {
      aulaIndex: 0, slotIndex: 0, dayIndex: 0,
      name: 'Matemáticas', group: '10-A', teacher: 'María González', color: 'blue'
    }
  ];

  let pendingCell  = null;
  let selectedColor = 'blue';

  // ── DOM Refs ──────────────────────────────────────────────
  const filterSelect  = document.getElementById('aula-filter');
  const gridContainer = document.getElementById('schedule-container');
  const modal         = document.getElementById('modal-agregar');
  const btnAgregar    = document.getElementById('btn-agregar');
  const btnClose      = document.getElementById('modal-close');
  const btnCancel     = document.getElementById('btn-cancel');
  const btnSave       = document.getElementById('btn-save');
  const formName      = document.getElementById('form-nombre');
  const formGroup     = document.getElementById('form-grupo');
  const formTeacher   = document.getElementById('form-docente');
  const formAula      = document.getElementById('form-aula');
  const formSlot      = document.getElementById('form-slot');
  const formDay       = document.getElementById('form-dia');
  const colorPicker   = document.getElementById('color-picker');

  // ── Modal "Agregar Horario" ───────────────────────────────
  const modalHorario       = document.getElementById('modalHorario');
  const btnSubirHorario    = document.getElementById('btnSubirHorario');
  const btnAgregarClase    = document.getElementById('btnAgregarClase');
  const btnModalHClose     = document.getElementById('modalHorarioClose');
  const btnModalHCancel    = document.getElementById('modalHorarioCancel');
  const btnModalHSave      = document.getElementById('modalHorarioSave');
  const hInicio            = document.getElementById('h-inicio');
  const hFin               = document.getElementById('h-fin');

  // Poblar Hora Inicio y Hora Fin
  if (hInicio && hFin) {
    HORAS.forEach(h => {
      const o1 = document.createElement('option');
      o1.value = h; o1.textContent = h;
      hInicio.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = h; o2.textContent = h;
      hFin.appendChild(o2);
    });
    // Hora Fin por defecto = segunda opción
    if (hFin.options.length > 1) hFin.selectedIndex = 1;
  }

  // Abrir modal Agregar Horario
  if (btnAgregarClase) {
    btnAgregarClase.addEventListener('click', () => {
      if (modalHorario) modalHorario.classList.add('open');
    });
  }

  // Cerrar modal Agregar Horario
  function closeModalHorario() {
    if (modalHorario) modalHorario.classList.remove('open');
  }

  if (btnModalHClose)  btnModalHClose.addEventListener('click', closeModalHorario);
  if (btnModalHCancel) btnModalHCancel.addEventListener('click', closeModalHorario);
  if (modalHorario) {
    modalHorario.addEventListener('click', e => {
      if (e.target === modalHorario) closeModalHorario();
    });
  }

  if (btnModalHSave) {
    btnModalHSave.addEventListener('click', () => {
      // TODO: guardar en el servidor
      // const payload = {
      //   docente:   document.getElementById('h-docente').value,
      //   materia:   document.getElementById('h-materia').value,
      //   grupo:     document.getElementById('h-grupo').value,
      //   aula:      document.getElementById('h-aula').value,
      //   dia:       document.getElementById('h-dia').value,
      //   horaInicio: hInicio.value,
      //   horaFin:    hFin.value,
      // };
      // fetch('/api/horarios', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      closeModalHorario();
    });
  }

  // ── Botón "Subir Horario" → explorador PDF ────────────────
  if (btnSubirHorario) {
    btnSubirHorario.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = '.pdf';
      input.click();
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        console.log('PDF seleccionado:', file.name);
        // TODO: enviar al servidor
        // const fd = new FormData();
        // fd.append('archivo', file);
        // fetch('/api/horarios/subir', { method: 'POST', body: fd });
      });
    });
  }

  // ── Populate filter select ────────────────────────────────
  if (filterSelect) {
    const allOpt = document.createElement('option');
    allOpt.value = 'all'; allOpt.textContent = 'Todas las aulas';
    filterSelect.appendChild(allOpt);
    AULAS.forEach((a, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = a;
      filterSelect.appendChild(opt);
    });
  }

  // ── Populate modal selects ────────────────────────────────
  if (formAula) {
    AULAS.forEach((a, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = a;
      formAula.appendChild(opt);
    });
  }

  if (formSlot) {
    TIME_SLOTS.forEach((s, i) => {
      if (s.receso) return;
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = `${s.start} – ${s.end}`;
      formSlot.appendChild(opt);
    });
  }

  if (formDay) {
    DAYS.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = d;
      formDay.appendChild(opt);
    });
  }

  // ── Color picker ──────────────────────────────────────────
  const COLOR_HEX = {
    blue: '#3b5bdb', green: '#2d9e6b', orange: '#d97706',
    rose: '#be3d6a', teal: '#0e7f96', purple: '#7c3aed'
  };

  if (colorPicker) {
    COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = `color-swatch${c === 'blue' ? ' selected' : ''}`;
      sw.style.background = COLOR_HEX[c];
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        selectedColor = c;
      });
      colorPicker.appendChild(sw);
    });
  }

  // ── Render grid ───────────────────────────────────────────
  function render() {
    if (!filterSelect || !gridContainer) return;

    const filterVal = filterSelect.value;
    gridContainer.innerHTML = '';

    const aulasToShow = filterVal === 'all'
      ? AULAS.map((_, i) => i)
      : [parseInt(filterVal)];

    aulasToShow.forEach(aulaIdx => {
      const section = document.createElement('div');
      section.className = 'aula-section';

      const title = document.createElement('div');
      title.className = 'aula-title';
      title.textContent = AULAS[aulaIdx];
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'schedule-grid';

      const headerEmpty = document.createElement('div');
      headerEmpty.className = 'header-empty';
      grid.appendChild(headerEmpty);

      DAYS.forEach(d => {
        const hd = document.createElement('div');
        hd.className = 'header-day';
        hd.textContent = d;
        grid.appendChild(hd);
      });

      TIME_SLOTS.forEach((slot, slotIdx) => {
        const tl = document.createElement('div');
        tl.className = 'time-label';
        tl.textContent = slot.label;
        grid.appendChild(tl);

        DAYS.forEach((_, dayIdx) => {
          const cell = document.createElement('div');
          cell.className = `grid-cell${slot.receso ? ' receso-cell' : ''}`;

          if (slot.receso) {
            if (dayIdx === 2) {
              const rl = document.createElement('div');
              rl.className = 'receso-label-text';
              rl.textContent = 'RECESO';
              cell.appendChild(rl);
            }
          } else {
            const cls = classes.find(
              c => c.aulaIndex === aulaIdx &&
                   c.slotIndex === slotIdx &&
                   c.dayIndex  === dayIdx
            );
            if (cls) {
              cell.appendChild(buildCard(cls, aulaIdx, slotIdx, dayIdx));
            } else {
              cell.addEventListener('click', () => openModal(aulaIdx, slotIdx, dayIdx));
            }
          }

          grid.appendChild(cell);
        });
      });

      section.appendChild(grid);
      gridContainer.appendChild(section);
    });
  }

  function buildCard(cls, aulaIdx, slotIdx, dayIdx) {
    const slot = TIME_SLOTS[slotIdx];
    const card = document.createElement('div');
    card.className = `class-card ${cls.color}`;
    card.innerHTML = `
      <div class="class-card-name">${cls.name}</div>
      <div class="class-card-group">${cls.group}</div>
      <div class="class-card-teacher">${cls.teacher}</div>
      <div class="class-card-time">${slot.start} – ${slot.end}</div>
    `;
    card.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`¿Eliminar "${cls.name}"?`)) {
        classes = classes.filter(
          c => !(c.aulaIndex === aulaIdx && c.slotIndex === slotIdx && c.dayIndex === dayIdx)
        );
        render();
      }
    });
    return card;
  }

  // ── Modal grid (agregar clase en celda) ───────────────────
  function openModal(aulaIdx, slotIdx, dayIdx) {
    if (!modal) return;
    pendingCell = { aulaIdx, slotIdx, dayIdx };
    formAula.value    = aulaIdx;
    formSlot.value    = slotIdx;
    formDay.value     = dayIdx;
    formName.value    = '';
    formGroup.value   = '';
    formTeacher.value = '';
    selectedColor     = 'blue';
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === 'blue');
    });
    modal.classList.add('open');
    formName.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    pendingCell = null;
  }

  function saveClass() {
    const name    = formName.value.trim();
    const group   = formGroup.value.trim();
    const teacher = formTeacher.value.trim();
    const aulaIdx = parseInt(formAula.value);
    const slotIdx = parseInt(formSlot.value);
    const dayIdx  = parseInt(formDay.value);

    if (!name) { formName.focus(); return; }

    classes = classes.filter(
      c => !(c.aulaIndex === aulaIdx && c.slotIndex === slotIdx && c.dayIndex === dayIdx)
    );
    classes.push({ aulaIndex: aulaIdx, slotIndex: slotIdx, dayIndex: dayIdx,
                   name, group, teacher, color: selectedColor });
    closeModal();
    render();
  }

  // ── Events ────────────────────────────────────────────────
  if (filterSelect) filterSelect.addEventListener('change', render);
  if (btnAgregar)   btnAgregar.addEventListener('click', () => openModal(0, 0, 0));
  if (btnClose)     btnClose.addEventListener('click', closeModal);
  if (btnCancel)    btnCancel.addEventListener('click', closeModal);
  if (btnSave)      btnSave.addEventListener('click', saveClass);

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeModalHorario();
    }
  });

  // ── Init ──────────────────────────────────────────────────
  render();

});