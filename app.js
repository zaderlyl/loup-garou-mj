const STORAGE_KEY = 'lgmj-state-v1';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultState() {
  return {
    players: [],
    lovers: [null, null],
    captainId: null,
    // type: 'standby' | 'night' | 'day' ; night: numéro de la nuit en
    // cours (0 tant que la nuit 1 n'a pas commencé) ; stepIndex : position
    // dans les étapes de la nuit (voir NIGHT_ORDER). 'standby' est l'état
    // d'attente juste après « Démarrer la partie », avant la nuit 1.
    phase: { type: 'standby', night: 0, stepIndex: 0 },
    // 'setup' : composition libre (joueurs, rôles, amoureux...).
    // 'running' : partie lancée — rôles et amoureux verrouillés (le
    //   reste, dont les pouvoirs de rôle, reste utilisable).
    // 'frozen' : pause temporaire pendant la partie pour tout modifier
    //   comme en 'setup', puis reprendre.
    status: 'setup',
    // { team, label, detail } dès qu'une condition de victoire est remplie,
    // sinon null. Voir checkWinConditions().
    winner: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      // Migration douce depuis l'ancien compteur "nightCount" simple.
      if (!state.phase) {
        state.phase = { type: 'night', night: Math.max(1, state.nightCount || 1), stepIndex: 0 };
      }
      if (!state.status) state.status = 'setup';
      if (state.winner === undefined) state.winner = null;
      return state;
    }
  } catch (e) {
    console.warn('État corrompu, réinitialisation.', e);
  }
  return defaultState();
}

let state = loadState();

// Masquage transitoire de la bannière de victoire (le MJ peut continuer à
// consulter le panel sans la garder affichée) — non persisté : à la
// prochaine ouverture, la bannière réapparaît tant que la partie n'est pas
// réinitialisée.
let winnerBannerDismissed = false;

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

// ---------- Mode test : remplissage rapide pour tester les mecaniques ----------
// Genere un jeu de joueurs fictifs et leur attribue au hasard les roles
// actuellement autorises (parametres du Hub). Uniquement disponible tant que
// la partie n'est pas lancee (status 'setup') : ca remplace entierement le
// roster actuel, amoureux et capitaine compris.

const TEST_NAMES = [
  'Lea', 'Marc', 'Nora', 'Tom', 'Julie', 'Hugo', 'Chloe', 'Awa', 'Yanis', 'Karim',
  'Sami', 'Ines', 'Paul', 'Nina', 'Theo', 'Manon', 'Elias', 'Camille', 'Rayan', 'Zoe',
];

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fillTestPlayers() {
  if (state.status !== 'setup') return;

  const generate = () => {
    const settings = loadSettings();
    const count = Math.min(TEST_NAMES.length, Math.max(4, settings.expectedPlayers || 10));
    const names = shuffle(TEST_NAMES).slice(0, count);

    const enabled = getEnabledRoles();
    const pool = enabled.length ? enabled.map((r) => r.id) : ['villageois'];
    let roleIds = shuffle(pool);
    while (roleIds.length < count) roleIds.push(pool[Math.floor(Math.random() * pool.length)]);
    roleIds = shuffle(roleIds).slice(0, count);

    state.players = names.map((name, i) => {
      const p = ensurePlayerShape({ id: uid(), name, roleId: null, alive: true });
      assignRole(p, roleIds[i]);
      return p;
    });
    state.lovers = [null, null];
    state.captainId = null;
    state.phase = { type: 'standby', night: 0, stepIndex: 0 };
    saveState();
    render();
  };

  if (state.players.length) {
    askConfirm('Remplacer les joueurs actuels par un jeu de test généré au hasard ?').then((ok) => { if (ok) generate(); });
  } else {
    generate();
  }
}

function renderTestTools() {
  if (state.status !== 'setup') return '';
  return `<button type="button" data-action="fill-test-players" class="btn small ghost test-fill-btn">🧪 Remplir avec des joueurs de test</button>`;
}

// Affecte un rôle à un joueur et (ré)initialise ses trackers en conséquence.
// Pure mutation, sans saveState/render : utilisé aussi bien pour une
// affectation simple que pour un échange de rôles entre deux joueurs.
function assignRole(player, roleId) {
  player.roleId = roleId || null;
  player.flags = {};
  const role = getRole(roleId);
  if (role && role.trackers) {
    role.trackers.forEach((t) => {
      if (t.type === 'toggle') player.flags[t.key] = false;
      if (t.type === 'select-player') player.flags[t.key] = { current: null, history: [] };
      if (t.type === 'multiselect-players') player.flags[t.key] = [];
    });
  }
}

function setPlayerRole(id, roleId) {
  const p = getPlayer(id);
  if (!p) return;
  assignRole(p, roleId);
  saveState();
  render();
}

