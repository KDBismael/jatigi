# Prix temporaires par variables Vercel

Ajouter ensemble ces variables à l’environnement testé puis redéployer :

```env
MONERIZ_MODE=test
NEXT_PUBLIC_TEST_PRO_PRICE=100
NEXT_PUBLIC_TEST_BUSINESS_PRICE=150
```

Pro coûte100 FCFA et Business150 FCFA, en mensuel comme en annuel. Les prix affichés et le montant du nouveau checkout utilisent la même configuration. Pas de migration SQL nécessaire. Le code refuse ces tarifs si Moneriz est en mode live.

Après le test, supprimer les DEUX variables NEXT_PUBLIC_TEST_PRO_PRICE et NEXT_PUBLIC_TEST_BUSINESS_PRICE, puis redéployer. Les tarifs normaux reviennent : Pro5000/mois ou48000/an ; Business10000/mois ou96000/an.

Les variables NEXT_PUBLIC sont figées à la compilation Next.js ; les ajouter ou les retirer sans redéploiement n’actualise pas le site.

Une facture et un lien Moneriz déjà ouverts ne sont jamais modifiés. Si une demande au même plan et à la même période utilise encore l’ancien tarif, le checkout vérifie automatiquement son état auprès de Moneriz. Une expiration confirmée libère la création au nouveau tarif ; un paiement confirmé est renvoyé comme payé sans nouvelle demande. Si le lien reste actif, attendre son expiration puis réessayer, ou utiliser « Vérifier ce paiement » dans l’historique Abonnement. Une indisponibilité du prestataire conserve le blocage. Un conflit explicite empêche de rediriger vers un ancien montant inattendu.

La préparation des factures de test utilise l’index unique existant sur les factures en attente pour conserver une seule demande en cas de double clic/concurrence. La tarification normale continue d’utiliser la fonction SQL existante. Aucune clé API ne doit être placée dans une variable NEXT_PUBLIC.
