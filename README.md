# Checkpoint, l'audit des maquettes

Un petit outil qui lit le fichier Figma de Checkpoint (le service qui dit à un joueur en situation de handicap si un jeu est jouable pour lui avant l'achat) et vérifie, écran par écran, les règles que le projet s'est données. Le résultat est une page de rapport, avec un lien direct vers chaque élément à corriger dans Figma.

Il contient aussi un simulateur de verdict, qui applique la méthode de Checkpoint à de vrais jeux. Les deux pages se lancent ensemble.

L'audit lit le fichier Figma sans le modifier. Les corrections du 30 octobre 2026 (marges des accueils ordinateur, rayons de la jauge sur la fiche mobile) ont été faites à part, dans Figma, puis relevées de nouveau : plus aucune erreur sur les 35 écrans.

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

Va sur http://127.0.0.1:4312 (audit des maquettes) ou http://127.0.0.1:4312/verdict.html (simulateur de verdict). Laisse le terminal ouvert, la page s'arrête quand tu le fermes (ou avec Ctrl+C).

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

## Le simulateur de verdict

Il applique les règles de la page La méthode (6.1 des maquettes) dans du code, et le montre sur les 8 jeux du relevé des boutiques du 26 octobre 2026 (Steam, Xbox, pages Ubisoft).

- On ne regarde que les besoins indispensables. Les besoins utiles sont affichés, sans changer le verdict.
- Jouable : tous les besoins indispensables sont couverts par le jeu.
- Jouable avec adaptations : un besoin n'est pas couvert, mais un réglage, un logiciel ou le matériel de la personne le compense, et c'est vérifié.
- Pas jouable en l'état : un besoin indispensable n'est pas couvert et rien de vérifié ne le compense.
- Une information est vérifiée après 3 confirmations, contestée après 3 contestations, et le studio est prévenu à 5. Une session CapGame suffit à elle seule.
- La certitude est la part des besoins indispensables dont la réponse est vérifiée : élevée à partir de 75 %, moyenne de 40 à 74 %, faible en dessous.

Décisions que les maquettes ne tranchaient pas, à valider :

- Un besoin sans tag ni retour de joueurs (par exemple éviter les flashs) reste inconnu. Le verdict est alors signalé incomplet, jamais arrondi.
- Si la source d'une plateforme est lue et ne déclare rien qui couvre le besoin, le besoin est bloquant. Sans source du tout, il est inconnu.
- À égalité de confirmations et de contestations, la contestation l'emporte.
- Le verdict vaut pour une plateforme : PC lit Steam, Xbox Series lit Xbox, et les pages Ubisoft comptent pour les deux.

La page compare aussi le moteur aux verdicts affirmés dans les maquettes. Sur PC, les trois cas (Clair Obscur, Elden Ring, Baldur's Gate 3) sont identiques. Sur Xbox Series, il reste deux écarts : Clair Obscur et Baldur's Gate 3 ne déclarent presque rien côté Xbox, donc le moteur les juge non jouables pour ce profil, alors que les maquettes les montrent jouables. C'est une phrase des maquettes à préciser, ou des retours de joueurs à ajouter.

Les liens entre besoins et tags sont dans `data/besoins.json` : seul celui de la main unique vient de la page La méthode, les autres sont des propositions. Les confirmations, contestations et sessions de `data/scenario.json` sont un scénario, jamais prêtées à un vrai studio.

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

Les tests couvrent le calcul des contrastes, le classement des constats, les cas particuliers (sigles, écarts négatifs), l'échappement du HTML, les états des informations, chaque cas du verdict, la certitude, la lecture du relevé des jeux et les trois verdicts de référence des maquettes.

## Organisation du dépôt

- `figma/` : les deux scripts de lecture à lancer dans Figma.
- `data/` : le relevé brut de Figma (écrans, variables, date), le relevé des jeux (`jeux.csv`), les besoins, le profil et le scénario.
- `src/` : le contraste, les règles de l'audit, le moteur de verdict (`verdict.mjs`, `jeux.mjs`), les pages et le petit serveur.
- `tests/` : les tests.
- `report/` : la page générée (recréée à chaque `npm start`).