// Pouvoir du Voleur : échange son rôle avec celui d'un autre joueur. Les
// deux joueurs repartent avec les trackers de leur nouveau rôle remis à zéro.
function swapPlayerRoles(playerId, targetId) {
  if (playerId === targetId) return;
  const p1 = getPlayer(playerId);
  const p2 = getPlayer(targetId);
  if (!p1 || !p2) return;
  askConfirm(`Échanger le rôle de ${p1.name} avec celui de ${p2.name} ?`).then((ok) => {
    if (!ok) return;
    const role1 = p1.roleId;
    const role2 = p2.roleId;
    assignRole(p1, role2);
    assignRole(p2, role1);
    saveState();
    render();
    refreshOpenPlayerDetail();
  });
}

// ---------- Conditions de victoire ----------
//
// Chaque entrée : { id, check(state) }. `check` renvoie { team, label,
// detail } si la condition est remplie, sinon null/undefined.
//
// Vérifiées dans l'ordre du tableau et on s'arrête à la première qui
// matche : les conditions spécifiques à un rôle (Ange, Joueur de Flûte,
// Amoureux...) doivent être ajoutées AVANT les deux conditions de camp de
// base ci-dessous, pour être détectées en priorité si elles coexistent.
// Chaque rôle ajoute la sienne sur sa propre branche, fusionnée ensuite
// dans "condition-de-victoire".
const WIN_CONDITIONS = [
  {
    id: 'amoureux',
    check: (s) => {
      const [loverAId, loverBId] = s.lovers;
      if (!loverAId || !loverBId) return null;
      const alive = s.players.filter((p) => p.alive);
      if (alive.length !== 2) return null;
      const aliveIds = new Set(alive.map((p) => p.id));
      if (!aliveIds.has(loverAId) || !aliveIds.has(loverBId)) return null;
      const loverA = s.players.find((p) => p.id === loverAId);
      const loverB = s.players.find((p) => p.id === loverBId);
      return {
        team: 'amoureux',
        label: 'Les Amoureux gagnent',
        detail: `${loverA.name} et ${loverB.name} sont les deux derniers survivants : ils gagnent ensemble, quel que soit leur camp.`,
      };
    },
  },
  {
    // L'Ange n'a pas de condition calculable automatiquement (il faut
    // distinguer vote/nuit et compter les tours) : le MJ coche lui-même la
    // case "A gagné" sur la fiche du rôle (roles.js) une fois la condition
    // remplie ; cette entrée se contente de lire ce flag pour afficher la
    // bannière de victoire correspondante.
    id: 'ange',
    check: (s) => {
      const ange = s.players.find((p) => p.roleId === 'ange');
      if (!ange || !ange.flags.aGagne) return null;
      return {
        team: 'solo',
        label: "L'Ange gagne",
        detail: `${ange.name} a été éliminé avant la fin du tour 2 : il gagne seul.`,
      };
    },
  },
  {
    id: 'joueur-de-flute',
    check: (s) => {
      const flutiste = s.players.find((p) => p.roleId === 'joueur-de-flute');
      if (!flutiste || !flutiste.alive) return null;
      const others = s.players.filter((p) => p.alive && p.id !== flutiste.id);
      if (!others.length) return null;
      const charmed = new Set(flutiste.flags.charmes || []);
      if (!others.every((p) => charmed.has(p.id))) return null;
      return {
        team: 'solo',
        label: 'Le Joueur de Flûte gagne',
        detail: `${flutiste.name} a charmé tous les joueurs encore en vie.`,
      };
    },
  },
  {
    id: 'village',
    check: (s) => {
      const alive = s.players.filter((p) => p.alive);
      if (!alive.length) return null;
      // Un joueur mort garde son roleId : on peut donc vérifier ici qu'un Loup
      // a bien existé dans la partie (vivant ou déjà éliminé), pour ne pas
      // déclarer la victoire du Village si aucun rôle Loup n'a jamais été
      // distribué (partie mal configurée depuis le Hub).
      const everHadLoup = s.players.some((p) => getRole(p.roleId)?.team === 'loups');
      if (!everHadLoup) return null;
      const aliveLoups = alive.filter((p) => getRole(p.roleId)?.team === 'loups');
      if (aliveLoups.length === 0) {
        const survivors = alive.map((p) => p.name).join(', ');
        return {
          team: 'village',
          label: 'Le Village gagne',
          detail: `Tous les Loups-Garous ont été éliminés. Survivant${alive.length > 1 ? 's' : ''} : ${survivors}.`,
        };
      }
      return null;
    },
  },
  {
    id: 'loups',
    check: (s) => {
      const alive = s.players.filter((p) => p.alive);
      if (!alive.length) return null;
      const aliveLoups = alive.filter((p) => getRole(p.roleId)?.team === 'loups');
      const aliveOthers = alive.length - aliveLoups.length;
      if (aliveLoups.length > 0 && aliveLoups.length >= aliveOthers) {
        return { team: 'loups', label: 'Les Loups-Garous gagnent', detail: 'Ils sont au moins aussi nombreux que le reste du village.' };
      }
      return null;
    },
  },
  // Filet de sécurité : personne n'est déclaré vainqueur si plus aucun
  // joueur n'est en vie (arrive uniquement si le MJ corrige/élimine tout le
  // monde en pause), pour que le MJ ait quand même un message clair au lieu
  // d'un panel silencieux.
  {
    id: 'no-survivors',
    check: (s) => {
      if (s.players.length > 0 && s.players.every((p) => !p.alive)) {
        return { team: null, label: 'Plus personne n\'est en vie', detail: 'Partie terminée sans vainqueur.' };
      }
      return null;
    },
  },
];

