# Impression et archivage des livreurs

## Déploiement

Appliquer `supabase/migrations/20261023173002_delivery_driver_archiving.sql` avant le code applicatif. La migration utilise le champ `delivery_drivers.is_active` existant, retire la suppression directe aux clients et valide les nouvelles affectations sous verrou sur le livreur. Elle ne supprime ni commande, ni versement, ni solde.

## Utilisation

Tout utilisateur disposant de l’accès aux commandes peut créer puis imprimer avec **Enregistrer et imprimer**. La commande est enregistrée une seule fois avant l’ouverture du sélecteur. Un échec ou une annulation d’impression ne relance jamais sa création. Les choix d’imprimante et de papier sont propres au compte et à la boutique sur cet appareil.

- **Système / AirPrint** : aucun helper Warko à installer. Configurer l’imprimante dans le système, choisir A4, 58 mm ou 80 mm, puis sélectionner l’imprimante dans la fenêtre système. Sur iPhone/iPad, une imprimante AirPrint sur le même réseau est nécessaire pour cette méthode. Le PDF reste un téléchargement distinct. Voir la [documentation Apple](https://support.apple.com/en-gb/109349).
- **Android / RawBT** : installer [RawBT](https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter), y associer l’imprimante et y vérifier le format. Dans Warko, choisir Android, 58 ou 80 mm, préparer le ticket puis toucher **Envoyer à RawBT**. Le choix et l’ajout des périphériques Bluetooth se font dans RawBT, pas dans la liste des appareils du navigateur. Les tickets sont envoyés comme graphiques ESC/POS pour préserver logo et accents. Référence : [exemple officiel RawBT](https://github.com/402d/rawbt.402d.ru/blob/master/app2/index.php).
- **Ordinateur / QZ Tray** : installer le pilote de l’imprimante et [QZ Tray](https://qz.io/download/), ouvrir QZ Tray, puis rechercher et choisir l’imprimante dans Warko. Autoriser les demandes de connexion et d’impression. Configurer le même format de papier dans le pilote. Le navigateur télécharge le PDF avec sa session et le transmet au helper local ; aucune commande privée n’est publiée pour le helper. L’intégration utilise les confirmations QZ standard, sans certificat de signature configuré. Pour une impression entièrement silencieuse, une configuration supplémentaire de confiance/signature est nécessaire : [documentation QZ](https://qz.io/docs/signing).

L’accusé d’envoi au helper ne garantit pas une sortie papier. Vérifier l’imprimante avant de réessayer. Pour les tickets trop longs pour une intention Android (limite volontaire de 300 000 caractères base64), utiliser le système ou le PDF. Aucune commande n’est tronquée ou découpée en impressions partielles.

## Livreurs archivés

Un administrateur peut **Archiver** dans Livraisons. Le livreur disparaît des nouvelles affectations et reste consultable dans **Archivés**. **Restaurer** le rend à nouveau disponible. Les commandes historiques conservent leur livreur ; elles restent modifiables sans le réaffecter. Un versement final est possible après archivage. Les totaux globaux de Livraisons continuent d’inclure les anciens livreurs.

## Validation

Tests automatisés : accès administrateur et boutique, archivage/restauration sans suppression, historique financier et versement final, refus SQL d’affectation inactive ou étrangère, création unique avant impression, préférences isolées, transport QZ avec session, erreurs et nouvelles tentatives, bornes et conversion ESC/POS.

Contrôle navigateur local : sélecteur à 390 px, tickets graphiques 58/80 mm, logo, accents, motifs longs, totaux et ouverture système. Un test physique reste requis pour les modèles utilisés : associer chaque imprimante, imprimer un reçu avec logo/remise et vérifier largeur, lisibilité, avance/coupe, puis déconnecter et réessayer. La compatibilité de chaque imprimante dépend de son protocole, de son pilote et du helper.
