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

// Texte seul pour le moment (idée future : illustration par rôle, cf. `emoji` dans roles.js).
function roleCard(role, selected) {
  return `
    <button type="button" class="role-card ${selected ? 'selected' : ''}" data-role="${role.id}" style="--team-color:${TEAMS[role.team].color}" title="${role.desc}">
      <span class="role-card-name">${role.name}</span>
    </button>`;
}

function renderGrids() {
  const availableRoles = ROLES.filter((r) => !selectedRoles.has(r.id) && (filterState.available === 'all' || r.team === filterState.available));
  const selected = ROLES.filter((r) => selectedRoles.has(r.id) && (filterState.selected === 'all' || r.team === filterState.selected));

  el('roles-available').innerHTML = availableRoles.length
    ? availableRoles.map((r) => roleCard(r, false)).join('')
    : '<p class="empty small">Aucun rôle dans ce camp.</p>';

  if (selected.length) {
    el('roles-selected').innerHTML = selected.map((r) => roleCard(r, true)).join('');
  } else if (selectedRoles.size === 0) {
    // Liste entièrement vide, pas juste filtrée : la partie ne peut pas
    // démarrer sans rôle. Message d'alerte plutôt que le texte discret habituel.
    el('roles-selected').innerHTML =
      '<p class="empty small warning">⚠ Aucun rôle sélectionné — le panel MJ n\'aura rien à proposer. Ajoute au moins un Loup-Garou et un Villageois avant de lancer la partie.</p>';
  } else {
    el('roles-selected').innerHTML = '<p class="empty small">Aucun rôle sélectionné dans ce camp.</p>';
  }
}

// Sets de rôles recommandés par tranche de nombre de joueurs, du plus
// proche de la partie de base à la partie complète.
// PROVISOIRE : composition à affiner plus tard, ceci n'est qu'un premier
// jet pour que le mécanisme (suggestion + application) soit en place.
// « Autre / Personnalisé » n'est jamais inclus automatiquement.
const BASE_PRESET_ROLES = ['villageois', 'loup-garou', 'voyante', 'sorciere', 'chasseur', 'cupidon'];
const MID_PRESET_ROLES = [...BASE_PRESET_ROLES, 'petite-fille', 'voleur', 'ancien', 'bouc-emissaire', 'gardien'];
const LARGE_PRESET_ROLES = [...MID_PRESET_ROLES, 'idiot-du-village', 'ermite', 'capitaine-role', 'soeurs', 'freres'];
const XLARGE_PRESET_ROLES = [...LARGE_PRESET_ROLES, 'loup-blanc', 'grand-mechant-loup', 'joueur-de-flute', 'ange'];
const FULL_PRESET_ROLES = ROLES.filter((r) => r.id !== 'autre').map((r) => r.id);

const ROLE_PRESETS = [
  { maxPlayers: 8, roleIds: BASE_PRESET_ROLES },
  { maxPlayers: 12, roleIds: MID_PRESET_ROLES },
  { maxPlayers: 16, roleIds: LARGE_PRESET_ROLES },
  { maxPlayers: 20, roleIds: XLARGE_PRESET_ROLES },
  { maxPlayers: Infinity, roleIds: FULL_PRESET_ROLES },
];

function getPresetForPlayerCount(count) {
  return ROLE_PRESETS.find((p) => count <= p.maxPlayers) || ROLE_PRESETS[ROLE_PRESETS.length - 1];
}

// Affiche (ou masque) la suggestion de set de rôles sous le champ
// "nombre de joueurs attendus", en fonction de sa valeur actuelle.
function updatePresetSuggestion() {
  const raw = el('expected-players').value;
  const valid = isExpectedPlayersValid(raw);
  const suggest = el('preset-suggest');

  if (!valid || raw === '') {
    suggest.hidden = true;
    return;
  }

  const count = Number(raw);
  const preset = getPresetForPlayerCount(count);
  el('preset-count').textContent = count;
  el('preset-summary').textContent = `${preset.roleIds.length} rôles`;
  suggest.hidden = false;
}

function applyPreset() {
  const count = Number(el('expected-players').value);
  const preset = getPresetForPlayerCount(count);
  selectedRoles = new Set(preset.roleIds);
  renderGrids();
}

function toggleRole(roleId) {
  if (selectedRoles.has(roleId)) selectedRoles.delete(roleId);
  else selectedRoles.add(roleId);
  renderGrids();
}

// ---------- Détail d'un rôle (appui long sur une card) ----------

