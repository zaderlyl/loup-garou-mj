const el = (id) => document.getElementById(id);

// Clé utilisée par app.js (panel.html) pour sauvegarder l'état de la partie.
const PANEL_STORAGE_KEY = 'lgmj-state-v1';
const HUB_SETTINGS_KEY = 'lgmj-settings-v1';

function hasOngoingGame() {
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    return Array.isArray(state.players) && state.players.length > 0;
  } catch (e) {
    return false;
  }
}

function getGameName() {
  try {
    const raw = localStorage.getItem(HUB_SETTINGS_KEY);
    if (!raw) return '';
    return JSON.parse(raw).gameName || '';
  } catch (e) {
    return '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const resumeLink = el('resume-link');
  if (hasOngoingGame()) {
    const gameName = getGameName();
    resumeLink.textContent = gameName ? `Reprendre « ${gameName} »` : 'Reprendre la partie en cours';
    resumeLink.hidden = false;
  }

  el('info-open').addEventListener('click', () => { el('info-overlay').hidden = false; });
  el('info-close').addEventListener('click', () => { el('info-overlay').hidden = true; });
  el('info-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'info-overlay') el('info-overlay').hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el('info-overlay').hidden = true;
  });
});
