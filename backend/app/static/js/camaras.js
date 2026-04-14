document.addEventListener('DOMContentLoaded', () => {

  const modal = document.getElementById('modalCamara');
  const btnClose = document.getElementById('modalCamaraClose');
  const btnCancelar = document.getElementById('btnCamaraCancelar');
  const btnConfirmar = document.getElementById('btnCamaraConfirmar');

  const selectAula = document.getElementById('camara-aula');
  const selectEstado = document.getElementById('camara-estado');

  const toast = document.getElementById('toastCamara');
  const toastClose = document.getElementById('toastClose');

  // ─── Cerrar modal ─────────────────
  function cerrarModal() {
    modal.classList.remove('active');
    selectAula.selectedIndex = 0;
    selectEstado.value = 'activa';
  }

  btnClose.addEventListener('click', cerrarModal);
  btnCancelar.addEventListener('click', cerrarModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });

  // ─── Toast ────────────────────────
  function mostrarToast(mensaje = "Guardado correctamente") {
    document.getElementById('toastMensaje').textContent = mensaje;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  toastClose.addEventListener('click', () => {
    toast.classList.remove('show');
  });

  // ─── Guardar cámara ───────────────
  btnConfirmar.addEventListener('click', async () => {

    const aula_id = selectAula.value;
    const estado = selectEstado.value;

    if (!aula_id) {
      alert('Selecciona un aula');
      return;
    }

    try {
      const res = await fetch('/api/camaras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aula_id: parseInt(aula_id),
          estado: estado
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Error');
      }

      cerrarModal();
      mostrarToast("Cámara agregada correctamente");

      // Opcional: recargar después de mostrar toast
      setTimeout(() => {
        location.reload();
      }, 1500);

    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    }

  });

});