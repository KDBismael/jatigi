# Connexion et inscription · brief

> Pour Claude Code. Maquette : `docs/design/auth/auth-design.dc.html` (format de design, à réimplémenter,
> ne pas copier). Fichiers concernés : `components/auth/auth-form.tsx`, `components/ui/password-input.tsx`,
> `app/auth/login`, `app/auth/signup`, et la validation côté API `/api/auth/signup`. Respecter `CLAUDE.md`.

## Mise en page
- Mobile (par défaut) : bandeau sombre `#0E1020` en haut (logo, titre, phrase), puis la feuille blanche du
  formulaire qui remonte dessus avec des coins arrondis de 24 px.
- ≥ 900 px : deux colonnes. À gauche le panneau sombre avec un aperçu « Reste dû ce soir » (exemple
  illustratif) ; à droite le formulaire centré, 440 px max.
- On passe du thème sombre actuel (`bg-gray-950`, champs gris foncé) à un formulaire **clair** cohérent avec
  l'app. Supprimer la variante `darkTheme` de `PasswordInput` si plus utilisée.
- Titre du panneau : « Content de vous revoir. » (connexion) / « Votre boutique prête en 60 secondes. »
  (inscription).

## Champs (tous en 50 px de haut, texte 16 px pour éviter le zoom iOS, label au-dessus)
**Connexion** : Email, Mot de passe (+ « Mot de passe oublié ? » sur la ligne du label), bouton
« Se connecter », lien « Pas encore de compte ? Créer ma boutique ».
**Inscription**, en deux groupes (`fieldset` + `legend`) :
- *Votre boutique* : Nom de la boutique, Votre nom complet, Téléphone (préfixe `+225` affiché, saisie nationale).
- *Votre accès* : Email, Mot de passe, **Confirmer le mot de passe**.
Bouton « Créer ma boutique », mention « Vous serez propriétaire… », lien « Déjà un compte ? Se connecter ».
Si `?plan=pro|business` : encart « Offre choisie : Pro · Paiement après la création ».
Garder le sélecteur Connexion / Créer ma boutique en haut (44 px), mais chaque mode garde sa route
(`/auth/login`, `/auth/signup`) : le sélecteur fait un `router.replace`.

## Mot de passe et confirmation
- Bouton œil de 44 × 44 px dans le champ, `aria-label` « Afficher / Masquer le mot de passe »,
  `aria-pressed`. À l'inscription, il bascule **les deux champs** en même temps.
- Jauge de force en 3 segments + libellé : Trop court (rouge) · Faible (ambre) · Correct (indigo) · Solide (vert).
- Règles affichées sous le champ, cochées en direct :
  1. 8 caractères minimum (obligatoire)
  2. Au moins une lettre et un chiffre (obligatoire)
  3. Conseillé : un symbole ou 12 caractères (optionnel, ne bloque pas)
- Confirmation : dès qu'on tape, bordure verte + coche si identique, sinon bordure rouge et
  « Les deux mots de passe ne correspondent pas. » (`aria-invalid`, `aria-describedby`, `aria-live="polite"`).
- Le bouton « Créer ma boutique » reste désactivé visuellement (`aria-disabled`) tant que les règles 1 et 2
  et la confirmation ne sont pas bonnes ; au clic, focus sur le premier champ en erreur.
- **Validation partagée** : créer `lib/schemas/auth.schema.ts` (Zod) avec `password` min 8 + lettre +
  chiffre et `confirmPassword` via `.refine`. L'utiliser dans le formulaire **et** dans `/api/auth/signup`
  (la confirmation n'est pas envoyée au serveur). La logique de force dans `lib/password-strength.ts`,
  testée dans `lib/__tests__/password-strength.test.ts`.
- À VALIDER avec Ismael avant de changer : le minimum passe de 6 à 8 caractères. Les comptes existants
  ne sont pas touchés ; vérifier aussi le minimum configuré dans Supabase Auth et `team.schema.ts` (6 aujourd'hui).

## Erreurs et états
- Erreur de connexion : encadré rouge clair `role="alert"` en haut du formulaire, petite secousse (coupée
  sous `prefers-reduced-motion`). Texte : « Email ou mot de passe incorrect. Vérifiez puis réessayez. »
- Chargement : bouton désactivé avec libellé « Connexion… » / « Création… ».
- `autocomplete` : `email`, `current-password`, `new-password`, `organization`, `name`, `tel-national`.
  `inputmode="email"` et `inputmode="tel"`.

## Micro-interactions
Anneau de focus indigo doux sur les champs, transition du sélecteur de mode, fondu entre connexion et
inscription, segments de jauge qui changent de couleur, coches qui apparaissent, bouton qui s'enfonce.

## Hooks de test
`auth-page`, `auth-tab-login`, `auth-tab-signup`, `login-form`, `login-email`, `login-password`,
`login-password-toggle`, `login-submit`, `login-error`, `forgot-password-link`, `signup-form`,
`signup-selected-plan`, `signup-shop-name`, `signup-full-name`, `signup-phone`, `signup-email`,
`signup-password`, `signup-password-toggle`, `signup-password-strength`, `signup-password-confirm`,
`signup-password-match`, `signup-submit`.

## Tests
- `password-strength` : '' → 0, 'abc' → 0, 'abcdefgh' → 1, 'abcdefg1' → 2, 'abcdefg1!' → 3.
- Schéma : refuse < 8, refuse sans chiffre, refuse confirmation différente.
- Formulaire : l'œil bascule les deux champs ; message de non-correspondance affiché ; submit bloqué.

## Règles éditoriales
Pas de « — », « -- », « __ », ni flèches en caractères. Seules icônes : œil, coches, logo.
