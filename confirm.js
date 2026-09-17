// Mini-fenêtre de confirmation stylée, en remplacement de window.confirm()
// natif (bloquant et hors charte graphique). Partagée par le Hub et le
// Panel MJ — les deux pages doivent charger ce fichier avant leur propre
// script. Contrairement à confirm(), askConfirm() est asynchrone : elle
// retourne une Promise<boolean> plutôt qu'un booléen immédiat.

function ensureConfirmOverlay() {
  if (document.getElementById('confirm-overlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="confirm-overlay" class="confirm-overlay" hidden>
      <div class="confirm-card">
        <p id="confirm-message" class="confirm-message"></p>
        <div class="confirm-actions">
          <button type="button" id="confirm-cancel" class="btn small ghost">Annuler</button>
          <button type="button" id="confirm-ok" class="btn small primary">Confirmer</button>
        </div>
      </div>
    </div>`);
}

function askConfirm(message) {
  ensureConfirmOverlay();
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-overlay');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    msgEl.textContent = message;
    overlay.hidden = false;

    function cleanup(result) {
      overlay.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onBackdrop(e) { if (e.target === overlay) cleanup(false); }
    function onKey(e) {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    okBtn.focus();
  });
}
