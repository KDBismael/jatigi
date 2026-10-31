# Configuration serveur proposée

Projet confirmé : jatigi, domaine de production warko.app.

| Variable | Valeur proposée | Portée |
| --- | --- | --- |
| APP_BASE_URL | https://warko.app | Vercel Production |
| CRON_SECRET | Nouveau secret aléatoire de 32 octets, jamais affiché | Vercel Production, chiffré sensible |
| NOTIFICATION_UNSUBSCRIBE_SECRET | Nouveau secret indépendant de 32 octets, jamais affiché | Vercel Production, chiffré sensible |
| NOTIFICATION_REPLY_TO_EMAIL | ismaelkondombo1@gmail.com, fourni par l’exploitant | Vercel Production |

Aucun déploiement, lancement de cron ou envoi d’email dans cette opération. Aucune clé Resend ni adresse d’envoi n’est inventée. La revue automatique a demandé une autorisation explicite pour ces modifications de production ; aucune variable n’a été modifiée.