function checkWinConditions() {
  if (!state.players.length) return null;
  for (const condition of WIN_CONDITIONS) {
    const result = condition.check(state);
    if (result) return result;
  }
  return null;
}

// Recalcule le vainqueur et réaffiche la bannière si le résultat a changé
// depuis la dernière vérification (nouvelle condition remplie, ou partie
// qui redevient indécise après une correction du MJ en pause).
function refreshWinner() {
  const result = checkWinConditions();
  if (JSON.stringify(result) !== JSON.stringify(state.winner)) winnerBannerDismissed = false;
  state.winner = result;
}

function dismissWinnerBanner() {
  winnerBannerDismissed = true;
  render();
}

function toggleAlive(id) {
  const p = getPlayer(id);
  if (!p) return;
  const wasAlive = p.alive;
  p.alive = !p.alive;
  refreshWinner();
  saveState();
  render();
  // Certains pouvoirs ne sont pas rattaches a une etape de NIGHT_ORDER mais
  // se declenchent au moment precis de la mort (ex. le tir du Chasseur) :
  // sans ce declic explicite, rien dans l'interface ne rappelle au MJ de
  // designer la cible. On ouvre donc directement la fiche du joueur qui
  // vient de mourir quand un tel pouvoir reste a resoudre.
  if (wasAlive && !p.alive) {
    const role = getRole(p.roleId);
    const pending = role && role.trackers && role.trackers.find((t) => {
      if (!t.onDeath || t.type !== 'select-player') return false;
      const val = p.flags[t.key];
      return !(val && val.current);
    });
    if (pending) showPlayerDetail(p.id);
  }
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

// Ordre de réveil habituel du Loup-Garou de Thiercelieux. `firstNightOnly`
// signale un rôle qui n'agit que la toute première nuit. Seuls les rôles
// effectivement distribués à un joueur apparaissent dans le déroulé.
const NIGHT_ORDER = [
  { roleId: 'cupidon', label: 'Cupidon', firstNightOnly: true },
  { roleId: 'voleur', label: 'Voleur', firstNightOnly: true },
  { roleId: 'soeurs', label: 'Les Sœurs', firstNightOnly: true },
  { roleId: 'freres', label: 'Les Frères', firstNightOnly: true },
  { roleId: 'voyante', label: 'Voyante' },
  { roleId: 'loup-garou', label: 'Loups-Garous' },
  { roleId: 'loup-blanc', label: 'Loup Blanc' },
  { roleId: 'grand-mechant-loup', label: 'Grand Méchant Loup' },
  { roleId: 'petite-fille', label: 'Petite Fille' },
  { roleId: 'sorciere', label: 'Sorcière' },
  { roleId: 'gardien', label: 'Gardien / Salvateur' },
  { roleId: 'joueur-de-flute', label: 'Joueur de Flûte' },
  { roleId: 'capitaine-role', label: 'Corbeau' },
];

// Un rôle mort ne se réveille plus : seuls les joueurs vivants comptent
// pour déterminer les étapes de la nuit.
function getActiveNightSteps(night) {
  const assignedRoleIds = new Set(state.players.filter((p) => p.alive).map((p) => p.roleId).filter(Boolean));
  return NIGHT_ORDER.filter((step) => assignedRoleIds.has(step.roleId) && (!step.firstNightOnly || night === 1));
}

function advancePhase() {
  const { phase } = state;
  if (phase.type === 'standby') {
    state.phase = { type: 'night', night: 1, stepIndex: 0 };
  } else if (phase.type === 'night') {
    const steps = getActiveNightSteps(phase.night);
    if (phase.stepIndex < steps.length - 1) phase.stepIndex++;
    else state.phase = { type: 'day', night: phase.night, stepIndex: 0 };
  } else {
    state.phase = { type: 'night', night: phase.night + 1, stepIndex: 0 };
  }
  refreshWinner();
  saveState();
  render();
}

function retreatPhase() {
  const { phase } = state;
  if (phase.type === 'standby') {
    // Rien avant l'attente initiale.
  } else if (phase.type === 'day') {
    const steps = getActiveNightSteps(phase.night);
    state.phase = { type: 'night', night: phase.night, stepIndex: Math.max(0, steps.length - 1) };
  } else if (phase.stepIndex > 0) {
    phase.stepIndex--;
  } else if (phase.night > 1) {
    state.phase = { type: 'day', night: phase.night - 1, stepIndex: 0 };
  } else {
    state.phase = { type: 'standby', night: 0, stepIndex: 0 };
  }
  refreshWinner();
  saveState();
  render();
}

function resetGame() {
  askConfirm('Réinitialiser complètement la partie (joueurs, rôles, historique) ?').then((ok) => {
    if (!ok) return;
    state = defaultState();
    winnerBannerDismissed = false;
    saveState();
    render();
  });
}

// ---------- Setup vs. partie lancée ----------

function startGame() {
  state.status = 'running';
  state.phase = { type: 'standby', night: 0, stepIndex: 0 };
  saveState();
  render();
}

function freezeGame() {
  state.status = 'frozen';
  saveState();
  render();
}

function resumeGame() {
  state.status = 'running';
  saveState();
  render();
}

// ---------- Rendering ----------

const el = (id) => document.getElementById(id);

function teamBadge(teamId) {
  const t = TEAMS[teamId] || { label: teamId, color: '#888' };
  return `<span class="badge" style="--badge-color:${t.color}">${t.label}</span>`;
}

// ---------- Sélecteur de rôle par cards (fenêtre de détail joueur) ----------

const ROLE_PICKER_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'village', label: TEAMS.village.label },
  { id: 'loups', label: TEAMS.loups.label },
  { id: 'solo', label: TEAMS.solo.label },
];

