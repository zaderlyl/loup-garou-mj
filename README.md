# Panel MJ — Loup-Garou de Thiercelieux

Application web (sans backend) pour aider un Maître du Jeu à configurer et
suivre en direct, depuis son téléphone, une partie de Loup-Garou de
Thiercelieux.

Aucune donnée ne quitte l'appareil : tout est sauvegardé dans le
`localStorage` du navigateur.

## Les trois pages

- **Accueil** (`index.html`) — « Nouvelle partie », ou « Reprendre la partie
  en cours » si une partie est déjà enregistrée. Un bouton d'info donne un
  aperçu du projet.
- **Hub** (`hub.html`) — configuration d'une partie avant de la lancer : nom
  de la partie, nombre de joueurs attendus, sélection des rôles autorisés
  (avec sets recommandés selon le nombre de joueurs), règles maison. Chaque
  rôle a une fiche de détail accessible par appui long.
- **Panel** (`panel.html`) — le suivi de la partie elle-même : liste des
  joueurs, attribution des rôles, statut vivant/mort, amoureux, capitaine.
  Une fois « Démarrer la partie » lancé, un déroulé de nuit guide le MJ à
  travers l'ordre de réveil des rôles ; taper directement sur la cible d'un
  joueur pendant le tour de son rôle déclenche son pouvoir (élimination,
  protection, échange...) avec une confirmation stylée. Un bouton « Modifier
  (pause) » permet de tout déverrouiller temporairement en cas de besoin.

## Utilisation

Ouvrir `index.html` dans un navigateur, ou servir le dossier en local :

```bash
python3 -m http.server 8000
```

puis aller sur `http://localhost:8000`.

Peut aussi être publié gratuitement sur GitHub Pages (Settings → Pages → Deploy from branch `main`)
pour y accéder directement depuis un téléphone.

En setup, un bouton « Remplir avec des joueurs de test » permet de générer
rapidement un roster fictif pour tester les mécaniques sans tout saisir à la main.

## Rôles couverts

Villageois, Loup-Garou, Voyante, Sorcière, Chasseur, Cupidon, Petite Fille, Voleur, Ancien,
Bouc Émissaire, Gardien / Salvateur, Ange, Ermite, Idiot du Village, Joueur de Flûte,
Loup Blanc, Grand Méchant Loup, Sœurs, Frères, Corbeau, et un rôle « Autre / Personnalisé »
pour toute variante non listée (à décrire dans les notes du joueur).

Chaque rôle avec un pouvoir à usage limité (potions de la sorcière, tir du
chasseur, protection du gardien, cible du corbeau, charmes du joueur de
flûte, échange du voleur...) est suivi automatiquement pendant la partie.

## Structure

- `index.html` / `index.css` / `index.js` — page d'accueil
- `hub.html` / `hub.css` / `hub.js` — configuration de la partie
- `panel.html` / `panel.css` — suivi de la partie en direct
- `app.js` — logique du panel (état, rendu, cycle de partie, pouvoirs de rôle)
- `roles.js` — catalogue des rôles et de leurs pouvoirs suivis
- `settings.js` — lecture/écriture des paramètres du Hub (partagé Hub + Panel)
- `confirm.js` — mini-fenêtre de confirmation stylée (partagée Hub + Panel)
