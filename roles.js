// Catalogue des rôles du Loup-Garou de Thiercelieux (base + extensions courantes).
// Chaque rôle peut définir des "trackers" : des états que le MJ suit pendant la partie
// (ex : potions de la sorcière, tirs du chasseur, protection du gardien...).
//
// Types de tracker :
//  - toggle            : case à cocher simple (pouvoir utilisé ou non)
//  - info              : rappel textuel, rien à cocher
//  - select-player     : le MJ choisit un joueur vivant (ex : cible protégée cette nuit)
//                        -> un historique des choix précédents est conservé automatiquement
//  - multiselect-players : ensemble de joueurs (ex : joueurs charmés par le joueur de flûte)
//
// `emoji` sert de repère visuel temporaire sur les cards du Hub, en attendant
// une vraie illustration par rôle (idée future).

const TEAMS = {
  village: { label: 'Village', color: '#2f9e6b' },
  loups: { label: 'Loups-Garous', color: '#c44536' },
  solo: { label: 'Solitaire', color: '#8657c9' },
};

const ROLES = [
  {
    id: 'villageois',
    name: 'Villageois',
    team: 'village',
    emoji: '🧑‍🌾',
    desc: "Aucun pouvoir particulier. Vote le jour pour éliminer un suspect.",
  },
  {
    id: 'loup-garou',
    name: 'Loup-Garou',
    team: 'loups',
    emoji: '🐺',
    desc: "Se réunit avec les autres loups chaque nuit pour dévorer un villageois.",
  },
  {
    id: 'voyante',
    name: 'Voyante',
    team: 'village',
    emoji: '🔮',
    desc: "Chaque nuit, découvre en secret le rôle d'un joueur de son choix.",
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    team: 'village',
    emoji: '🧙‍♀️',
    desc: "Possède deux potions à usage unique : une de vie (sauve la victime des loups) et une de mort (élimine un joueur).",
    trackers: [
      { key: 'potionVie', label: 'Potion de vie utilisée', type: 'toggle' },
      { key: 'potionMort', label: 'Potion de mort utilisée', type: 'toggle' },
    ],
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    team: 'village',
    emoji: '🏹',
    desc: "Quand il meurt (nuit ou jour), désigne immédiatement un joueur qui meurt avec lui.",
    trackers: [{ key: 'aTire', label: 'A désigné une victime en mourant', type: 'toggle' }],
  },
  {
    id: 'cupidon',
    name: 'Cupidon',
    team: 'village',
    emoji: '💘',
    desc: "La première nuit, désigne deux joueurs qui deviennent amoureux (voir section « Amoureux » ci-dessous). Si l'un meurt, l'autre meurt de chagrin.",
  },
  {
    id: 'petite-fille',
    name: 'Petite Fille',
    team: 'village',
    emoji: '👧',
    desc: "Peut espionner discrètement les loups pendant leur réveil, au risque de se faire repérer.",
    trackers: [{ key: 'espionne', label: 'A espionné les loups cette nuit', type: 'toggle' }],
  },
  {
    id: 'voleur',
    name: 'Voleur',
    team: 'village',
    emoji: '🥷',
    desc: "Au tout début de la partie, peut échanger son rôle avec l'une des deux cartes restées de côté.",
    trackers: [{ key: 'aEchange', label: 'A échangé son rôle', type: 'toggle' }],
  },
  {
    id: 'ancien',
    name: 'Ancien',
    team: 'village',
    emoji: '👴',
    desc: "Survit à la première attaque des loups. S'il est éliminé par un vote du village, tous les villageois perdent leurs pouvoirs.",
    trackers: [{ key: 'aSurvecu', label: 'A survécu à une attaque de loups', type: 'toggle' }],
  },
  {
    id: 'bouc-emissaire',
    name: 'Bouc Émissaire',
    team: 'village',
    emoji: '🐐',
    desc: "En cas d'égalité de votes le jour, c'est lui qui est éliminé à la place d'un second tour.",
    trackers: [{ key: 'elimineEgalite', label: "Éliminé sur égalité de votes", type: 'toggle' }],
  },
  {
    id: 'gardien',
    name: 'Gardien / Salvateur',
    team: 'village',
    emoji: '🛡️',
    desc: "Chaque nuit, protège un joueur de son choix contre les loups (jamais le même deux nuits de suite).",
    trackers: [{ key: 'protection', label: 'Protège cette nuit', type: 'select-player' }],
  },
  {
    id: 'ange',
    name: 'Ange',
    team: 'solo',
    emoji: '👼',
    desc: "Gagne seul s'il est éliminé (vote ou nuit) avant la fin du deuxième tour de jeu. Sinon redevient simple villageois.",
    trackers: [
      { key: 'info', label: "Doit mourir avant la fin du tour 2 pour gagner seul", type: 'info' },
      { key: 'aGagne', label: 'A gagné (éliminé à temps)', type: 'toggle' },
    ],
  },
  {
    id: 'ermite',
    name: 'Ermite',
    team: 'village',
    emoji: '🧎',
    desc: "Dort à l'écart du village. Peut être réveillé une seule fois par le MJ pour communiquer avec les loups ou consulter une carte.",
    trackers: [{ key: 'reveille', label: 'Déjà réveillé une fois', type: 'toggle' }],
  },
  {
    id: 'idiot-du-village',
    name: 'Idiot du Village',
    team: 'village',
    emoji: '🤡',
    desc: "S'il est éliminé par un vote du village, il révèle son rôle et survit — mais perd définitivement son droit de vote.",
    trackers: [{ key: 'immuniteUtilisee', label: 'Immunité utilisée (grillé mais vivant)', type: 'toggle' }],
  },
  {
    id: 'joueur-de-flute',
    name: 'Joueur de Flûte',
    team: 'solo',
    emoji: '🎶',
    desc: "Chaque nuit, charme deux joueurs. Gagne seul quand tous les joueurs encore en vie sont charmés.",
    trackers: [{ key: 'charmes', label: 'Joueurs charmés', type: 'multiselect-players' }],
  },
  {
    id: 'loup-blanc',
    name: 'Loup Blanc',
    team: 'loups',
    emoji: '🐾',
    desc: "Loup solitaire : vote avec les loups la nuit, mais peut aussi tuer un autre loup une nuit sur deux. Doit être l'unique survivant pour gagner.",
    trackers: [{ key: 'tueUnLoup', label: 'A tué un loup cette nuit (1 nuit sur 2)', type: 'toggle' }],
  },
  {
    id: 'grand-mechant-loup',
    name: 'Grand Méchant Loup',
    team: 'loups',
    emoji: '💀',
    desc: "Tant qu'aucun loup n'est mort, peut dévorer une seconde victime en plus de celle des loups.",
    trackers: [{ key: 'peutDoubler', label: "Pouvoir actif (aucun loup mort)", type: 'toggle' }],
  },
  {
    id: 'soeurs',
    name: 'Les Sœurs',
    team: 'village',
    emoji: '👭',
    desc: "Se reconnaissent entre elles dès la première nuit.",
  },
  {
    id: 'freres',
    name: 'Les Frères',
    team: 'village',
    emoji: '👬',
    desc: "Se reconnaissent entre eux dès la première nuit.",
  },
  {
    id: 'capitaine-role',
    name: 'Corbeau',
    team: 'village',
    emoji: '🐦‍⬛',
    desc: "Chaque nuit, désigne secrètement un joueur qui recevra deux voix contre lui au vote du lendemain.",
    trackers: [{ key: 'cible', label: 'Cible désignée pour le vote du lendemain', type: 'select-player' }],
  },
  {
    id: 'autre',
    name: 'Autre / Personnalisé',
    team: 'village',
    emoji: '❓',
    desc: "Rôle non listé : utilisez le champ de notes du joueur pour décrire son pouvoir et suivre son état.",
  },
];

function getRole(roleId) {
  return ROLES.find((r) => r.id === roleId) || null;
}
