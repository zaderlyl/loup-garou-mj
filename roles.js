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
//  - swap-role          : le MJ choisit un joueur et les deux rôles s'inversent
//                        (ex : le Voleur échange son rôle ; il ne peut pas se choisir lui-même)
//
// `lethal: true` sur un tracker select-player signifie que désigner une
// cible l'élimine directement (ex : potion de mort de la Sorcière, tir du
// Chasseur, victime du Loup Blanc) — panel.html : côté panel, taper
// directement sur la cible pendant le tour du rôle déclenche l'action avec
// une seule popup de validation, sans passer par la fiche complète.
//
// `emoji` sert de repère visuel temporaire sur les cards du Hub, en attendant
// une vraie illustration par rôle (idée future).
//
// `wake` décrit quand le rôle se réveille la nuit (utilisé dans le panneau
// de détail affiché par appui long sur une card, côté Hub).

const TEAMS = {
  village: { label: 'Village', color: '#4f8f6f' },
  loups: { label: 'Loups-Garous', color: '#a8534a' },
  solo: { label: 'Solitaire', color: '#7d63a8' },
};

const ROLES = [
  {
    id: 'villageois',
    name: 'Villageois',
    team: 'village',
    emoji: '🧑‍🌾',
    wake: "Ne se réveille jamais : rôle passif.",
    desc: "Aucun pouvoir particulier. Vote le jour pour éliminer un suspect.",
  },
  {
    id: 'loup-garou',
    name: 'Loup-Garou',
    team: 'loups',
    emoji: '🐺',
    wake: "Se réveille chaque nuit, avec les autres loups.",
    desc: "Se réunit avec les autres loups chaque nuit pour dévorer un villageois.",
  },
  {
    id: 'voyante',
    name: 'Voyante',
    team: 'village',
    emoji: '🔮',
    wake: "Se réveille chaque nuit, seule.",
    desc: "Chaque nuit, découvre en secret le rôle d'un joueur de son choix.",
    trackers: [{ key: 'sondage', label: 'Sonder...', type: 'select-player' }],
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    team: 'village',
    emoji: '🧙‍♀️',
    wake: "Se réveille chaque nuit, seule (peut choisir de ne rien faire).",
    desc: "Possède deux potions à usage unique : une de vie (sauve la victime des loups) et une de mort (élimine un joueur).",
    trackers: [
      { key: 'potionVie', label: 'Potion de vie utilisée', type: 'toggle' },
      { key: 'potionMort', label: 'Potion de mort (cible)', type: 'select-player', lethal: true },
    ],
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    team: 'village',
    emoji: '🏹',
    wake: "Ne se réveille pas la nuit ; agit uniquement au moment de sa mort.",
    desc: "Quand il meurt (nuit ou jour), désigne immédiatement un joueur qui meurt avec lui.",
    trackers: [{ key: 'victime', label: 'Tire sur...', type: 'select-player', lethal: true }],
  },
  {
    id: 'cupidon',
    name: 'Cupidon',
    team: 'village',
    emoji: '💘',
    wake: "Se réveille une seule fois, la toute première nuit.",
    desc: "La première nuit, désigne deux joueurs qui deviennent amoureux (voir section « Amoureux » ci-dessous). Si l'un meurt, l'autre meurt de chagrin.",
  },
  {
    id: 'petite-fille',
    name: 'Petite Fille',
    team: 'village',
    emoji: '👧',
    wake: "Reste éveillée pendant le tour des loups, à ses risques.",
    desc: "Peut espionner discrètement les loups pendant leur réveil, au risque de se faire repérer.",
    trackers: [{ key: 'espionne', label: 'A espionné les loups cette nuit', type: 'toggle' }],
  },
  {
    id: 'voleur',
    name: 'Voleur',
    team: 'village',
    emoji: '🥷',
    wake: "Se réveille une seule fois, avant même la première nuit.",
    desc: "Au tout début de la partie, peut échanger son rôle avec l'une des deux cartes restées de côté.",
    trackers: [{ key: 'echange', label: 'Échanger son rôle avec...', type: 'swap-role' }],
  },
  {
    id: 'ancien',
    name: 'Ancien',
    team: 'village',
    emoji: '👴',
    wake: "Ne se réveille jamais : pouvoir passif.",
    desc: "Survit à la première attaque des loups. S'il est éliminé par un vote du village, tous les villageois perdent leurs pouvoirs.",
    trackers: [{ key: 'aSurvecu', label: 'A survécu à une attaque de loups', type: 'toggle' }],
  },
  {
    id: 'bouc-emissaire',
    name: 'Bouc Émissaire',
    team: 'village',
    emoji: '🐐',
    wake: "Ne se réveille jamais : pouvoir passif (déclenché par un vote).",
    desc: "En cas d'égalité de votes le jour, c'est lui qui est éliminé à la place d'un second tour.",
    trackers: [{ key: 'elimineEgalite', label: "Éliminé sur égalité de votes", type: 'toggle' }],
  },
  {
    id: 'gardien',
    name: 'Gardien / Salvateur',
    team: 'village',
    emoji: '🛡️',
    wake: "Se réveille chaque nuit, seul.",
    desc: "Chaque nuit, protège un joueur de son choix contre les loups (jamais le même deux nuits de suite).",
    trackers: [{ key: 'protection', label: 'Protège cette nuit', type: 'select-player' }],
  },
  {
    id: 'ange',
    name: 'Ange',
    team: 'solo',
    emoji: '👼',
    wake: "Ne se réveille jamais : pouvoir passif (condition de victoire).",
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
    wake: "Ne se réveille jamais seul ; peut être réveillé une fois par le MJ.",
    desc: "Dort à l'écart du village. Peut être réveillé une seule fois par le MJ pour communiquer avec les loups ou consulter une carte.",
    trackers: [{ key: 'reveille', label: 'Déjà réveillé une fois', type: 'toggle' }],
  },
  {
    id: 'idiot-du-village',
    name: 'Idiot du Village',
    team: 'village',
    emoji: '🤡',
    wake: "Ne se réveille jamais : pouvoir passif (déclenché par un vote).",
    desc: "S'il est éliminé par un vote du village, il révèle son rôle et survit — mais perd définitivement son droit de vote.",
    trackers: [{ key: 'immuniteUtilisee', label: 'Immunité utilisée (grillé mais vivant)', type: 'toggle' }],
  },
  {
    id: 'joueur-de-flute',
    name: 'Joueur de Flûte',
    team: 'solo',
    emoji: '🎶',
    wake: "Se réveille chaque nuit, seul.",
    desc: "Chaque nuit, charme deux joueurs. Gagne seul quand tous les joueurs encore en vie sont charmés.",
    trackers: [{ key: 'charmes', label: 'Joueurs charmés', type: 'multiselect-players' }],
  },
  {
    id: 'loup-blanc',
    name: 'Loup Blanc',
    team: 'loups',
    emoji: '🐾',
    wake: "Se réveille avec les loups chaque nuit, puis seul une nuit sur deux.",
    desc: "Loup solitaire : vote avec les loups la nuit, mais peut aussi tuer un autre loup une nuit sur deux. Doit être l'unique survivant pour gagner.",
    trackers: [{ key: 'victime', label: 'Tue un loup...', type: 'select-player', lethal: true }],
  },
  {
    id: 'grand-mechant-loup',
    name: 'Grand Méchant Loup',
    team: 'loups',
    emoji: '💀',
    wake: "Se réveille avec les autres loups, chaque nuit.",
    desc: "Tant qu'aucun loup n'est mort, peut dévorer une seconde victime en plus de celle des loups.",
    trackers: [
      { key: 'peutDoubler', label: 'Pouvoir actif (aucun loup mort)', type: 'toggle' },
      { key: 'secondeVictime', label: 'Dévore une seconde victime...', type: 'select-player', lethal: true },
    ],
  },
  {
    id: 'soeurs',
    name: 'Les Sœurs',
    team: 'village',
    emoji: '👭',
    wake: "Se réveillent ensemble, la toute première nuit uniquement.",
    desc: "Se reconnaissent entre elles dès la première nuit.",
  },
  {
    id: 'freres',
    name: 'Les Frères',
    team: 'village',
    emoji: '👬',
    wake: "Se réveillent ensemble, la toute première nuit uniquement.",
    desc: "Se reconnaissent entre eux dès la première nuit.",
  },
  {
    id: 'capitaine-role',
    name: 'Corbeau',
    team: 'village',
    emoji: '🐦‍⬛',
    wake: "Se réveille chaque nuit, seul.",
    desc: "Chaque nuit, désigne secrètement un joueur qui recevra deux voix contre lui au vote du lendemain.",
    trackers: [{ key: 'cible', label: 'Cible désignée pour le vote du lendemain', type: 'select-player' }],
  },
  {
    id: 'autre',
    name: 'Autre / Personnalisé',
    team: 'village',
    emoji: '❓',
    wake: "À définir selon le rôle personnalisé.",
    desc: "Rôle non listé : utilisez le champ de notes du joueur pour décrire son pouvoir et suivre son état.",
  },
];

function getRole(roleId) {
  return ROLES.find((r) => r.id === roleId) || null;
}
