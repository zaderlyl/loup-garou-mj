# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit les principes de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Unreleased]

### Added
- Page d'accueil (`index.html`) : « Nouvelle partie », « Reprendre la partie en
  cours » (si une partie est déjà en `localStorage`), et un aperçu du projet.
- Hub (`hub.html`) pour configurer une partie avant de la lancer : nom de
  partie, nombre de joueurs attendus (validé en direct), sélection des rôles
  autorisés sous forme de cards filtrables par camp, sets de rôles recommandés
  selon le nombre de joueurs, règles maison, et détail complet d'un rôle par
  appui long sur sa card.
- Panel MJ (`panel.html`, anciennement `index.html`) : cycle de partie complet
  — composition libre en setup, puis « Démarrer la partie » qui verrouille les
  rôles et les amoureux (modifiables uniquement via « Modifier / pause »), les
  pouvoirs de rôle restant utilisables en continu.
- Déroulé de nuit guidé : bannière de phase jour/nuit navigable (◀/▶) suivant
  l'ordre de réveil classique du Loup-Garou de Thiercelieux, n'affichant que
  les rôles effectivement distribués à un joueur vivant.
- Pouvoirs de rôle directement jouables : taper la cible d'un joueur pendant
  le tour de son rôle déclenche l'effet (élimination, ciblage, désignation
  d'amoureux...) avec une confirmation stylée — pour les loups, la Sorcière
  (potion de mort), le Chasseur, le Gardien, le Corbeau, le Loup Blanc, le
  Grand Méchant Loup, le Joueur de Flûte et Cupidon.
- Pouvoir du Voleur : échange son rôle avec celui d'un autre joueur (grille
  de joueurs, lui-même désactivé puisqu'il ne peut pas se choisir).
- Rappels automatiques pour les pouvoirs qui ne suivent pas l'ordre de nuit :
  la fiche du Chasseur s'ouvre seule à sa mort, un badge signale le pouvoir
  disponible de l'Ermite tant qu'il n'a pas été utilisé.
- Badges de statut sur chaque joueur (amoureux, capitaine, pouvoir épuisé,
  sans rôle, cible d'un pouvoir en cours comme protégé/sondé/visé...).
- Mode test : remplissage aléatoire de joueurs et de rôles (respectant les
  rôles autorisés par le Hub) pour itérer rapidement sans saisie manuelle.
- Mini-fenêtre de confirmation stylée (`confirm.js`, partagée Hub + Panel) à
  la place du `confirm()` natif du navigateur.

### Changed
- Direction artistique adoucie sur les trois pages : palette désaturée, fond
  charbon, typographie Fraunces/Manrope, boutons à contour discret — après un
  premier essai en pixel-art complet, abandonné au profit de ce rendu plus
  sobre.
- Liste des joueurs affichée en cards (chacune un vrai `<button>`) plutôt
  qu'en tableau dense, pour la navigation clavier et les lecteurs d'écran.
- `style.css` renommé `panel.css` (suit le renommage de la page).

### Fixed
- Le Loup Blanc et le Grand Méchant Loup déclenchaient à tort le message
  générique « les loups éliminent... » pendant leur propre tour au lieu
  d'utiliser leur pouvoir dédié (tracker `select-player` létal).

## [1.0.0] — 2026-09-15

### Added
- Première base du panel MJ : `index.html`, `style.css`, `roles.js`, `app.js`.
- Gestion des joueurs (ajout, suppression, statut vivant/mort, notes libres).
- Catalogue de rôles (Villageois, Loup-Garou, Voyante, Sorcière, Chasseur,
  Cupidon, Petite Fille, Voleur, Ancien, Bouc Émissaire, Gardien/Salvateur,
  Ange, Ermite, Idiot du Village, Joueur de Flûte, Loup Blanc, Grand Méchant
  Loup, Sœurs, Frères, Corbeau, Autre/Personnalisé) avec suivi des pouvoirs
  spécifiques à chacun (potions de la sorcière, tir du chasseur, protection
  du gardien avec historique, charmes du joueur de flûte, etc.).
- Sections globales Amoureux (Cupidon), Capitaine et compteur de tour de jeu.
- Résumé en temps réel des vivants/morts par camp.
- Sauvegarde automatique de l'état de la partie dans le `localStorage`.
- `README.md` décrivant le projet et son utilisation.
