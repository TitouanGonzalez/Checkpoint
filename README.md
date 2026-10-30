# Checkpoint, l'audit des maquettes

Un petit outil qui lit le fichier Figma de Checkpoint (le service qui dit à un joueur en situation de handicap si un jeu est jouable pour lui avant l'achat) et vérifie, écran par écran, les règles que le projet s'est données. Le résultat est une page de rapport, avec un lien direct vers chaque élément à corriger dans Figma.

Il ne modifie jamais le fichier Figma : il le lit seulement.

## Voir le rapport

Le rapport est déjà calculé à partir du relevé du 30 octobre 2026. Il n'y a rien à installer à part Node.js.

### 1. Ce qu'il te faut

- Node.js 22.12 ou plus récent : https://nodejs.org (la version LTS convient). Vérifie avec `node -v`.
- Git pour récupérer le dépôt, ou le bouton "Code" puis "Download ZIP" sur GitHub.
- Aucune bibliothèque à installer, aucun compte, aucune connexion Figma.

### 2. Récupérer et lancer

```bash
git clone https://github.com/TitouanGonzalez/Checkpoint.git
cd Checkpoint
npm start
```

### 3. Ouvrir

Va sur http://127.0.0.1:4312. Laisse le terminal ouvert, la page s'arrête quand tu le fermes (ou avec Ctrl+C).

### Si ça ne marche pas

- `npm: command not found` : Node.js n'est pas installé, ou il faut rouvrir le terminal après l'installation.
- Le port 4312 est déjà pris : un ancien rapport tourne encore. Ferme son terminal, ou change de port avec `PORT=4313 npm start` (sous PowerShell : `$env:PORT=4313; npm start`).
- Tu as modifié les données et rien ne change : `npm start` recalcule le rapport à chaque lancement.

## Ce que l'outil contrôle

Les règles viennent du cadre du projet : base Carbon (IBM) pour la structure, couleurs, police et rayons propres à Checkpoint.

| Règle | Niveau | Ce qui est vérifié |
| --- | --- | --- |
| Couleur libre | Erreur | Toute couleur est liée à une variable (sauf les jaquettes de jeux) |
| Contraste | Erreur | Chaque texte atteint 4,5:1, ou 3:1 pour un grand texte (AA) |
| Espacement hors échelle | Erreur | 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160 (et 120 pour la marge ordinateur) |
| Rayon hors échelle | Erreur | 4, 8, 16 ou pilule |
| Cible trop petite | Erreur | Les composants cliquables font 48 px au minimum |
| Texte sans style | Erreur | Tout texte utilise un style de texte lié aux variables |
| Mauvais mode de typographie | Erreur | Mobile, Tablette ou Ordinateur selon la largeur de l'écran |
| Espacement ou rayon non lié | À relire | La valeur est bonne mais pas liée à une variable |
| Texte en capitales | À relire | Surtitres et en-têtes en casse normale (les sigles comme PS5 sont ignorés) |
| Écart négatif | À confirmer | Normal pour une pile d'avatars, à vérifier ailleurs |

La palette est aussi testée en entier, dans les deux modes (Clair et Contraste élevé) : chaque couleur de texte sur les fonds où elle sert, et les bordures et le focus à 3:1.

Un écran est "conforme" sans aucune erreur ni relecture, "à relire" avec seulement des points à relire, "à corriger" dès qu'il a une erreur. Le statut est toujours écrit en toutes lettres, jamais porté par la couleur seule.

## Mettre le rapport à jour

L'outil a deux parties. Une extraction lit le fichier Figma, un vérificateur en Node classe les constats et écrit la page.

1. Dans Claude Code, avec le serveur MCP Figma connecté, lance le script `figma/extract-screens.js` avec l'outil `use_figma` (change la liste `PAGES` pour choisir les pages). Enregistre le résultat dans `data/screens-XX-YY.json`.
2. Fais pareil avec `figma/extract-variables.js` et enregistre dans `data/variables.json`.
3. Mets à jour la date dans `data/meta.json`.
4. Lance `npm start`.

L'extraction ne parcourt pas l'intérieur des instances de composants : un composant se contrôle sur sa propre planche. Elle garde au plus 3 exemples par règle et par écran, pour que le rapport reste lisible.

## Vérifier l'outil

```bash
npm test
```

Les tests couvrent le calcul des contrastes, le classement des constats, les cas particuliers (sigles, écarts négatifs), l'échappement du HTML et le chargement des vraies données.

## Organisation du dépôt

- `figma/` : les deux scripts de lecture à lancer dans Figma.
- `data/` : le relevé brut (écrans, variables, date).
- `src/` : le contraste, les règles, le rapport et le petit serveur.
- `tests/` : les tests.
- `report/` : la page générée (recréée à chaque `npm start`).
