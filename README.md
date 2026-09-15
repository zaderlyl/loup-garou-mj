# Panel MJ — Loup-Garou de Thiercelieux

Petite application web (sans backend) pour aider un Maître du Jeu à suivre en direct,
depuis son téléphone, la partie de Loup-Garou de Thiercelieux en cours :

- Liste des joueurs avec leur rôle
- Statut vivant / mort
- Suivi des pouvoirs spécifiques à chaque rôle (potions de la sorcière, tir du chasseur,
  protection du gardien, charmes du joueur de flûte, etc.)
- Amoureux (Cupidon) et Capitaine
- Compteur de tour de jeu
- Champ de notes libre sur chaque joueur pour tout rôle personnalisé ou règle maison

Aucune donnée ne quitte l'appareil : tout est sauvegardé dans le `localStorage` du navigateur.

## Utilisation

Ouvrir simplement `index.html` dans un navigateur, ou servir le dossier en local :

```bash
python3 -m http.server 8000
```

puis aller sur `http://localhost:8000`.

Peut aussi être publié gratuitement sur GitHub Pages (Settings → Pages → Deploy from branch `main`)
pour y accéder directement depuis un téléphone.

## Rôles couverts

Villageois, Loup-Garou, Voyante, Sorcière, Chasseur, Cupidon, Petite Fille, Voleur, Ancien,
Bouc Émissaire, Gardien / Salvateur, Ange, Ermite, Idiot du Village, Joueur de Flûte,
Loup Blanc, Grand Méchant Loup, Sœurs, Frères, Corbeau, et un rôle « Autre / Personnalisé »
pour toute variante non listée (à décrire dans les notes du joueur).

## Structure

- `index.html` — structure de la page
- `style.css` — thème sombre, mobile-first
- `roles.js` — catalogue des rôles et de leurs pouvoirs suivis
- `app.js` — logique de l'application (état, rendu, sauvegarde locale)
