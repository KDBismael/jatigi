# Warko SaaS — configuration et recette

## Périmètre livré dans le code

- Landing COD et tarifs Découverte / Pro / Business, mensuel et annuel ; FAQ, sans témoignage ni chiffre commercial inventé.
- Onboarding avec produit, livreur et commande réels ; progression persistante, passage d’étape et reprise, checklist du dashboard.
- Réglages boutique : nom, pays XOF, frais de livraison par défaut, logo existant.
- Abonnements : usages, quotas SQL, paiement Moneriz hébergé, historique, reçu PDF, arrêt à échéance, reprise et changement d’offre. Les données restent conservées après expiration ; les nouvelles créations respectent les plafonds.
- Renouvellement par nouveau paiement confirmé : rappel avant échéance, grâce de trois jours avec rappels quotidiens, puis plafonds Découverte. Aucun prélèvement automatique.
- Emails J+1 si aucune commande, rappels d’échéance, reçus ; outbox durable, déduplication, reprises et désinscription signée. Pas de SMS/WhatsApp automatique, conformément au choix du propriétaire.
- Variantes avec lots FIFO séparés, images privées des produits, journal des mouvements de stock, statut retourné avec restauration unique des lots.
- Historique des reversements ; bilan quotidien distinguant encaissé, frais, attendu, versements datés et solde global ; export CSV compatible Google Sheets.
- Sessions live planifiées / démarrées / clôturées et saisie successive de commandes. Attribution du vendeur et du live dans la transaction de création.
- Responsable livraisons limité aux colis attribués et opérations de livraison ; prix d’achat masqués.
- Métriques réservées à l’administration plateforme : activation, onboarding réel, commandes sur sept jours, conversion payante, MRR normalisé annuel, ARPU, rétention de cohortes et churn du mois en cours. Les cohortes non arrivées à maturité ne produisent pas de faux taux.

Les visiteurs uniques, le taux landing→inscription et le coût d’acquisition nécessitent une source analytics et les dépenses publicitaires. Ils ne sont pas inventés. Les témoignages nécessitent de vrais retours clients. Le support WhatsApp humain existant reste distinct des relances automatiques.

## Déploiement (non exécuté pendant cette implémentation)

1. Sauvegarder la base et tester les migrations sur une copie de préproduction. Appliquer les migrations dans l’ordre, de `20261029163241_saas_subscriptions.sql` à `20261029170007_saas_metrics.sql`, y compris les réglages onboarding et les six migrations métier. Les anciens clients sans abonnement deviennent Découverte pour les **nouvelles créations** ; rien n’est supprimé. Si une transition commerciale est prévue, attribuer explicitement les périodes offertes côté serveur avant ouverture.
2. Déployer les buckets privés créés par les migrations et vérifier les routes authentifiées images/logo. Ne jamais rendre publics les fichiers pour contourner les droits.
3. Renseigner les variables de `.env.local.example` côté serveur. Ne jamais exposer de clé secrète avec `NEXT_PUBLIC_`.
4. Déployer le code après le schéma et le stockage. Le font NotoSans et les bibliothèques natives Sharp doivent être inclus dans les traces de production ; exécuter `npm run check:document-runtime` après compilation.
5. Configurer les webhooks Moneriz HTTPS séparés : `/api/webhooks/moneriz/test` et `/api/webhooks/moneriz/live`, chacun avec son secret. La route est publique mais vérifie les octets bruts signés et la correspondance métier. Un retour navigateur n’active jamais une offre.
6. Recetter avec `MONERIZ_MODE=test`, les clés `izp_test_sk_…` et `billing_settings.mode='test'`. Aucun paiement de test ne donne de droit en mode live.
7. Pour la production, terminer la vérification du marchand Moneriz, renseigner les clés `izp_live_sk_…`, passer **ensemble** `MONERIZ_MODE=live` et `public.billing_settings.mode='live'`. `APP_BASE_URL` doit être l’origine HTTPS finale, sans chemin ni query. Les moyens de paiement réellement disponibles sont ceux configurés dans cet espace marchand et ce pays.
8. Configurer un domaine expéditeur vérifié dans Resend, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, un long secret aléatoire `NOTIFICATION_UNSUBSCRIBE_SECRET` et `CRON_SECRET`. Programmer `GET /api/jobs/lifecycle` toutes les minutes, en HTTPS avec `Authorization: Bearer <CRON_SECRET>`. Le job envoie jusqu’à cinq emails par exécution, avec baux et reprises. Un job externe est nécessaire : la route seule ne programme pas son exécution.

## Recette avant ouverture

- Payer une souscription de test ; vérifier qu’un simple retour du checkout n’accorde aucun droit, puis qu’un webhook confirmé crée une seule période et un seul reçu.
- Rejouer un événement, inverser l’ordre succès/expiration et succès/inversion, interrompre l’appel checkout ; vérifier la même intention/idempotency key à la reprise. Une réponse incertaine ne crée pas une nouvelle facture automatiquement.
- Page de paiement expirée après une tentative échouée : « Vérifier ce paiement » ferme l’intention inutilisable. Une session encore ouverte reste en attente ; un succès tardif reste traité.
- Tester le passage Business→Pro prépayé, renouvellement anticipé, annulation et fin de grâce. Une période courante payée prévaut sur la grâce d’une ancienne offre.
- Vérifier la 30e / 31e commande, le deuxième livreur actif gratuit, le quatrième compte Pro ; les échecs de création rendent leur réservation et leur stock.
- Vérifier les accès croisés entre boutiques, employés et responsables, les reçus réservés au propriétaire et le refus des écritures billing via le client Supabase navigateur.
- Recetter les nouveaux écrans avec un compte de préproduction, les images et les PDF en production, puis un vrai paiement autorisé à faible risque. Les tests locaux utilisent des réponses simulées pour Moneriz/Resend et ne valident pas les identifiants réels.

## Comportements à connaître

Les quotas comptent les créations du mois calendaire d’Abidjan, y compris les commandes annulées. Archiver un livreur libère une place et conserve ses données. Une rétrogradation ne supprime ni commandes, ni comptes, ni livreurs existants ; les ajouts restent bloqués au plafond. Pro conserve l’accès aux 30 derniers jours du bilan détaillé ; Business à l’historique complet.

Le MRR utilise les périodes payées actives du mode configuré, avec les annuels divisés par douze. Une période offerte sans facture ne crée pas de revenu. Les métriques de rétention utilisent les mois calendaires suivants l’inscription et excluent les cohortes incomplètes. Les paiements de test sont identifiés dans les reçus et le panneau de croissance.
