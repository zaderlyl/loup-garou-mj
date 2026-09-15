const el = (id) => document.getElementById(id);

function teamCountLabel(teamId) {
  const boxes = document.querySelectorAll(`#roles-checklist details[data-team="${teamId}"] input[type=checkbox]`);
  const checked = Array.from(boxes).filter((cb) => cb.checked).length;
  return `${checked}/${boxes.length}`;
}

function updateTeamCount(teamId) {
  const span = document.querySelector(`#roles-checklist details[data-team="${teamId}"] .role-group-count`);
  if (span) span.textContent = teamCountLabel(teamId);
}

// Un menu déroulant (accordéon) par camp — Village / Loups-Garous / Solo —
// pour ne pas afficher toute la liste des rôles d'un coup.
function renderRolesChecklist(settings) {
  const allEnabled = !settings.enabledRoles || settings.enabledRoles.length === 0;
  const groups = {};
  ROLES.forEach((r) => {
    groups[r.team] = groups[r.team] || [];
    groups[r.team].push(r);
  });

  let html = '';
  Object.keys(groups).forEach((teamId) => {
    const checkedCount = groups[teamId].filter((r) => allEnabled || settings.enabledRoles.includes(r.id)).length;
    html += `
      <details class="role-group" data-team="${teamId}">
        <summary class="role-group-title" style="--team-color:${TEAMS[teamId].color}">
          <span>${TEAMS[teamId].label}</span>
          <span class="role-group-count">${checkedCount}/${groups[teamId].length}</span>
        </summary>
        <div class="role-group-body">`;
    groups[teamId].forEach((r) => {
      const checked = allEnabled || settings.enabledRoles.includes(r.id);
      html += `
          <label class="tracker toggle role-check">
            <input type="checkbox" data-role="${r.id}" data-team="${teamId}" ${checked ? 'checked' : ''}>
            <span>${r.name}</span>
          </label>`;
    });
    html += '</div></details>';
  });
  el('roles-checklist').innerHTML = html;

  el('roles-checklist').addEventListener('change', (e) => {
    if (e.target.dataset.team) updateTeamCount(e.target.dataset.team);
  });
}

function getCheckedRoleIds() {
  return Array.from(document.querySelectorAll('#roles-checklist input[type=checkbox]'))
    .filter((cb) => cb.checked)
    .map((cb) => cb.dataset.role);
}

function setAllChecklist(value) {
  document.querySelectorAll('#roles-checklist input[type=checkbox]').forEach((cb) => {
    cb.checked = value;
  });
  Object.keys(TEAMS).forEach(updateTeamCount);
}

function loadIntoForm() {
  const settings = loadSettings();
  el('game-name').value = settings.gameName || '';
  el('expected-players').value = settings.expectedPlayers || '';
  el('house-rules').value = settings.houseRules || '';
  renderRolesChecklist(settings);
}

function persistForm() {
  const checked = getCheckedRoleIds();
  const allChecked = checked.length === ROLES.length;
  const settings = {
    gameName: el('game-name').value.trim(),
    expectedPlayers: el('expected-players').value ? Number(el('expected-players').value) : null,
    // Si tout est coché on stocke null (= pas de restriction) plutôt qu'une
    // liste complète, pour rester cohérent si de nouveaux rôles sont ajoutés.
    enabledRoles: allChecked ? null : checked,
    houseRules: el('house-rules').value,
  };
  saveSettings(settings);
  const confirm = el('save-confirm');
  confirm.hidden = false;
  clearTimeout(persistForm._t);
  persistForm._t = setTimeout(() => { confirm.hidden = true; }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadIntoForm();

  el('save-settings').addEventListener('click', persistForm);

  el('select-all-roles').addEventListener('click', () => setAllChecklist(true));
  el('select-none-roles').addEventListener('click', () => setAllChecklist(false));

  el('reset-settings').addEventListener('click', () => {
    if (!confirm('Réinitialiser les paramètres de partie (rôles, règles maison) ?')) return;
    saveSettings(defaultSettings());
    loadIntoForm();
  });
});
