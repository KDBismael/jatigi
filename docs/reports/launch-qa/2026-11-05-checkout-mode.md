# Correction du checkout Moneriz, 5 novembre 2026

## Cause et correction

Le site renvoyait HTTP503 avec `MONERIZ_MODE_INVALID`, confirmé par l’utilisateur. La variable était ajoutée via une entrée standard que le CLI Vercel conserve telle quelle, retour à la ligne compris. Le parseur attendait exactement test ou live.

- MONERIZ_MODE remis à test en Vercel Production, sans retour à la ligne, cohérent avec billing_settings.mode=test.
- Le code retire les espaces et retours à la ligne autour du mode et des clés API ; une clé du mauvais mode reste refusée.
- Les erreurs de configuration sont expliquées comme telles. Seules les réponses réellement incertaines conservent le message de paiement non confirmé.

## Validation

Régression observée : six cas en échec avant correction, puis sept cas verts. Suite complète : 618 tests /141 fichiers. ESLint, TypeScript, compilation de production et contrôle des ressources PDF réussis.

Vraie boutique QA créée pour ce diagnostic, mode test vérifié dans le serveur et la base. Inscription/connexion réelles puis POST /api/billing/checkout : HTTP200, lien Moneriz reçu, facture test pending et session sauvegardée. Aucun paiement confirmé ni email envoyé. Boutique QA désinscrite des rappels ; identifiants uniquement dans un fichier temporaire privé.

Déploiement Vercel autorisé et terminé : https://jatigi-gc2vuod4w-kdbismaels-projects.vercel.app . Vérification sur https://warko.app avec une seconde boutique QA et une nouvelle session : HTTP200, URL Moneriz reçue, mode test et session sauvegardée. Aucun paiement confirmé. Le correctif et ce rapport sont inclus dans le commit demandé ; aucun push demandé ni effectué.

## Accès et limites

La revue automatique a refusé l’export complet des variables de production, qui aurait pu copier des secrets. Aucun export n’a eu lieu. Le diagnostic a été terminé à partir du code retourné par le navigateur, des métadonnées Vercel, du mode de la base et d’un contrôle de la clé locale sans création de paiement. Aucune lecture directe du jeton CLI ni valeur secrète dans les sorties.
