# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit les principes de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Unreleased]

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
