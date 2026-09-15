const STORAGE_KEY = 'lgmj-state-v1';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('État corrompu, réinitialisation.', e);
  }
  return {
    players: [],
    lovers: [null, null],
    captainId: null,
    nightCount: 0,
  };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function alivePlayers(excludeId) {
  return state.players.filter((p) => p.alive && p.id !== excludeId);
}

function getPlayer(id) {
  return state.players.find((p) => p.id === id) || null;
}

function ensurePlayerShape(p) {
  if (!p.flags) p.flags = {};
  if (!p.notes) p.notes = '';
  return p;
}

// ---------- Actions ----------

function addPlayer(name) {
  if (!name || !name.trim()) return;
  state.players.push(ensurePlayerShape({ id: uid(), name: name.trim(), roleId: null, alive: true }));
  saveState();
  render();
}

function removePlayer(id) {
  state.players = state.players.filter((p) => p.id !== id);
  if (state.lovers[0] === id) state.lovers[0] = null;
  if (state.lovers[1] === id) state.lovers[1] = null;
  if (state.captainId === id) state.captainId = null;
  saveState();
  render();
}

function setPlayerRole(id, roleId) {
  const p = getPlayer(id);
  if (!p) return;
  p.roleId = roleId || null;
  p.flags = {};
  const role = getRole(roleId);
  if (role && role.trackers) {
    role.trackers.forEach((t) => {
      if (t.type === 'toggle') p.flags[t.key] = false;
      if (t.type === 'select-player') p.flags[t.key] = { current: null, history: [] };
      if (t.type === 'multiselect-players') p.flags[t.key] = [];
    });
  }
  saveState();
  render();
}

function toggleAlive(id) {
  const p = getPlayer(id);
  if (!p) return;
  p.alive = !p.alive;
  saveState();
  render();
}

function toggleFlag(playerId, key) {
  const p = getPlayer(playerId);
  if (!p) return;
  p.flags[key] = !p.flags[key];
  saveState();
  render();
}

function setSelectPlayerTracker(playerId, key, targetId) {
  const p = getPlayer(playerId);
  if (!p) return;
  const tracker = p.flags[key] || { current: null, history: [] };
  if (tracker.current && tracker.current !== targetId) {
    tracker.history.unshift(tracker.current);
    tracker.history = tracker.history.slice(0, 5);
  }
  tracker.current = targetId || null;
  p.flags[key] = tracker;
  saveState();
  render();
}

