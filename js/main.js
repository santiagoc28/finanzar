// ============================================================
// MAIN — Punto de entrada de la app
// ============================================================

let _pollingInterval = null;

function startPolling() {
  if (_pollingInterval) clearInterval(_pollingInterval);
  _pollingInterval = setInterval(refreshAll, 60000);
}

// Feature 15: pausar polling cuando la pestaña está en background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(_pollingInterval);
    _pollingInterval = null;
  } else {
    refreshAll();
    startPolling();
  }
});

async function init() {
  load();
  applyTheme();
  renderDashboard();
  renderPresupuesto();
  renderCompromisos();

  // Render Lucide icons; sync theme icon with current mode
  if (document.documentElement.classList.contains('dark')) {
    document.getElementById('theme-toggle').innerHTML = '<i data-lucide="moon"></i>';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('txn-fecha').value = new Date().toISOString().slice(0, 10);

  // Feature 16: pedir permisos de notificación
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  await refreshAll();
  startPolling();
}

init();
