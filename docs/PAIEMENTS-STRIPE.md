# Paiements — mise en route (Stripe, TWINT, QR-facture)

Le code des paiements est en place. Pour que ça fonctionne en production, il
reste **3 actions côté tableaux de bord** (Supabase, Stripe, Vercel) — que moi
je ne peux pas faire à ta place (clés secrètes).

## Modèle

- **Carte** → prélèvement **automatique** (abonnement Stripe). L'abonnement est
  annulé automatiquement après le dernier versement.
- **TWINT** → 1er versement réglé tout de suite ; les suivants sont des factures
  à régler depuis « Mes factures ».
- **QR-facture** → virement bancaire (aucun Stripe).
- **Cadences** : annuel (1), semestriel (2), trimestriel (4), mensuel (10).
  Le total de la formule (saison/tour, jeunes/adultes) est divisé par le nombre
  de versements.

## 1. Base de données (Supabase)

Dans **Supabase → SQL Editor**, exécute le contenu de
`supabase/_RUN_IN_SQL_EDITOR.sql` (idempotent). Il contient désormais :

- le correctif de récursion RLS de `profiles` (0003) ;
- la table `payment_plans` + colonnes `invoices.payment_plan_id` /
  `installment_number` (0013).

Sans cette étape, le formulaire d'inscription renverra une erreur.

## 2. Stripe

1. **Clés API** (mode test d'abord) : Dashboard Stripe → Développeurs → Clés API.
2. **Active TWINT** : Dashboard Stripe → Réglages → Modes de paiement → active
   **TWINT** (compte suisse, devise CHF requise).
3. **Webhook** : Dashboard Stripe → Développeurs → Webhooks → « Ajouter un
   endpoint » :
   - URL : `https://www.thelastline.ch/api/stripe/webhook`
   - Événements : `checkout.session.completed` et `invoice.paid`
   - Copie le **Signing secret** (`whsec_...`).

## 3. Variables d'environnement (Vercel)

Vercel → Projet `goalkeeper-academy` → Settings → Environment Variables
(Production **et** Preview) :

| Variable                | Valeur                           |
| ----------------------- | -------------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_live_...` (ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (étape 2.3)          |

> La clé publiable (`pk_...`) n'est pas nécessaire : le paiement passe par
> Stripe Checkout en redirection (aucun SDK Stripe côté navigateur).

Pour la QR-facture, renseigne aussi l'émetteur (créancier) :

| Variable            | Exemple                              |
| ------------------- | ------------------------------------ |
| `CREDITOR_NAME`     | The Last Line — Goalkeeper Academy   |
| `CREDITOR_IBAN`     | CH.. (idéalement une QR-IBAN)        |
| `CREDITOR_ADDRESS`  | Rue …                                |
| `CREDITOR_CITY`     | 1860 Aigle                           |
| `CREDITOR_COUNTRY`  | CH                                   |

Après ajout des variables, **redeploy** (Vercel le propose automatiquement).

## 4. Test (mode test Stripe)

- Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.
- Fais une inscription « mensuel » en carte → un abonnement apparaît dans
  Stripe, la 1ʳᵉ facture est payée, et les 10 versements se cochent au fil des
  cycles (en test tu peux avancer l'horloge Stripe).
- TWINT n'a pas de carte de test : à vérifier en mode live avec un petit montant.

## Tant que les clés ne sont pas là

Le site ne casse pas : l'inscription est enregistrée (plan + factures « en
attente ») et l'écran de confirmation s'affiche. Le paiement en ligne s'active
dès que les clés sont en place.
