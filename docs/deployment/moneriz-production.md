# Moneriz : clés réelles et prix de production

Copier les champs nécessaires de `.env.production.example` dans Vercel, projet jatigi, environnement **Production**. Les valeurs du fichier sont des exemples ; les secrets restent à renseigner directement dans Vercel.

## Prix modifiables

```env
NEXT_PUBLIC_PRO_MONTHLY_PRICE=5000
NEXT_PUBLIC_PRO_YEARLY_PRICE=48000
NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE=10000
NEXT_PUBLIC_BUSINESS_YEARLY_PRICE=96000
```

Ces quatre montants sont indépendants, en FCFA entiers (100 minimum, 5 000 000 maximum, sous réserve du plafond du compte Moneriz). Par exemple, passer Pro à 7 500 FCFA/mois consiste à modifier la première variable et **redéployer la Production**. Le prix affiché et le montant préparé côté serveur proviennent de la même configuration compilée. Une valeur absente ou vide utilise le tarif historique correspondant. Supprimer les quatre puis redéployer rétablit les prix ci-dessus.

Supprimer de Production les anciennes variables **NEXT_PUBLIC_TEST_PRO_PRICE** et **NEXT_PUBLIC_TEST_BUSINESS_PRICE** avant d'activer live. Elles sont réservées au mode test. Garder les clés et variables de test dans Preview uniquement. Aucun montant envoyé par le navigateur n'est accepté.

Les nouveaux prix concernent les nouvelles factures et les prochains renouvellements, qui nécessitent chacun une confirmation manuelle. Une période déjà payée et son reçu ne sont pas réécrits. Une session active conserve son montant ; en cas de conflit de tarif, Warko vérifie son état et exige sa clôture avant une nouvelle facture. Les prix barrés de lancement sont masqués si des prix personnalisés sont configurés. Les économies annuelles sont recalculées ; aucune économie négative n'est affichée.

Aucune migration SQL n'est nécessaire pour les prix configurables. Les factures utilisent les tables, l'index unique des demandes en attente et les procédures de confirmation existants.

## Clés Moneriz réelles

Dans Moneriz, sélectionner l'environnement **live / production**, finaliser la validation du compte marchand si nécessaire, puis créer une clé secrète permettant la création/lecture des sessions et la lecture des paiements.

Dans Vercel Production :

```env
APP_BASE_URL=https://warko.app
MONERIZ_MODE=live
MONERIZ_LIVE_SECRET_KEY=izp_live_sk_VOTRE_CLE
MONERIZ_LIVE_WEBHOOK_SECRET=SECRET_DU_WEBHOOK_LIVE
```

La clé API et le secret webhook sont deux valeurs différentes, fournies par Moneriz. Ne jamais les préfixer par NEXT_PUBLIC ni les coller dans le chat. La redirection hébergée n'utilise pas de clé publique Moneriz.

Créer un webhook **live** avec l'URL exacte :

```text
https://warko.app/api/webhooks/moneriz/live
```

Activer les événements : `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.reversed`. Copier le secret de signature de ce webhook dans MONERIZ_LIVE_WEBHOOK_SECRET. Le serveur vérifie X-Moneriz-Signature et la correspondance mode, référence, montant, devise et boutique. Il faut une véritable livraison signée réussie pour valider la configuration, pas seulement une ouverture de l'URL (GET n'est pas un test webhook).

Le webhook test reste distinct : `https://warko.app/api/webhooks/moneriz/test`, avec MONERIZ_TEST_WEBHOOK_SECRET. Si Preview et Production partagent Supabase, elles partagent aussi billing_settings : après le passage de ce projet à live, les checkouts Preview en mode test seront refusés. Pour continuer à tester séparément, utiliser un projet Supabase de test sur Preview.

## Bascule coordonnée

1. Configurer la clé live et le webhook live dans Vercel, sans changer le mode pour l'instant. Déployer le code compatible.
2. Préparer les quatre prix voulus, supprimer les deux variables de prix TEST de Production, régler MONERIZ_MODE=live puis lancer le déploiement Production.
3. Au moment de la bascule, utiliser `docs/deployment/2026-11-06-enable-live-billing.sql` dans le SQL Editor du **Supabase de production** :

```sql
BEGIN;
UPDATE public.billing_settings SET mode='live' WHERE singleton=true;
SELECT mode FROM public.billing_settings WHERE singleton=true;
COMMIT;
```

Les deux modes doivent correspondre. Durant une différence de mode, le checkout est volontairement indisponible ; éviter de laisser cette situation durer. Le réglage Supabase est global à la plateforme, pas propre à une boutique. Les paiements test conservés ne donnent pas de droit d'abonnement réel et ne sont pas montrés dans l'historique live. Aucune donnée test n'est supprimée par cette commande.

4. Vérifier une création de checkout en live au montant affiché. La création seule ne débite pas. Effectuer ensuite un paiement réel volontaire, vérifier la réception du webhook, l'activation du plan et le reçu au même montant. Ne pas considérer le retour du navigateur comme une preuve d'encaissement.

## Échec et annulation

Une tentative `failed` vérifiée s'affiche **Échoué** avec **Réessayer le paiement**. Une même session peut accueillir une nouvelle tentative : l'état technique de la facture reste en attente tant que le lien peut être payé. Le rapprochement enregistre aussi ces échecs. Une session expirée ou désactivée sans tentative payée est libérée après vérification. Un clic sur Annuler ou un retour via cancelUrl ne constitue pas, seul, un statut financier d'annulation.

## Variables déjà utilisées par l'application

Conserver NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY du bon projet. Ne jamais publier la clé service_role. Les rappels/reçus email nécessitent en plus RESEND_API_KEY, NOTIFICATION_FROM_EMAIL sur un domaine vérifié, NOTIFICATION_REPLY_TO_EMAIL, NOTIFICATION_UNSUBSCRIBE_SECRET et CRON_SECRET, ainsi que l'appel du cron documenté dans les fichiers de déploiement existants. Ces paramètres email ne remplacent pas les secrets Moneriz et ne sont pas nécessaires à la création du checkout.