function toggleMultiselect(playerId, key, targetId) {
  const p = getPlayer(playerId);
  if (!p) return;
  const list = p.flags[key] || [];
  const idx = list.indexOf(targetId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(targetId);
  p.flags[key] = list;
  saveState();
  render();
}

function setLover(index, playerId) {
  state.lovers[index] = playerId || null;
  saveState();
  render();
}

function setCaptain(playerId) {
  state.captainId = playerId || null;
  saveState();
  render();
}

function bumpNight(delta) {
  state.nightCount = Math.max(0, state.nightCount + delta);
  saveState();
  render();
}

function resetGame() {
  if (!confirm('Réinitialiser complètement la partie (joueurs, rôles, historique) ?')) return;
  state = { players: [], lovers: [null, null], captainId: null, nightCount: 0 };
  saveState();
  render();
}

// ---------- Rendering ----------

const el = (id) => document.getElementById(id);

function teamBadge(teamId) {
  const t = TEAMS[teamId] || { label: teamId, color: '#888' };
  return `<span class="badge" style="--badge-color:${t.color}">${t.label}</span>`;
}

function roleOptions(selectedId) {
  const groups = {};
  getEnabledRoles(selectedId).forEach((r) => {
    groups[r.team] = groups[r.team] || [];
    groups[r.team].push(r);
  });
  let html = '<option value="">— Choisir un rôle —</option>';
  Object.keys(groups).forEach((teamId) => {
    html += `<optgroup label="${TEAMS[teamId].label}">`;
    groups[teamId].forEach((r) => {
      html += `<option value="${r.id}" ${r.id === selectedId ? 'selected' : ''}>${r.name}</option>`;
    });
    html += '</optgroup>';
  });
  return html;
}

function playerOptions(currentValue, excludeId) {
  let html = '<option value="">—</option>';
  state.players
    .filter((p) => p.id !== excludeId)
    .forEach((p) => {
      const tag = p.alive ? '' : ' (mort)';
      html += `<option value="${p.id}" ${p.id === currentValue ? 'selected' : ''}>${p.name}${tag}</option>`;
    });
  return html;
}

function renderTracker(player, tracker) {
  const key = tracker.key;
  const val = player.flags[key];
  if (tracker.type === 'toggle') {
    return `
      <label class="tracker toggle">
        <input type="checkbox" data-action="toggle-flag" data-player="${player.id}" data-key="${key}" ${val ? 'checked' : ''}>
        <span>${tracker.label}</span>
      </label>`;
  }
  if (tracker.type === 'info') {
    return `<div class="tracker info">ℹ️ ${tracker.label}</div>`;
  }
  if (tracker.type === 'select-player') {
    const current = val && val.current;
    const history = (val && val.history) || [];
    const historyHtml = history.length
      ? `<div class="tracker-history">Précédent(s) : ${history.map((id) => getPlayer(id)?.name || '?').join(', ')}</div>`
      : '';
    return `
      <div class="tracker select-player">
        <label>${tracker.label}
          <select data-action="select-player" data-player="${player.id}" data-key="${key}">
            ${playerOptions(current, player.id)}
          </select>
        </label>
        ${historyHtml}
      </div>`;
  }
  if (tracker.type === 'multiselect-players') {
    const list = val || [];
    const chips = state.players
      .filter((p) => p.id !== player.id)
      .map((p) => {
        const active = list.includes(p.id);
        return `<button type="button" class="chip ${active ? 'active' : ''}" data-action="toggle-multiselect" data-player="${player.id}" data-key="${key}" data-target="${p.id}">${p.name}</button>`;
      })
      .join('');
    return `<div class="tracker multiselect"><div class="tracker-label">${tracker.label}</div><div class="chips">${chips || '<em>Aucun autre joueur</em>'}</div></div>`;
  }
  return '';
}

function renderPlayerCard(player) {
  const role = getRole(player.roleId);
  const deadClass = player.alive ? '' : 'dead';
  const teamColor = role ? TEAMS[role.team].color : '#888';
  const isLover = state.lovers.includes(player.id);
  const isCaptain = state.captainId === player.id;

  const trackersHtml = role && role.trackers ? role.trackers.map((t) => renderTracker(player, t)).join('') : '';

  return `
    <div class="card ${deadClass}" style="--team-color:${teamColor}">
      <div class="card-head">
        <div class="card-title">
          <span class="player-name">${player.name}</span>
          ${isLover ? '<span title="Amoureux">💘</span>' : ''}
          ${isCaptain ? '<span title="Capitaine">👑</span>' : ''}
          ${!player.alive ? '<span class="tag-dead">MORT</span>' : ''}
        </div>
        <div class="card-actions">
          <button data-action="toggle-alive" data-player="${player.id}" class="btn small ${player.alive ? 'danger' : 'ghost'}">
            ${player.alive ? '☠️ Éliminer' : '↩️ Ressusciter'}
          </button>
          <button data-action="remove-player" data-player="${player.id}" class="btn small ghost">✕</button>
        </div>
      </div>

      <div class="card-body">
        <label class="role-select">
          Rôle
          <select data-action="set-role" data-player="${player.id}">
            ${roleOptions(player.roleId)}
          </select>
        </label>
        ${role ? `<div class="role-desc">${teamBadge(role.team)} ${role.desc}</div>` : ''}
        ${trackersHtml}
        <label class="notes">
          Notes
          <textarea data-action="set-notes" data-player="${player.id}" placeholder="Particularités, accords, rôle personnalisé...">${player.notes || ''}</textarea>
        </label>
      </div>
    </div>`;
}

function renderSummary() {
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);
  const counts = { village: 0, loups: 0, solo: 0, sans_role: 0 };
  alive.forEach((p) => {
    const role = getRole(p.roleId);
    if (role) counts[role.team]++;
    else counts.sans_role++;
  });

  return `
    <div class="summary">
      <div class="summary-row">
        <div class="stat"><span class="stat-num">${state.players.length}</span><span>Joueurs</span></div>
        <div class="stat"><span class="stat-num">${alive.length}</span><span>Vivants</span></div>
        <div class="stat"><span class="stat-num">${dead.length}</span><span>Morts</span></div>
      </div>
      <div class="summary-row teams">
        <div class="stat" style="--team-color:${TEAMS.village.color}"><span class="stat-num">${counts.village}</span><span>Village</span></div>
        <div class="stat" style="--team-color:${TEAMS.loups.color}"><span class="stat-num">${counts.loups}</span><span>Loups</span></div>
        <div class="stat" style="--team-color:${TEAMS.solo.color}"><span class="stat-num">${counts.solo}</span><span>Solo</span></div>
      </div>
      ${dead.length ? `<div class="dead-list"><strong>Éliminés :</strong> ${dead.map((p) => `${p.name}${getRole(p.roleId) ? ' (' + getRole(p.roleId).name + ')' : ''}`).join(', ')}</div>` : ''}
    </div>`;
}