let roleFilterState = 'all';

function renderRolePicker(player) {
  const tabsHtml = ROLE_PICKER_FILTERS.map(
    (f) => `<button type="button" class="filter-tab ${roleFilterState === f.id ? 'active' : ''}" data-action="role-filter" data-value="${f.id}">${f.label}</button>`
  ).join('');

  const roles = getEnabledRoles(player.roleId).filter((r) => roleFilterState === 'all' || r.team === roleFilterState);
  const cardsHtml = roles
    .map(
      (r) => `
      <button type="button" class="role-card ${r.id === player.roleId ? 'selected' : ''}" style="--team-color:${TEAMS[r.team].color}" data-action="pick-role" data-player="${player.id}" data-role="${r.id}" title="${r.desc}">
        <span class="role-card-name">${r.name}</span>
      </button>`
    )
    .join('');

  return `
    <button type="button" class="role-card role-card-none ${!player.roleId ? 'selected' : ''}" data-action="pick-role" data-player="${player.id}" data-role="">❔ Aucun rôle</button>
    <div class="filter-tabs">${tabsHtml}</div>
    <div class="role-grid">${cardsHtml}</div>`;
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
  if (tracker.type === 'swap-role') {
    // Le joueur concerné (ex. le Voleur) apparaît dans la liste mais
    // désactivé/grisé : il ne peut pas échanger son rôle avec lui-même.
    const cards = state.players
      .map((p) => {
        const isSelf = p.id === player.id;
        return `
          <button type="button" class="role-card player-pick-card ${isSelf ? 'disabled' : ''}" ${isSelf ? 'disabled' : ''}
            data-action="swap-role" data-player="${player.id}" data-target="${p.id}">
            <span class="role-card-name">${p.name}${isSelf ? ' (lui-même)' : ''}</span>
          </button>`;
      })
      .join('');
    return `<div class="tracker swap-role"><div class="tracker-label">${tracker.label}</div><div class="role-grid">${cards}</div></div>`;
  }
  return '';
}

const TEAM_SHORT = { village: 'VIL', loups: 'LG', solo: 'SOLO' };

// Pouvoir à usage limité (trackers de type toggle) encore disponibles pour
// ce joueur, ex. {remaining:1, total:2} pour une Sorcière avec une potion
// déjà utilisée. `null` si le rôle n'a pas ce genre de pouvoir.
function getPowerStatus(player) {
  const role = getRole(player.roleId);
  if (!role || !role.trackers) return null;
  // Pouvoirs à usage limité : cases à cocher classiques + cibles mortelles
  // (potion de mort, tir du Chasseur...), qui ne se réutilisent pas non plus.
  const limited = role.trackers.filter((t) => t.type === 'toggle' || (t.type === 'select-player' && t.lethal));
  if (!limited.length) return null;
  const remaining = limited.filter((t) => {
    if (t.type === 'toggle') return !player.flags[t.key];
    const val = player.flags[t.key];
    return !(val && val.current);
  }).length;
  return { remaining, total: limited.length };
}

// Rôle dont c'est le tour cette nuit (celui affiché dans la bannière de
// phase), pour mettre en avant sa ligne dans le tableau et griser les
// autres. `null` en dehors d'une étape de nuit précise (jour, standby).
function getActivePhaseRoleId() {
  if (state.phase.type !== 'night') return null;
  const steps = getActiveNightSteps(state.phase.night);
  const step = steps[state.phase.stepIndex];
  return step ? step.roleId : null;
}

