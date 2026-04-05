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