function renderLoversAndCaptain() {
  return `
    <div class="panel">
      <h3>💘 Amoureux (Cupidon)</h3>
      <div class="row">
        <select data-action="set-lover" data-index="0">${playerOptions(state.lovers[0])}</select>
        <select data-action="set-lover" data-index="1">${playerOptions(state.lovers[1])}</select>
      </div>
    </div>
    <div class="panel">
      <h3>👑 Capitaine</h3>
      <select data-action="set-captain">${playerOptions(state.captainId)}</select>
    </div>
    <div class="panel">
      <h3>🌙 Tour de jeu</h3>
      <div class="row night-counter">
        <button class="btn small" data-action="night-minus">−</button>
        <span class="night-value">${state.nightCount}</span>
        <button class="btn small" data-action="night-plus">+</button>
      </div>
    </div>`;
}

function render() {
  el('summary').innerHTML = renderSummary();
  el('side-panels').innerHTML = renderLoversAndCaptain();
  el('players').innerHTML = state.players.length
    ? state.players.map(renderPlayerCard).join('')
    : '<p class="empty">Ajoutez des joueurs ci-dessus pour commencer.</p>';
}

// ---------- Event delegation ----------

document.addEventListener('DOMContentLoaded', () => {
  render();

  el('add-player-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = el('new-player-name');
    addPlayer(input.value);
    input.value = '';
    input.focus();
  });

  el('reset-game').addEventListener('click', resetGame);

  document.body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;
    if (action === 'toggle-alive') toggleAlive(t.dataset.player);
    if (action === 'remove-player') removePlayer(t.dataset.player);
    if (action === 'toggle-multiselect') toggleMultiselect(t.dataset.player, t.dataset.key, t.dataset.target);
    if (action === 'night-plus') bumpNight(1);
    if (action === 'night-minus') bumpNight(-1);
  });

  document.body.addEventListener('change', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;
    if (action === 'set-role') setPlayerRole(t.dataset.player, t.value);
    if (action === 'toggle-flag') toggleFlag(t.dataset.player, t.dataset.key);
    if (action === 'select-player') setSelectPlayerTracker(t.dataset.player, t.dataset.key, t.value);
    if (action === 'set-lover') setLover(Number(t.dataset.index), t.value);
    if (action === 'set-captain') setCaptain(t.value);
  });

  document.body.addEventListener('input', (e) => {
    const t = e.target.closest('[data-action="set-notes"]');
    if (!t) return;
    const p = getPlayer(t.dataset.player);
    if (p) {
      p.notes = t.value;
      saveState();
    }
  });
});
