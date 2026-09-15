const el = (id) => document.getElementById(id);

function renderRolesChecklist(settings) {
  const allEnabled = !settings.enabledRoles || settings.enabledRoles.length === 0;
  const groups = {};
  ROLES.forEach((r) => {
    groups[r.team] = groups[r.team] || [];
    groups[r.team].push(r);
  });

  let html = '';
  Object.keys(groups).forEach((teamId) => {
    html += `<div class="role-group"><div class="role-group-title" style="--team-color:${TEAMS[teamId].color}">${TEAMS[teamId].label}</div>`;
    groups[teamId].forEach((r) => {
      const checked = allEnabled || settings.enabledRoles.includes(r.id);
      html += `
        <label class="tracker toggle role-check">
          <input type="checkbox" data-role="${r.id}" ${checked ? 'checked' : ''}>
          <span>${r.name}</span>
        </label>`;
    });
    html += '</div>';
  });
  el('roles-checklist').innerHTML = html;
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