// Seul le tour « Loups-Garous » regroupe plusieurs joueurs qui décident
// ensemble d'une victime : c'est le seul cas où le message générique
// « les loups éliminent... » a du sens. Le Loup Blanc et le Grand Méchant
// Loup ont chacun leur propre étape dans NIGHT_ORDER avec leur propre
// tracker (victime / secondeVictime) : avant, ils étaient inclus ici par
// erreur, ce qui empêchait leur pouvoir spécifique de s'enregistrer — le
// tap déclenchait le message générique des loups au lieu de leur tracker.
const PACK_KILL_ROLE_ID = 'loup-garou';

// Appuyer directement sur la cible pendant le tour d'un rôle déclenche son
// effet, avec une seule popup de validation — pas besoin d'ouvrir la fiche
// complète de l'acteur. Retourne true si le clic a été « consommé » par une
// action de tour (l'ouverture normale de la fiche ne doit alors pas avoir lieu).
function handleNightTargetTap(targetId) {
  const activeRoleId = getActivePhaseRoleId();
  if (!activeRoleId) return false;

  const target = getPlayer(targetId);
  if (!target || target.roleId === activeRoleId) return false; // on tape l'acteur lui-même -> fiche normale

  if (activeRoleId === PACK_KILL_ROLE_ID) {
    if (!target.alive) return false;
    askConfirm(`Les loups éliminent ${target.name} ?`).then((ok) => { if (ok) toggleAlive(target.id); });
    return true;
  }

  // Cupidon désigne deux amoureux au lieu de cibler un seul joueur : on
  // remplit le premier emplacement libre parmi les deux.
  if (activeRoleId === 'cupidon') {
    if (state.lovers.includes(target.id)) return false;
    const slot = state.lovers[0] === null ? 0 : state.lovers[1] === null ? 1 : null;
    if (slot === null) return false;
    askConfirm(`Désigner ${target.name} comme ${slot === 0 ? '1er' : '2e'} amoureux ?`).then((ok) => { if (ok) setLover(slot, target.id); });
    return true;
  }

  const role = getRole(activeRoleId);
  const actor = state.players.find((p) => p.alive && p.roleId === activeRoleId);
  if (!role || !actor || !role.trackers) return false;

  const selectTracker = role.trackers.find((t) => t.type === 'select-player');
  if (selectTracker) {
    const msg = selectTracker.lethal ? `${role.name} élimine ${target.name} ?` : `${role.name} : cibler ${target.name} ?`;
    askConfirm(msg).then((ok) => {
      if (!ok) return;
      setSelectPlayerTracker(actor.id, selectTracker.key, target.id);
      if (selectTracker.lethal && target.alive) toggleAlive(target.id);
    });
    return true;
  }

  const multiTracker = role.trackers.find((t) => t.type === 'multiselect-players');
  if (multiTracker) {
    toggleMultiselect(actor.id, multiTracker.key, target.id);
    return true;
  }

  return false;
}

