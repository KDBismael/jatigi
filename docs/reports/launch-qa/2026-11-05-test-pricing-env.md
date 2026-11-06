# Tarifs de test réversibles par variables

5 novembre 2026. Demande : utiliser des variables pour Pro100 FCFA et Business150 FCFA, à retirer après les essais.

```env
MONERIZ_MODE=test
NEXT_PUBLIC_TEST_PRO_PRICE=100
NEXT_PUBLIC_TEST_BUSINESS_PRICE=150
```

Les deux tarifs publics sont utilisés en mensuel et annuel, pour l’affichage comme pour les nouvelles factures. Une configuration partielle ou un prix inférieur à100 est rejeté. Ces tarifs ne peuvent pas déclencher un checkout live.

Sans les deux variables, les prix habituels restent Pro5000/mois ou48000/an et Business10000/mois ou96000/an. Supprimer les deux variables et redéployer restaure ces valeurs. Les variables publiques sont compilées par Next.js, donc un redéploiement est nécessaire à chaque ajout/retrait.

Aucune migration SQL. Le fichier de tarifs fixes préparé avant la préférence pour les variables a été retiré. Le prix SQL normal a été vérifié à5000 dans une nouvelle boutique QA ; sa facture de sonde, sans appel au prestataire, a été conservée avec état blocked et marqueur QA. Aucune facture historique d’un client n’a été modifiée.

Les nouvelles factures de test sont créées côté serveur après les contrôles propriétaire et mode. L’index unique existant empêche deux factures pending pour la même boutique/mode ; après une course23505, le service reprend la même facture et sa clé d’idempotence. Un ancien checkout à un prix différent est refusé explicitement, sans être réécrit ni payé par erreur.

Validation : 631 tests /144 fichiers, ESLint, TypeScript, compilation avec les deux variables et contrôle des ressources PDF réussis. Treize tests ciblés couvrent configuration, restauration, montants serveur, reprise, concurrence, ancien tarif et refus du mode live. Chrome headless375px confirme100/150 en mensuel et annuel.

Backend réel, deux nouvelles boutiques QA : POST checkout200 pour Pro avec facture test100, et200 pour Business avec facture test150 ; sessions Moneriz sauvegardées. Aucun paiement confirmé ni email envoyé ; boutiques QA désinscrites des rappels. Identifiants et détails de session restent uniquement en fichiers temporaires privés.

La prise en charge est publiée via Vercel ; l’activation dépend des valeurs présentes lors du build. Voir `docs/deployment/test-pricing-env.md`. Pas de commit ou push demandé pour cette modification.
