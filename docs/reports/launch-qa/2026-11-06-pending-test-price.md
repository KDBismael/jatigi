# Ancien tarif de test en attente

Le code BILLING_TEST_PRICE_PENDING protège une facture immuable créée avant le changement des variables de prix. La préparation ne consultait pas Moneriz pour savoir si ce lien était désormais expiré.

Le checkout au même plan et à la même période vérifie maintenant le lien au précédent tarif via le rapprochement existant, réservé au propriétaire de la boutique. Après expiration confirmée, il relit les demandes en attente avant de créer une nouvelle facture (index unique inchangé). Si le paiement est confirmé, il renvoie la facture payée sans second checkout. Un lien actif, une demande sans session connue ou une erreur du prestataire restent bloqués. Aucun montant existant n'est réécrit, aucune facture n'est supprimée et aucun changement SQL n'est nécessaire.

Validation : quatre nouveaux tests observés en échec avant implémentation puis réussis. Suite complète : 637 tests, 145 fichiers. ESLint et TypeScript réussis. Production non modifiée ; correctif destiné à la Preview.

Preview : https://jatigi-m3dw53ipp-kdbismaels-projects.vercel.app

L'état du paiement présenté dans la capture de l'utilisateur n'a pas été consulté dans son compte. Si Moneriz le considère toujours actif, le blocage demeure intentionnel jusqu'à son expiration.