// Convertit une couleur hex (#rrggbb) en rgba() avec une opacite donnee,
// pour un fond teinte a partir de --team-color (passe en style inline,
// impossible a assombrir/eclaircir en CSS pur sans connaitre les valeurs).
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Badges calcules a la volee a partir de l'etat existant, plutot que
// stockes a part : amoureux/capitaine/pouvoir epuise/sans role, plus les
// cibles des roles a tracker select-player non letal (le badge apparait
// sur la cible, pas sur l'acteur qui a deja son propre suivi dans sa fiche).
// `kind` : 'malus' (defavorable), 'bonus' (protection/avantage) ou
// 'neutral' (juste informatif).
function getPlayerBadges(player) {
  const badges = [];
  const role = getRole(player.roleId);

  if (!role) {
    badges.push({ icon: '❔', kind: 'neutral', title: 'Sans rôle', text: "Ce joueur n'a pas encore de rôle assigné." });
  }
  if (state.lovers.includes(player.id)) {
    const otherId = state.lovers[0] === player.id ? state.lovers[1] : state.lovers[0];
    const other = otherId && getPlayer(otherId);
    badges.push({
      icon: '💘', kind: 'neutral', title: 'Amoureux',
      text: other ? `Lié à ${other.name} par Cupidon — s'il meurt, l'autre meurt de chagrin.` : 'Lié à un autre joueur par Cupidon.',
    });
  }
  if (state.captainId === player.id) {
    badges.push({ icon: '👑', kind: 'neutral', title: 'Capitaine', text: 'Son vote compte double lors des votes du village.' });
  }
  const power = getPowerStatus(player);
  if (power && power.remaining === 0) {
    badges.push({ icon: '🚫', kind: 'neutral', title: 'Pouvoir épuisé', text: 'Ce joueur a déjà utilisé tout ce que son rôle permettait.' });
  }

  // Rappels pour les pouvoirs qui ne passent par aucune etape de
  // NIGHT_ORDER (voir roles.js : `onDeath` / `standingReminder`) — sans ce
  // badge, rien ne signale au MJ qu'il reste une action a declencher.
  if (role && role.trackers) {
    role.trackers.forEach((t) => {
      if (t.onDeath && t.type === 'select-player' && !player.alive) {
        const val = player.flags[t.key];
        if (!(val && val.current)) {
          badges.push({ icon: role.emoji, kind: 'malus', title: `${role.name} — pouvoir à résoudre`, text: `Vient de mourir : ouvrez sa fiche pour désigner sa cible (${t.label.toLowerCase()}).` });
        }
      }
      if (t.standingReminder && t.type === 'toggle' && player.alive && !player.flags[t.key]) {
        badges.push({ icon: role.emoji, kind: 'neutral', title: `${role.name} — pouvoir disponible`, text: `Pouvoir non utilisé (${t.label.toLowerCase()}) : peut être déclenché à tout moment, pas seulement pendant la nuit.` });
      }
    });
  }

  // Cibles designees par un role a tracker select-player non letal : le
  // badge se reflete sur la cible plutot que de rester enferme dans la
  // fiche de l'acteur (Corbeau, Gardien, Voyante pour l'instant).
  const TARGET_BADGES = {
    'capitaine-role': (actor) => ({ icon: '🐦', kind: 'malus', title: 'Cible du Corbeau', text: `${actor.name} l'a désigné cette nuit : +2 voix contre lui au prochain vote du village.` }),
    gardien: (actor) => ({ icon: '🛡️', kind: 'bonus', title: 'Protégé', text: `Protégé cette nuit par ${actor.name} (Gardien) contre les loups.` }),
    voyante: (actor) => ({ icon: '🔮', kind: 'neutral', title: 'Sondé par la Voyante', text: `${actor.name} a découvert son rôle cette nuit.` }),
  };
  state.players.forEach((actor) => {
    if (!actor.alive || actor.id === player.id) return;
    const actorRole = getRole(actor.roleId);
    const makeBadge = actorRole && TARGET_BADGES[actorRole.id];
    if (!makeBadge || !actorRole.trackers) return;
    actorRole.trackers.forEach((t) => {
      if (t.type !== 'select-player' || t.lethal) return;
      const val = actor.flags[t.key];
      if (val && val.current === player.id) badges.push(makeBadge(actor));
    });
  });

  return badges;
}

function renderBadgePill(badge, uid) {
  return `
    <span class="badge-pill ${badge.kind}" data-badge-tip="${uid}" title="${badge.title} — ${badge.text}">${badge.icon}</span>`;
}

// Une seule ligne dense par joueur : avatar / rôle / camp / nom / vie ou
// mort / bande de badges (statuts calculés par getPlayerBadges). Le fond
// se teinte de la couleur du camp pendant le tour du rôle correspondant
// (isNightActor), pour repérer d'un coup d'œil qui est appelé. Le détail
// complet (rôle, pouvoirs, notes, actions, explication des badges) s'ouvre
// au clic sur la carte.
function renderPlayerCard(player, activeRoleId) {
  const role = getRole(player.roleId);
  const teamColor = role ? TEAMS[role.team].color : '#5a6280';
  const badges = getPlayerBadges(player);

  const isNightActor = activeRoleId && player.roleId === activeRoleId;
  const cardClass = ['player-card', player.alive ? '' : 'dead', isNightActor ? 'night-actor' : ''].filter(Boolean).join(' ');
  const cardStyle = `--team-color:${teamColor};--team-color-soft:${hexToRgba(teamColor, 0.22)}`;

  return `
    <button type="button" class="${cardClass}" style="${cardStyle}" data-action="open-player" data-player="${player.id}">
      <span class="player-card-head">
        <span class="player-avatar">${player.name.charAt(0).toUpperCase()}</span>
        <span class="player-card-info">
          <span class="player-card-name">${player.name}</span>
          <span class="player-card-role">
            ${role ? `${role.emoji} ${role.name}` : '❔ Sans rôle'}
            <span class="player-card-tag" style="--tag-color:${teamColor}">${role ? TEAM_SHORT[role.team] : '—'}</span>
          </span>
        </span>
        <span class="player-card-life">${player.alive ? '❤' : '💀'}</span>
      </span>
      ${badges.length ? `<span class="player-card-badges">${badges.map((b, i) => renderBadgePill(b, `${player.id}-${i}`)).join('')}</span>` : ''}
    </button>`;
}

