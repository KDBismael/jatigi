# Activation des emails et du cron

## Constat vérifié

Le projet Vercel `jatigi` dessert `warko.app`. Sa liste de variables Production ne contient pas Resend, l’expéditeur, l’URL applicative ni les secrets de notifications/cron. Le SMTP de Supabase, s’il existe, ne configure pas les emails applicatifs Warko. Les paramètres publics Auth ne permettent pas d’inspecter le SMTP.

## Configuration à ajouter

- `RESEND_API_KEY` : clé d’envoi du compte Resend, à saisir directement dans Vercel, jamais dans un message ni dans Git.
- `NOTIFICATION_FROM_EMAIL` : adresse d’un domaine validé dans Resend. Ne pas utiliser le Gmail de contact comme expéditeur d’un domaine non vérifié.
- `APP_BASE_URL=https://warko.app`.
- `CRON_SECRET` et `NOTIFICATION_UNSUBSCRIBE_SECRET` : deux valeurs aléatoires distinctes d’au moins 32 octets.
- `NOTIFICATION_REPLY_TO_EMAIL=ismaelkondombo1@gmail.com` : contact fourni par l’exploitant.

L’ajout des quatre dernières variables a été bloqué par la revue automatique en attendant une autorisation explicite de portée Production. Aucune variable modifiée à ce stade.

## Déploiement et ordonnanceur

1. Appliquer `2026-10-31-tenant-recurring-expenses.sql` avant le code qui l’utilise. Ce correctif empêche une consultation de dépenses d’exécuter la maintenance récurrente de toutes les boutiques. La génération globale des tâches système reste inchangée.
2. Déployer le code après configuration. Le fichier `.github/workflows/lifecycle.yml` prépare un appel toutes les cinq minutes et un déclenchement manuel en vérification seule par défaut. Aucun workflow n’a été poussé ou exécuté.
3. Dans les secrets GitHub du dépôt, définir `WARKO_CRON_SECRET` identique au `CRON_SECRET` Vercel. Le CLI GitHub local n’est pas authentifié correctement ; ce secret n’a pas été ajouté.
4. Le workflow effectue d’abord `GET /api/jobs/lifecycle?dryRun=1` avec Bearer. Il s’arrête si la configuration manque. Cette vérification ne génère ni ne réserve de tâche et n’envoie aucun email.
5. Après revue des destinataires (exclure les comptes QA), un appel sans dryRun traite réellement les rappels/reçus. Aucun appel de traitement réel n’a été effectué pendant l’audit.

Le planning GitHub ne constitue pas une garantie d’exécution à la seconde : retards possibles. Le cron doit être présent sur la branche par défaut. Contrôler les exécutions et la réception sur une adresse de test autorisée avant lancement.

## Auth et coordonnées

Les paramètres publics confirment l’email activé, les inscriptions ouvertes et l’auto-confirmation email Supabase désactivée. Le flux Warko utilise toutefois l’API Admin avec confirmation immédiate : il ne déclenche pas l’email de vérification standard. La politique distante de mots de passe, l’URL Site, les redirections et le SMTP nécessitent un accès Management/Dashboard non disponible ; minimum de 8 caractères avec lettre et chiffre vérifié dans le code partagé de Warko.

Coordonnées fournies : kdblabs, Abidjan, Côte d’Ivoire, ismaelkondombo1@gmail.com. Elles remplacent l’ancien email support non confirmé. L’adresse postale complète, le statut juridique et l’immatriculation n’ont pas été fournis ; ne pas en inventer ou déclarer la validation juridique complète.
