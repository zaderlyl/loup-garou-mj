const el = (id) => document.getElementById(id);

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'village', label: TEAMS.village.label },
  { id: 'loups', label: TEAMS.loups.label },
  { id: 'solo', label: TEAMS.solo.label },
];

// Ensemble des rôles actuellement sélectionnés pour la partie (état en
// mémoire, persisté dans les settings uniquement au clic sur « Enregistrer »).
let selectedRoles = new Set();

// Filtre par camp appliqué indépendamment à chaque zone (disponibles / sélectionnés).
const filterState = { available: 'all', selected: 'all' };

function initSelection() {
  const settings = loadSettings();
  const allEnabled = !settings.enabledRoles || settings.enabledRoles.length === 0;
  selectedRoles = new Set(allEnabled ? ROLES.map((r) => r.id) : settings.enabledRoles);
}

function renderFilterTabs(containerId, target) {
  const html = FILTERS.map(
    (f) => `<button type="button" class="filter-tab ${filterState[target] === f.id ? 'active' : ''}" data-filter-target="${target}" data-filter-value="${f.id}">${f.label}</button>`
  ).join('');
  el(containerId).innerHTML = html;
}

// `emoji` fait office d'illustration temporaire (idée future : remplacer par
// une vraie image par rôle).
function roleCard(role, selected) {
  return `
    <button type="button" class="role-card ${selected ? 'selected' : ''}" data-role="${role.id}" style="--team-color:${TEAMS[role.team].color}" title="${role.desc}">
      <span class="role-card-art">${role.emoji || '🎭'}</span>
      <span class="role-card-name">${role.name}</span>
    </button>`;
}

function renderGrids() {
  const availableRoles = ROLES.filter((r) => !selectedRoles.has(r.id) && (filterState.available === 'all' || r.team === filterState.available));
  const selected = ROLES.filter((r) => selectedRoles.has(r.id) && (filterState.selected === 'all' || r.team === filterState.selected));

  el('roles-available').innerHTML = availableRoles.length
    ? availableRoles.map((r) => roleCard(r, false)).join('')
    : '<p class="empty small">Aucun rôle dans ce camp.</p>';

  el('roles-selected').innerHTML = selected.length
    ? selected.map((r) => roleCard(r, true)).join('')
    : '<p class="empty small">Aucun rôle sélectionné.</p>';
}

function toggleRole(roleId) {
  if (selectedRoles.has(roleId)) selectedRoles.delete(roleId);
  else selectedRoles.add(roleId);
  renderGrids();
}

function loadIntoForm() {
  const settings = loadSettings();
  el('game-name').value = settings.gameName || '';
  el('expected-players').value = settings.expectedPlayers || '';
  el('house-rules').value = settings.houseRules || '';
  initSelection();
  renderFilterTabs('available-filter', 'available');
  renderFilterTabs('selected-filter', 'selected');
  renderGrids();
}

function persistForm() {
  const allSelected = selectedRoles.size === ROLES.length;
  const settings = {
    gameName: el('game-name').value.trim(),
    expectedPlayers: el('expected-players').value ? Number(el('expected-players').value) : null,
    // Si tout est sélectionné on stocke null (= pas de restriction) plutôt
    // qu'une liste complète, pour rester cohérent si de nouveaux rôles sont ajoutés.
    enabledRoles: allSelected ? null : Array.from(selectedRoles),
    houseRules: el('house-rules').value,
  };
  saveSettings(settings);
  const confirmMsg = el('save-confirm');
  confirmMsg.hidden = false;
  clearTimeout(persistForm._t);
  persistForm._t = setTimeout(() => { confirmMsg.hidden = true; }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadIntoForm();

  el('save-settings').addEventListener('click', persistForm);

  el('select-all-roles').addEventListener('click', () => {
    selectedRoles = new Set(ROLES.map((r) => r.id));
    renderGrids();
  });

  el('select-none-roles').addEventListener('click', () => {
    selectedRoles = new Set();
    renderGrids();
  });

  el('reset-settings').addEventListener('click', () => {
    if (!confirm('Réinitialiser les paramètres de partie (rôles, règles maison) ?')) return;
    saveSettings(defaultSettings());
    loadIntoForm();
  });

  document.body.addEventListener('click', (e) => {
    const card = e.target.closest('.role-card');
    if (card) {
      toggleRole(card.dataset.role);
      return;
    }
    const tab = e.target.closest('.filter-tab');
    if (tab) {
      filterState[tab.dataset.filterTarget] = tab.dataset.filterValue;
      renderFilterTabs('available-filter', 'available');
      renderFilterTabs('selected-filter', 'selected');
      renderGrids();
    }
  });
});