// Contenu de la fenêtre de détail ouverte au clic sur une ligne.
function renderPlayerDetail(player) {
  const role = getRole(player.roleId);
  const trackersHtml = role && role.trackers ? role.trackers.map((t) => renderTracker(player, t)).join('') : '';

  // Le choix libre du rôle (grille de cards) n'est disponible qu'en setup
  // ou en pause. Une fois la partie lancée, seuls les pouvoirs de rôle
  // (trackers, ex. l'échange du Voleur) peuvent encore changer un rôle.
  const roleLocked = state.status === 'running';
  const rolePickerHtml = roleLocked
    ? `<div class="role-locked">${role ? `${role.emoji} ${role.name}` : '❔ Aucun rôle'}</div>
       <p class="lock-note">🔒 Verrouillé — mettez la partie en pause pour changer de rôle.</p>`
    : renderRolePicker(player);

  const badges = getPlayerBadges(player);
  const badgesHtml = badges.length
    ? `<div class="player-detail-badges">
        <p class="tracker-label">Statuts actifs</p>
        ${badges.map((b) => `
          <div class="badge-row ${b.kind}">
            <span class="badge-pill ${b.kind}">${b.icon}</span>
            <span class="badge-row-text"><strong>${b.title}</strong> — ${b.text}</span>
          </div>`).join('')}
      </div>`
    : '';

  return `
    <div class="player-detail-head">
      <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
      <span class="player-detail-name">${player.name}</span>
    </div>
    ${badgesHtml}
    <p class="tracker-label">Rôle</p>
    ${rolePickerHtml}
    ${role ? `<div class="role-desc">${teamBadge(role.team)} ${role.desc}</div>` : ''}
    ${trackersHtml}
    <label class="notes">
      Notes
      <textarea data-action="set-notes" data-player="${player.id}" placeholder="Particularités, accords, rôle personnalisé...">${player.notes || ''}</textarea>
    </label>
    <div class="player-detail-actions">
      <button data-action="toggle-alive" data-player="${player.id}" class="btn small ${player.alive ? 'danger' : 'ghost'}">
        ${player.alive ? '☠️ Éliminer' : '↩️ Ressusciter'}
      </button>
      <button data-action="remove-player" data-player="${player.id}" class="btn small ghost">✕ Retirer</button>
    </div>`;
}

function showPlayerDetail(id) {
  const player = getPlayer(id);
  if (!player) return;
  const role = getRole(player.roleId);
  el('player-detail-overlay').querySelector('.role-detail-card').style.setProperty('--team-color', role ? TEAMS[role.team].color : 'transparent');
  el('player-detail-body').innerHTML = renderPlayerDetail(player);
  el('player-detail-overlay').hidden = false;
}

function hidePlayerDetail() {
  el('player-detail-overlay').hidden = true;
}

// Si le joueur affiché dans la fenêtre de détail vient de changer d'état
// (rôle, notes...), on la re-render pour rester synchronisée.
function refreshOpenPlayerDetail() {
  const overlay = el('player-detail-overlay');
  if (overlay.hidden) return;
  const openId = overlay.querySelector('[data-player]')?.dataset.player;
  if (openId && getPlayer(openId)) showPlayerDetail(openId);
  else hidePlayerDetail();
}

function renderStatBar() {
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);

  return `
    <div class="stat-bar">
      <div class="stat"><span class="stat-num">${state.phase.night}</span><span class="stat-label">🌙 Nuit</span></div>
      <div class="stat"><span class="stat-num deaths">${dead.length}</span><span class="stat-label">💀 Morts</span></div>
      <div class="stat"><span class="stat-num alive">${alive.length}</span><span class="stat-label">❤️ Vivants</span></div>
    </div>
    ${dead.length ? `<div class="dead-list"><strong>Éliminés :</strong> ${dead.map((p) => `${p.name}${getRole(p.roleId) ? ' (' + getRole(p.roleId).name + ')' : ''}`).join(', ')}</div>` : ''}`;
}

function renderPhaseBanner() {
  const { phase } = state;
  let label;
  if (phase.type === 'standby') {
    label = '🎬 Partie prête — ▶ pour commencer la Nuit 1';
  } else if (phase.type === 'day') {
    label = `☀️ Jour ${phase.night} — Débats et vote`;
  } else {
    const steps = getActiveNightSteps(phase.night);
    const step = steps[phase.stepIndex];
    label = step ? `🌙 Nuit ${phase.night} — Tour : ${step.label}` : `🌙 Nuit ${phase.night}`;
  }

  const bannerClass = phase.type === 'day' ? 'is-day' : phase.type === 'standby' ? 'is-standby' : 'is-night';

  return `
    <div class="phase-banner ${bannerClass}">
      <span class="phase-label">${label}</span>
      <div class="phase-nav">
        <button type="button" data-action="phase-prev" class="btn small ghost" title="Étape précédente" ${phase.type === 'standby' ? 'disabled' : ''}>◀</button>
        <button type="button" data-action="phase-next" class="btn small" title="Étape suivante">▶</button>
      </div>
    </div>`;
}