function showRoleDetail(roleId) {
  const role = getRole(roleId);
  if (!role) return;

  const card = el('role-detail-overlay').querySelector('.role-detail-card');
  card.style.setProperty('--team-color', TEAMS[role.team].color);

  el('role-detail-team').textContent = TEAMS[role.team].label;
  el('role-detail-name').textContent = role.name;
  el('role-detail-wake').textContent = role.wake || '—';
  el('role-detail-desc').textContent = role.desc;

  el('role-detail-trackers').innerHTML = role.trackers && role.trackers.length
    ? `<p class="role-detail-label">À suivre pendant la partie</p>
       <ul class="role-detail-tracker-list">${role.trackers.map((t) => `<li>${t.label}</li>`).join('')}</ul>`
    : '';

  el('role-detail-overlay').hidden = false;
}

function hideRoleDetail() {
  el('role-detail-overlay').hidden = true;
}

const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE = 10;
let longPressTimer = null;
let longPressTriggered = false;
let longPressStart = null;

function cancelLongPress() {
  clearTimeout(longPressTimer);
  longPressTimer = null;
  longPressStart = null;
}

const EXPECTED_PLAYERS_MIN = 6;
const EXPECTED_PLAYERS_MAX = 40;

// Valide en direct le champ "nombre de joueurs attendus" et affiche un
// retour visuel (bordure + message) si la valeur est vide de sens.
function isExpectedPlayersValid(rawValue) {
  if (rawValue === '') return true;
  const num = Number(rawValue);
  return Number.isInteger(num) && num >= EXPECTED_PLAYERS_MIN && num <= EXPECTED_PLAYERS_MAX;
}

function validateExpectedPlayers() {
  const input = el('expected-players');
  const valid = isExpectedPlayersValid(input.value);
  input.classList.toggle('invalid', !valid);
  el('expected-players-error').hidden = valid;
  return valid;
}

function loadIntoForm() {
  const settings = loadSettings();
  el('game-name').value = settings.gameName || '';
  el('expected-players').value = settings.expectedPlayers || '';
  el('house-rules').value = settings.houseRules || '';
  validateExpectedPlayers();
  updatePresetSuggestion();
  initSelection();
  renderFilterTabs('available-filter', 'available');
  renderFilterTabs('selected-filter', 'selected');
  renderGrids();
}

function persistForm() {
  const allSelected = selectedRoles.size === ROLES.length;
  const expectedPlayersRaw = el('expected-players').value;
  const expectedPlayersValid = validateExpectedPlayers();
  const settings = {
    gameName: el('game-name').value.trim(),
    // Si la valeur est absurde, on garde l'ancienne plutôt que d'enregistrer
    // n'importe quoi : le champ reste signalé en erreur à l'écran.
    expectedPlayers: expectedPlayersValid
      ? (expectedPlayersRaw ? Number(expectedPlayersRaw) : null)
      : loadSettings().expectedPlayers,
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

  el('expected-players').addEventListener('input', () => {
    validateExpectedPlayers();
    updatePresetSuggestion();
  });

  el('apply-preset').addEventListener('click', applyPreset);

  el('select-all-roles').addEventListener('click', () => {
    selectedRoles = new Set(ROLES.map((r) => r.id));
    renderGrids();
  });

  el('select-none-roles').addEventListener('click', () => {
    selectedRoles = new Set();
    renderGrids();
  });

  el('reset-settings').addEventListener('click', () => {
    askConfirm('Réinitialiser les paramètres de partie (rôles, règles maison) ?').then((ok) => {
      if (!ok) return;
      saveSettings(defaultSettings());
      loadIntoForm();
    });
  });

  document.body.addEventListener('click', (e) => {
    const card = e.target.closest('.role-card');
    if (card) {
      // Un appui long vient de montrer le détail : ce clic (relâchement)
      // ne doit pas en plus faire basculer la sélection du rôle.
      if (longPressTriggered) {
        longPressTriggered = false;
        return;
      }
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

  document.body.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    longPressTriggered = false;
    longPressStart = { x: e.clientX, y: e.clientY };
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      showRoleDetail(card.dataset.role);
    }, LONG_PRESS_MS);
  });

  document.body.addEventListener('pointermove', (e) => {
    if (!longPressStart) return;
    const dx = e.clientX - longPressStart.x;
    const dy = e.clientY - longPressStart.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) cancelLongPress();
  });

  document.body.addEventListener('pointerup', cancelLongPress);
  document.body.addEventListener('pointercancel', cancelLongPress);
  document.body.addEventListener('scroll', cancelLongPress, true);

  el('role-detail-close').addEventListener('click', hideRoleDetail);
  el('role-detail-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'role-detail-overlay') hideRoleDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideRoleDetail();
  });
});
