# Smoke test — core flows

Run after backend is deployed and app is pointed at production (or staging). Use a test Stripe account and test cards for payments.

---

## 1. API health

```bash
curl -s https://<APP_BASE_URL>/api/health
```

Expected: `{"ok":true,"timestamp":...,"platform":"ClientCheck","status":"operational"}`

---

## 2. Auth and session

- [ ] Open app → Sign in (or create account).
- [ ] Confirm you see the main/home screen and user state persists after backgrounding.

---

## 3. Customer flow

- [ ] Add a customer (name, phone/email, address if required).
- [ ] Search for the customer; confirm they appear.
- [ ] Open customer detail; confirm data is correct.

---

## 4. Reviews

- [ ] As contractor: add or view a review for a customer (or use existing test data).
- [ ] As customer: view reviews for a customer (public or after lookup).
- [ ] Confirm review appears in list/detail.

---

## 5. Subscription (mobile)

- [ ] Go to subscription/plan screen.
- [ ] Select monthly or yearly.
- [ ] Tap subscribe → Payment Sheet opens (Stripe).
- [ ] Use test card (e.g. `4242 4242 4242 4242`); complete payment.
- [ ] Confirm success screen or subscription state.
- [ ] (Optional) In Stripe Dashboard, confirm PaymentIntent and subscription (if price IDs are set).

---

## 6. Stripe webhook

- [ ] After a payment or subscription event, in Stripe Dashboard → Webhooks → your endpoint → see successful delivery (200).
- [ ] If you have logs, confirm no 4xx on `/api/webhooks/stripe`.

---

## 7. Dispute (if applicable)

- [ ] Create or open a dispute from the app.
- [ ] Confirm it appears in the list and status is correct.

---

## 8. Web (optional)

- [ ] Open app in browser (or exported web build).
- [ ] Sign in, search customer, view subscription screen.
- [ ] On subscription, confirm “Use the app to pay” (or Stripe.js) behavior.

---

## Optional: automated API smoke script

From project root, with `API_BASE_URL` set:

```bash
# PowerShell
$base = $env:EXPO_PUBLIC_API_BASE_URL
if (-not $base) { $base = "http://localhost:3000" }
Invoke-RestMethod -Uri "$base/api/health" -Method Get
```

Fix any failing step before considering the release ready.
