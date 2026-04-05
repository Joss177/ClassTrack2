/**
 * horario.js
 * Lógica del módulo de Horarios
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ── Data ─────────────────────────────────────────
  const DAYS   = ['Lunes','Martes','Miércoles','Jueves','Viernes'];

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
    { start:'17:10', end:'18:00', receso:false }
  ];

  const SLOTS_ACTIVOS = TIME_SLOTS.filter(s => !s.receso);

  // ── Catálogos ────────────────────────────────────
  let catalogos = { docentes:[], materias:[], grupos:[], aulas:[] };

  async function cargarCatalogos(){
    try{

      const [docentes,materias,grupos,aulas] = await Promise.all([
        fetch('/api/docentes').then(r=>r.json()),
        fetch('/api/materias').then(r=>r.json()),
        fetch('/api/grupos').then(r=>r.json()),
        fetch('/api/aulas').then(r=>r.json())
      ]);

      catalogos = { docentes,materias,grupos,aulas };

    }catch(e){
      console.error("Error cargando catálogos",e);
    }
  }

  function poblarSelect(select,items,val,labelFn){

    const placeholder = select.querySelector('option[disabled]');
    select.innerHTML = '';
    if(placeholder) select.appendChild(placeholder);

    items.forEach(item=>{
      const opt = document.createElement('option');
      opt.value = item[val];
      opt.textContent = labelFn(item);
      select.appendChild(opt);
    });

  }

  // ── DOM refs ─────────────────────────────────────
  const modalHorario    = document.getElementById("modalHorario");
  const btnAgregarClase = document.getElementById("btnAgregarClase");
  const btnModalClose   = document.getElementById("modalHorarioClose");
  const btnModalCancel  = document.getElementById("modalHorarioCancel");
  const btnModalSave    = document.getElementById("modalHorarioSave");

  const hDocente = document.getElementById("h-docente");
  const hMateria = document.getElementById("h-materia");
  const hGrupo   = document.getElementById("h-grupo");
  const hAula    = document.getElementById("h-aula");
  const hDia     = document.getElementById("h-dia");
  const hInicio  = document.getElementById("h-inicio");
  const hFin     = document.getElementById("h-fin");

  // ── Poblar hora inicio ───────────────────────────
  function poblarHoraInicio(){

    hInicio.innerHTML = '<option value="" disabled selected>Seleccionar</option>';

    SLOTS_ACTIVOS.forEach(slot=>{

      const opt = document.createElement("option");
      opt.value = slot.start;
      opt.textContent = slot.start;

      hInicio.appendChild(opt);

    });

  }

  // ── Actualizar hora fin ──────────────────────────
  function actualizarHoraFin(){

    const inicio = hInicio.value;

    hFin.innerHTML = '<option value="" disabled selected>Seleccionar</option>';

    if(!inicio) return;

    const inicioIndex = TIME_SLOTS.findIndex(s=>s.start===inicio);

    let primerFin = null;

    for(let i = inicioIndex + 1; i < TIME_SLOTS.length; i++){

      if(TIME_SLOTS[i].receso) continue;

      const opt = document.createElement("option");
      opt.value = TIME_SLOTS[i].start;
      opt.textContent = TIME_SLOTS[i].start;

      hFin.appendChild(opt);

      if(!primerFin) primerFin = opt;

    }

    if(primerFin) primerFin.selected = true;

  }

  // ── Poblar catálogos en modal ────────────────────
  function poblarCatalogosModal(){

    poblarSelect(
      hDocente,
      catalogos.docentes,
      "id",
      d => `${d.nombre} ${d.apellido ?? ''}`
    );

    poblarSelect(
      hMateria,
      catalogos.materias,
      "id",
      m => m.nombre
    );

    poblarSelect(
      hGrupo,
      catalogos.grupos,
      "id",
      g => g.nombre
    );

    poblarSelect(
      hAula,
      catalogos.aulas,
      "id",
      a => a.nombre
    );

  }

  // ── Abrir modal ──────────────────────────────────
  function openModal(){

    modalHorario.classList.add("active");

    poblarCatalogosModal();
    poblarHoraInicio();

    hFin.innerHTML = '<option value="" disabled selected>Seleccionar</option>';

  }

  // ── Cerrar modal ─────────────────────────────────
  function closeModal(){

    modalHorario.classList.remove("active");

  }

  // ── Guardar horario ──────────────────────────────
  async function guardarHorario(){

    const data = {
      docente_id : hDocente.value,
      materia_id : hMateria.value,
      grupo_id   : hGrupo.value,
      aula_id    : hAula.value,
      dia_semana : hDia.selectedIndex + 1,
      hora_inicio: hInicio.value,
      hora_fin   : hFin.value
    };

    if(
      !data.docente_id ||
      !data.materia_id ||
      !data.grupo_id   ||
      !data.aula_id    ||
      !data.hora_inicio||
      !data.hora_fin
    ){
      alert("Completa todos los campos");
      return;
    }

    try{

      await fetch('/api/horarios',{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });

      closeModal();

    }catch(e){
      console.error("Error guardando horario",e);
    }

  }

  // ── Eventos ──────────────────────────────────────
  btnAgregarClase?.addEventListener("click",openModal);
  btnModalClose?.addEventListener("click",closeModal);
  btnModalCancel?.addEventListener("click",closeModal);

  btnModalSave?.addEventListener("click",guardarHorario);

  hInicio.addEventListener("change",actualizarHoraFin);

  // ── Init ─────────────────────────────────────────
  await cargarCatalogos();

  const btnSubirHorario = document.getElementById("btnSubirHorario");
  const inputSubirHorario = document.getElementById("inputSubirHorario");

  // abrir explorador
  btnSubirHorario.addEventListener("click", () => {
    inputSubirHorario.click();
  });

  // cuando el usuario selecciona archivo
  inputSubirHorario.addEventListener("change", async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    console.log("Archivo seleccionado:", file.name);

    const formData = new FormData();
    formData.append("archivo", file);

    try {

      const res = await fetch("/api/horarios/importar", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      alert("Horario cargado correctamente");

    } catch (err) {

      console.error(err);
      alert("Error al subir archivo");

    }

  });

  modalHorario?.addEventListener('click', e => {
    if (e.target === modalHorario) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

});

/* =============================================
   HORARIO — horario.js
   El modo oscuro lo maneja el layout.js global.
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Casillas (sin acción por ahora) ── */
  const casillas = document.querySelectorAll('.casilla');
  casillas.forEach(function (casilla) {
    casilla.addEventListener('click', function () {
      // Sin acción por el momento.
      // Datos disponibles para uso futuro:
      // const dia  = casilla.dataset.dia;
      // const hora = casilla.dataset.hora;
    });
  });

});


