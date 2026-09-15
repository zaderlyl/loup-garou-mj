// Paramètres de partie, gérés depuis le Hub (hub.html) et lus par le panel
// MJ principal (app.js) pour adapter la liste des rôles proposés.

const SETTINGS_KEY = 'lgmj-settings-v1';

function defaultSettings() {
  return {
    gameName: '',
    expectedPlayers: null,
    // null = tous les rôles du catalogue sont autorisés
    enabledRoles: null,
    houseRules: '',
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Paramètres corrompus, réinitialisation.', e);
  }
  return defaultSettings();
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Rôles autorisés pour la partie en cours, selon les paramètres du Hub.
// Retourne toujours le rôle donné en plus (utile pour ne pas masquer le rôle
// déjà assigné à un joueur si l'MJ le désactive après coup).
function getEnabledRoles(currentRoleId) {
  const settings = loadSettings();
  if (!settings.enabledRoles || settings.enabledRoles.length === 0) {
    return ROLES;
  }
  const enabled = ROLES.filter((r) => settings.enabledRoles.includes(r.id));
  if (currentRoleId && !settings.enabledRoles.includes(currentRoleId)) {
    const current = getRole(currentRoleId);
    if (current) enabled.push(current);
  }
  return enabled;
}
