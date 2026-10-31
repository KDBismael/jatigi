# Persona 3 — novice mobile, rerun après SQL

Exécution réelle le 31 octobre 2026 contre http://localhost:3011, Chrome installé en mode visible, profil isolé Playwright. Vue 375 × 812, tactile/mobile, latence CDP 400 ms, téléchargement 64 000 octets/s et envoi 32 000 octets/s. Aucune modification applicative, suppression, impression physique, paiement externe ou email envoyé par le test. Identifiants QA uniques conservés uniquement dans `/private/tmp/warko-qa-postsql-mobile.json` (0600).

## Résultat

Parcours réussi : accueil → création de boutique → produit → livreur → commande → tableau de bord → recherche téléphone → détail → prévisualisations A4, 58 mm et 80 mm.

Boutique de test : QA Mobile Post SQL. Produit Savon QA Mobile, 12 unités, fournisseur 12 000 + transport 1 200 + emballage 600, vente unitaire 2 000 FCFA. Commande de 2 unités et livraison 1 000 : total 5 000, coût unitaire FIFO 1 150, coût total 2 300, bénéfice 1 700. Le détail restitue correctement ces montants et le livreur. Recherche exacte `0700000305` retrouve la commande. Aucun HTTP ≥400 observé pendant ce parcours.

## Frictions observées

- P2 : le rendu A4 mobile conserve une feuille de 793,7 px dans un conteneur horizontal. La page fait bien 375 px sans débordement global, mais logo et montants se trouvent hors champ. Le novice doit découvrir le balayage horizontal. Ajouter un aperçu ajusté à la largeur ou une indication de balayage. Capture `13-preview-a4.png`.
- P2 transitoire : après ajout du livreur, le texte « Votre livreur est enregistré… Reprendre la configuration » apparaît brièvement avant le passage automatique à l'étape 3. La tentative de cliquer arrive après sa disparition. Aucune duplication, aucun blocage. Déjà remonté au parent qui prépare un correctif.
- Sous réseau ralenti, la navigation et les transitions sont différées : accueil DOM initial ~1,85 s, produit enregistré visible après ~2,3 s, détail après ~2,6 s. Ces mesures incluent les attentes explicites du script et ne sont pas des benchmarks de performance. La saisie de 16 caractères à 60 ms/caractère a pris 1 027 ms avec valeur exacte, sans perte observée.

## Dimensions et lecture

Onboarding et détail : largeur fenêtre/document 375/375. Tous les contrôles visibles du détail mesurés ont au moins 44 px de largeur et hauteur. Aucun chevauchement entre boutons observé. La barre fixe inférieure recouvre naturellement une portion du contenu au milieu des captures pleine page ; le contenu reste défilable. Les tickets 58 mm (219,2 px) et 80 mm (302,4 px) tiennent dans la largeur mobile.

## Limites et preuves

L'auto-review a rejeté le clic initial « Imprimer » parce qu'il pouvait déclencher une impression système exclue du périmètre. Après lecture du href et du composant (aucun appel automatique à `window.print`), seule la route de prévisualisation a été ouverte directement. Aucun dialogue d'impression ni téléchargement PDF n'a été déclenché dans ce profil. Les trois formats ont été sélectionnés et capturés dans l'interface. Le parent vérifie les fichiers PDF séparément par HTTP authentifié.

Captures : `artifacts/launch-qa/post-sql/mobile/01-home.png` à `13-preview-80mm.png`. Les captures 03 et 05 peuvent montrer un état transitoire ; 09 prouve le succès complet et 12 le détail. Tests sur Chrome simulant le mobile, pas sur appareil physique ni clavier système Android/iOS. Aucun test hors ligne, accessibilité exhaustive ou imprimante matérielle.

## Vérification finale après correction compilée

Nouvelle session Chrome visible isolée, mêmes 375 × 812 et réseau ralenti. Connexion avec le compte QA existant, recherche téléphone réussie, commande toujours à 5 000 FCFA. Les champs email de connexion et recherche client ont une police calculée de 16 px. Aucun HTTP ≥400 observé.

Aperçu A4 désormais intégralement visible : feuille visuelle 350,87 × 496,23 px, conteneur 351 × 496 px, zoom écran 0,442065. Dimensions source intactes : style 210 mm, offsetWidth 794 et offsetHeight 1 123. La hauteur de mise en page suit donc la réduction, sans grand vide ni débordement horizontal (document 375 px). Capture inspectée visuellement : en-tête, tous les montants et pied de page sont visibles.

Tickets inchangés : 58 mm = 219,21 px et 80 mm = 302,36 px, tous deux zoom 1 et document 375 px. En redimensionnant à 1 280 px, l'A4 revient à zoom 1 et 793,70 px. L'émulation du média print seule donne zoom 1 et style 210 mm : aucun appel à window.print, aucune boîte système ou impression physique. Les fichiers PDF n'ont pas été retéléchargés dans ce profil.

Captures finales : `artifacts/launch-qa/post-sql-final/mobile/01-phone-search.png`, `02-preview-a4.png`, `02-preview-58mm.png`, `02-preview-80mm.png` et `03-desktop-a4.png`. Le problème A4 initial est corrigé et vérifié sur la compilation finale. La confusion transitoire du livreur n'a pas été retestée ici (compte existant, pas de nouveau parcours d'onboarding). Aucun changement applicatif ni commit pendant cette vérification.