// Statut de la partie affiché sous les actions du haut : bouton pour
// démarrer, puis mettre en pause / reprendre pour débloquer temporairement
// les rôles et les amoureux une fois la partie lancée.
function renderGameStatusBar() {
  if (state.status === 'setup') {
    return `<button type="button" data-action="start-game" class="btn primary start-game-btn">🚀 Démarrer la partie</button>`;
  }
  if (state.status === 'frozen') {
    return `
      <div class="freeze-banner">
        <span>⏸ Modification en cours — rôles et amoureux déverrouillés.</span>
        <button type="button" data-action="resume-game" class="btn small primary">▶ Reprendre</button>
      </div>`;
  }
  return `
    <div class="top-actions">
      <button type="button" data-action="freeze-game" class="btn small ghost">⏸ Modifier (pause)</button>
    </div>`;
}

function renderLoversAndCaptain() {
  const loversLocked = state.status === 'running';
  return `
    <div class="panel">
      <h3>💘 Amoureux (Cupidon)</h3>
      <div class="row">
        <select data-action="set-lover" data-index="0" ${loversLocked ? 'disabled' : ''}>${playerOptions(state.lovers[0])}</select>
        <select data-action="set-lover" data-index="1" ${loversLocked ? 'disabled' : ''}>${playerOptions(state.lovers[1])}</select>
      </div>
      ${loversLocked ? '<p class="lock-note">🔒 Verrouillé — mettez la partie en pause pour modifier.</p>' : ''}
    </div>
    <div class="panel">
      <h3>👑 Capitaine</h3>
      <select data-action="set-captain">${playerOptions(state.captainId)}</select>
    </div>`;
}

function renderWinnerBanner() {
  if (!state.winner || winnerBannerDismissed) return '';
  return `
    <div class="winner-banner team-${state.winner.team}">
      <div>
        <strong>🏆 ${state.winner.label}</strong>
        <p>${state.winner.detail}</p>
      </div>
      <button type="button" data-action="dismiss-winner" class="btn small ghost" title="Masquer">✕</button>
    </div>`;
}

function render() {
  el('winner-banner').innerHTML = renderWinnerBanner();
  el('game-status-bar').innerHTML = renderGameStatusBar();
  el('stat-bar').innerHTML = renderStatBar();
  el('phase-banner').innerHTML = renderPhaseBanner();
  el('side-panels').innerHTML = renderLoversAndCaptain();
  el('test-tools').innerHTML = renderTestTools();
  el('players').innerHTML = state.players.length
    ? `<div class="player-grid">${state.players.map((p) => renderPlayerCard(p, getActivePhaseRoleId())).join('')}</div>`
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
    if (action === 'open-player' && !handleNightTargetTap(t.dataset.player)) showPlayerDetail(t.dataset.player);
    if (action === 'toggle-alive') { toggleAlive(t.dataset.player); refreshOpenPlayerDetail(); }
    if (action === 'remove-player') { removePlayer(t.dataset.player); refreshOpenPlayerDetail(); }
    if (action === 'toggle-multiselect') { toggleMultiselect(t.dataset.player, t.dataset.key, t.dataset.target); refreshOpenPlayerDetail(); }
    if (action === 'pick-role') { setPlayerRole(t.dataset.player, t.dataset.role); refreshOpenPlayerDetail(); }
    if (action === 'swap-role') { swapPlayerRoles(t.dataset.player, t.dataset.target); refreshOpenPlayerDetail(); }
    if (action === 'role-filter') { roleFilterState = t.dataset.value; refreshOpenPlayerDetail(); }
    if (action === 'phase-next') advancePhase();
    if (action === 'phase-prev') retreatPhase();
    if (action === 'start-game') startGame();
    if (action === 'dismiss-winner') dismissWinnerBanner();
    if (action === 'fill-test-players') fillTestPlayers();
    if (action === 'freeze-game') freezeGame();
    if (action === 'resume-game') resumeGame();
  });

  el('player-detail-close').addEventListener('click', hidePlayerDetail);
  el('player-detail-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'player-detail-overlay') hidePlayerDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePlayerDetail();
  });

  document.body.addEventListener('change', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;
    if (action === 'toggle-flag') { toggleFlag(t.dataset.player, t.dataset.key); refreshOpenPlayerDetail(); }
    if (action === 'select-player') {
      const player = getPlayer(t.dataset.player);
      const role = player && getRole(player.roleId);
      const tracker = role && role.trackers && role.trackers.find((tr) => tr.key === t.dataset.key);
      const target = t.value ? getPlayer(t.value) : null;
      if (tracker && tracker.lethal && target && target.alive) {
        askConfirm(`Éliminer ${target.name} ?`).then((ok) => {
          if (!ok) { refreshOpenPlayerDetail(); return; } // annule visuellement la sélection
          setSelectPlayerTracker(t.dataset.player, t.dataset.key, t.value);
          toggleAlive(target.id);
          refreshOpenPlayerDetail();
        });
      } else {
        setSelectPlayerTracker(t.dataset.player, t.dataset.key, t.value);
        refreshOpenPlayerDetail();
      }
    }
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