/* =============================================
   HORARIO — horario.js
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ══════════════════════════════════════════
     MODAL DETALLES
  ══════════════════════════════════════════ */
  const overlay       = document.getElementById('hmodalOverlay');
  const btnClose      = document.getElementById('hmodalClose');
  const btnEliminar   = document.getElementById('hmodalEliminar');
  const btnEditar     = document.getElementById('hmodalEditar');

  // Elementos del modal
  const elNombre      = document.getElementById('hmodalNombre');
  const elClave       = document.getElementById('hmodalClave');
  const elDocente     = document.getElementById('hmodalDocente');
  const elGrupo       = document.getElementById('hmodalGrupo');
  const elAula        = document.getElementById('hmodalAula');
  const elDia         = document.getElementById('hmodalDia');
  const elHorario     = document.getElementById('hmodalHorario');

  // Card actualmente abierta en el modal
  let cardActiva = null;

  function abrirModal(card, casilla) {
    cardActiva = card;

    // Leer datos del card
    const clave   = card.querySelector('.clase-clave')?.textContent.trim()  || '—';
    const nombre  = card.querySelector('.clase-nombre')?.textContent.trim() || '—';
    const grupo   = card.querySelector('.clase-grupo')?.textContent.trim()  || '—';
    const aula    = card.querySelector('.clase-aula')?.textContent.trim()   || '—';

    // Leer datos de la casilla (data attributes)
    const dia     = casilla?.dataset.dia   || '—';
    const hora    = casilla?.dataset.hora  || '—';

    // Separar grupo y docente si vienen juntos con "•"
    // Ej: "10-A • María González"
    let grupoTexto   = grupo;
    let docenteTexto = '—';
    if (grupo.includes('•')) {
      const partes = grupo.split('•');
      grupoTexto   = partes[0].trim();
      docenteTexto = partes[1].trim();
    }

    // Capitalizar día
    const diaCapital = dia.charAt(0).toUpperCase() + dia.slice(1);

    // Poblar modal
    elNombre.textContent  = nombre;
    elClave.textContent   = clave;
    elDocente.textContent = docenteTexto;
    elGrupo.textContent   = grupoTexto;
    elAula.textContent    = aula;
    elDia.textContent     = diaCapital;
    elHorario.textContent = hora.replace('-', ' - ');

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function cerrarModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    cardActiva = null;
  }

  // Cerrar con botón X
  btnClose?.addEventListener('click', cerrarModal);

  // Cerrar al hacer clic en el overlay (fuera del modal)
  overlay?.addEventListener('click', function (e) {
    if (e.target === overlay) cerrarModal();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarModal();
  });

  // Botón Eliminar
  btnEliminar?.addEventListener('click', function () {
    if (!cardActiva) return;
    const casilla = cardActiva.closest('.casilla');
    cardActiva.remove();
    cerrarModal();
    // Aquí puedes agregar lógica adicional: llamada a API, etc.
  });

  // Botón Editar (placeholder — conectar con tu lógica)
  btnEditar?.addEventListener('click', function () {
    cerrarModal();
    // Aquí puedes abrir tu modal de edición, pasar datos, etc.
  });

  /* ══════════════════════════════════════════
     ACTIVAR CLICK EN CARDS (modal)
     y DRAG & DROP
  ══════════════════════════════════════════ */
  let origenCasilla = null;
  let isDragging    = false;

  function activarCard(card) {
    card.setAttribute('draggable', 'true');

    // Click → abrir modal (solo si no fue un drag)
    card.addEventListener('click', function (e) {
      if (isDragging) return;
      e.stopPropagation();
      const casilla = card.closest('.casilla');
      abrirModal(card, casilla);
    });

    // Drag start
    card.addEventListener('dragstart', function (e) {
      isDragging    = true;
      origenCasilla = card.closest('.casilla');
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('dragging'), 0);
    });

    // Drag end
    card.addEventListener('dragend', function () {
      card.classList.remove('dragging');
      origenCasilla = null;
      document.querySelectorAll('.casilla').forEach(c => c.classList.remove('drag-over'));
      // Pequeño delay para que el click no se dispare después del drop
      setTimeout(() => { isDragging = false; }, 50);
    });
  }

  // Inicializar cards existentes
  document.querySelectorAll('.clase-card').forEach(activarCard);

  /* ══════════════════════════════════════════
     DRAG & DROP — casillas destino
  ══════════════════════════════════════════ */
  document.querySelectorAll('.casilla').forEach(function (casilla) {

    casilla.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      casilla.classList.add('drag-over');
    });

    casilla.addEventListener('dragleave', function () {
      casilla.classList.remove('drag-over');
    });

    casilla.addEventListener('drop', function (e) {
      e.preventDefault();
      casilla.classList.remove('drag-over');

      if (!origenCasilla || origenCasilla === casilla) return;

      const cardOrigen  = origenCasilla.querySelector('.clase-card');
      const cardDestino = casilla.querySelector('.clase-card');

      if (!cardOrigen) return;

      if (cardDestino) {
        origenCasilla.appendChild(cardDestino);
        casilla.appendChild(cardOrigen);
        activarCard(cardDestino);
      } else {
        casilla.appendChild(cardOrigen);
      }

      activarCard(cardOrigen);
    });
  });

});