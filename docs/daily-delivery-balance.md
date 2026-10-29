# Bilan livreurs par journée de tournée

## Déployer

Appliquer `supabase/migrations/20261029144335_daily_delivery_balance.sql` avant le code applicatif. La migration ajoute le rôle `manager`, le statut `postponed`, la date de tournée et les instantanés par commande/livreur/journée. Elle conserve la compatibilité SQL des appels à dix arguments de création de commande grâce au dernier argument optionnel de date.

Aucune date historique n’est déduite de la création des commandes : les anciennes affectations restent sans date. Le bilan signale les anciennes commandes encore ouvertes à dater. Une ancienne livraison/annulation peut également recevoir sa date connue sans changer son livreur, même si ce livreur est archivé. Les affectations terminées ne peuvent plus être déplacées vers une autre tournée ou un autre livreur.

## Donner accès au responsable

Dans Équipe, un administrateur peut inviter une personne ou lui attribuer **Responsable livraisons**. Ce rôle conserve l’accès aux commandes et obtient Livraisons, les montants des livreurs et l’enregistrement des versements de sa boutique. Il n’obtient pas les coûts d’achat ni les pages d’administration, d’équipe, de stock ou de rapports administrateur. Créer, archiver et restaurer les livreurs restent des actions administrateur. Les droits sont contrôlés côté serveur, pas seulement dans le menu.

## Faire le point

1. À la création d’une commande ou dans son édition, choisir le livreur et la **Date de tournée** : la journée où le colis lui est confié. La date de création de commande reste indépendante. Pour une nouvelle affectation, la date du jour est proposée.
2. Dans **Livraisons → Bilan du jour**, choisir aujourd’hui, hier ou une date précise, à l’heure d’Abidjan. Cliquer sur le nom d’un livreur pour voir ses commandes, coordonnées clients, produits, statuts et montants.
3. **À remettre attendu** somme uniquement les produits livrés, après remises et dépôts déjà conservés par la boutique. Les frais de livraison restent au livreur et sont exclus. Exemple : produits nets de 14 000, dépôt de 1 000 et livraison de 500 → 13 000 à remettre. Les versements déjà saisis ne sont pas déduits de ce montant de tournée : le **Suivi global et versements** affiche le solde global restant dû.
4. Marquer **Reportée** lorsqu’un colis ne peut pas aboutir. Pour reprendre sa livraison, modifier sa date de tournée ou son livreur ; il repart en livraison. La tournée précédente reste reportée. Un transfert le même jour conserve la trace du premier livreur. Un report garde les allocations FIFO ; seule l’annulation restitue le stock, une seule fois.

Les commandes Reçues/Confirmées déjà confiées à un livreur sont comptées « En cours » dans le bilan. Les livreurs archivés restent visibles pour leurs anciennes tournées. Chaque colis n’est compté qu’une fois pour un même livreur et une même journée ; un colis confié à deux livreurs successifs peut donc apparaître dans les deux détails.

## Retrouver un client

La recherche de Commandes accepte le nom ou le téléphone, y compris un numéro partiel. Les espaces et séparateurs sont ignorés pour le téléphone ; formats locaux ivoiriens, `+225` et `00225` sont rapprochés. Toutes les commandes sont chargées par pages stables, et les calculs financiers/versements chargent également toutes leurs pages au-delà de la limite REST habituelle. Une erreur de page empêche l’affichage d’un bilan partiel.

## Vérification

Tests SQL PGlite des reports, transferts, prix nets, stock, données historiques et accès par boutique ; tests des autorisations manager et des limites admin ; tests de recherche et pagination ; tests d’interface, dates, demandes concurrentes et reprise après panne réseau. Vérification visuelle locale sur mobile et ordinateur. Cette documentation ne signifie pas que la migration a été appliquée à la production.
