# Plan — Assistant WhatsApp IA pour le suivi des commandes

## Résumé

Ajouter un assistant WhatsApp capable de répondre aux clients sur l’état de leur commande, le livreur assigné, le montant restant à payer et les prochaines étapes.

Pour une v1, n8n est suffisant et même préférable : il permet de valider vite le besoin terrain sans construire trop tôt une plateforme de messagerie complète. Warko/Jatigi doit cependant rester la source de vérité. L’IA ne doit pas inventer de réponse ; elle reformule uniquement les données récupérées depuis l’application.

## Objectif produit

Réduire les échanges manuels WhatsApp autour des questions fréquentes :

- “Où est ma commande ?”
- “Est-ce que ma commande est en livraison ?”
- “Qui est le livreur ?”
- “Combien je dois payer à la réception ?”
- “Je veux modifier mon lieu de livraison.”
- “Je veux annuler.”

Le bot doit répondre rapidement, en français naturel, et transférer à un humain quand il n’est pas sûr.

## Architecture recommandée v1

```text
Client WhatsApp
  ↓
WhatsApp Cloud API
  ↓
n8n Webhook
  ↓
Détection d’intention
  ↓
API Warko/Jatigi sécurisée
  ↓
Données structurées de commande
  ↓
IA pour formuler la réponse
  ↓
WhatsApp Cloud API
  ↓
Réponse au client
```

## Pourquoi n8n en v1

n8n est adapté si le périmètre reste simple :

- réponse sur statut de commande
- notifications automatiques
- confirmation de livraison
- relance client
- FAQ basique
- handoff humain si demande ambiguë

Il évite de construire trop tôt :

- un moteur de conversation complet
- une file de messages
- un dashboard support
- un système complexe de retries
- une gestion avancée de templates WhatsApp

## Rôle de Warko/Jatigi

Warko doit exposer une API étroite et sécurisée pour n8n.

Exemple d’endpoint :

```http
POST /api/whatsapp/order-lookup
```

Payload :

```json
{
  "phone": "+2250700000000",
  "message": "où est ma commande ?"
}
```

Réponse attendue :

```json
{
  "found": true,
  "client_name": "Mme Ouattara",
  "order": {
    "id": "ORD-1234",
    "status": "in_progress",
    "status_label": "En livraison",
    "order_date": "2026-08-12",
    "delivery_location": "Cocody Angré",
    "delivery_driver": {
      "name": "Yao Livraison",
      "phone": "+2250100000000"
    },
    "parcel_amount": 15000,
    "delivery_fee": 1000,
    "confirmation_amount": 2000,
    "remaining_amount": 14000
  }
}
```

Si aucune commande n’est trouvée :

```json
{
  "found": false,
  "reason": "no_recent_order"
}
```

## Rôle de l’IA

L’IA ne décide pas du statut et ne calcule pas les montants. Elle reçoit les données structurées de Warko et produit une réponse polie.

Exemple :

```text
Bonjour Mme Ouattara 👋
Votre commande est actuellement en livraison.

Livreur : Yao Livraison
Lieu : Cocody Angré
Reste à payer : 14 000 FCFA

Merci de garder votre téléphone disponible.
```

Règles importantes :

- ne jamais inventer un livreur, un montant ou un statut
- ne pas promettre une heure de livraison si elle n’existe pas dans Warko
- répondre “je transfère à l’équipe” si la demande est ambiguë
- éviter d’exposer les coûts internes, marges, achats ou bénéfices

## Intentions à supporter en v1

### 1. Suivi de commande

Déclencheurs :

- “où est ma commande”
- “statut”
- “livraison”
- “mon colis”

Réponse :

- statut
- livreur si assigné
- lieu de livraison
- montant restant à payer

### 2. Montant à payer

Déclencheurs :

- “combien je dois payer”
- “reste à payer”
- “montant”

Réponse :

- total colis
- frais livraison
- acompte/confirmation
- reste à payer

### 3. Contact livreur

Déclencheurs :

- “numéro livreur”
- “qui livre”
- “contact livraison”

Réponse :

- nom et téléphone du livreur si disponible
- sinon message d’attente

### 4. Modification / annulation

Déclencheurs :

- “changer adresse”
- “modifier”
- “annuler”

Réponse :

- ne pas modifier automatiquement en v1
- demander confirmation
- transférer à un humain/admin

## Handoff humain

Le bot doit transférer à un humain quand :

- plusieurs commandes récentes correspondent au même numéro
- aucune commande n’est trouvée
- le client veut modifier/annuler
- le message est agressif ou confus
- la demande sort du périmètre

Réponse type :

```text
Je n’ai pas assez d’informations pour répondre avec certitude.
Je transfère votre demande à l’équipe Warko afin qu’un conseiller vérifie votre commande.
```

## Sécurité

À ne pas faire :

- donner à n8n un accès direct large à Supabase
- exposer la service role key dans n8n si ce n’est pas strictement nécessaire
- laisser l’IA lire des tables sensibles
- envoyer les coûts d’achat, marges ou bénéfices au client

À faire :

- créer un endpoint Warko dédié à WhatsApp
- protéger cet endpoint avec un secret webhook
- filtrer par organisation
- limiter les champs retournés
- logguer les requêtes importantes
- prévoir du rate limiting si le volume augmente

## Quand passer à un système plus complexe

Construire un système natif au lieu de n8n devient pertinent si :

- le volume WhatsApp devient élevé
- plusieurs agents humains doivent répondre depuis Warko
- il faut une boîte de réception support complète
- il faut conserver l’historique conversationnel dans Warko
- il faut mesurer temps de réponse, satisfaction, escalades
- les conversations deviennent commerciales, pas seulement support
- il faut gérer finement les templates WhatsApp et campagnes

## Roadmap proposée

### Phase 1 — Prototype n8n

- Configurer WhatsApp Cloud API
- Créer webhook n8n pour messages entrants
- Créer un endpoint Warko de lookup commande
- Répondre aux intentions simples
- Handoff humain manuel

### Phase 2 — Endpoint Warko robuste

- Recherche par téléphone normalisé
- Gestion des commandes multiples
- Réponse structurée stable
- Logs des requêtes WhatsApp
- Secret d’authentification n8n → Warko

### Phase 3 — IA contrôlée

- Prompt système strict
- Réponses en français ivoirien professionnel
- Refus des informations sensibles
- Tests sur messages clients réels

### Phase 4 — Support avancé

- Handoff dans Warko
- Historique conversationnel
- Statistiques support
- Tags/intents
- relances automatiques

## Recommandation

Commencer avec n8n.

Construire un système complexe maintenant serait prématuré. Le bon chemin est de valider vite que les clients utilisent vraiment WhatsApp pour demander l’état des commandes, puis de renforcer progressivement.

La clé : Warko garde les données et les règles métier ; n8n orchestre ; l’IA reformule.
