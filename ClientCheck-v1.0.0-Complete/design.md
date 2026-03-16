# ClientCheck — Mobile App Interface Design

## App Concept
A contractor-first vetting platform where licensed professionals can search, rate, and review customers before accepting jobs. Think Yelp, but reversed — contractors protect themselves from problem clients.

---

## Brand & Color Palette

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `primary` | `#1B4F8A` | `#3B82F6` | Deep contractor blue — trust, professionalism |
| `background` | `#F8FAFC` | `#0F172A` | Clean slate |
| `surface` | `#FFFFFF` | `#1E293B` | Cards, modals |
| `foreground` | `#0F172A` | `#F1F5F9` | Primary text |
| `muted` | `#64748B` | `#94A3B8` | Secondary text |
| `border` | `#E2E8F0` | `#334155` | Dividers |
| `success` | `#16A34A` | `#4ADE80` | 5-star / paid on time |
| `warning` | `#D97706` | `#FBBF24` | 3-star / caution |
| `error` | `#DC2626` | `#F87171` | 1-star / avoid |
| `accent` | `#F59E0B` | `#FBBF24` | Star ratings (gold) |

---

## Screen List

1. **Home / Feed** — Trending flagged customers, recent community reviews, search bar
2. **Search** — Search customers by name, phone, address; filter by rating/trade
3. **Customer Profile** — Full profile with aggregate ratings, all reviews, flag history
4. **Add Review** — Multi-category star rating form + written review
5. **My Reviews** — Reviews the logged-in contractor has submitted
6. **Community Alerts** — High-priority warnings (non-payers, scammers, aggressive behavior)
7. **Profile / Settings** — Contractor's own profile, trade type, notification prefs

---

## Primary Content Per Screen

### Home / Feed
- Search bar (prominent, top)
- "Recently Flagged" horizontal scroll cards (red-bordered)
- "Community Reviews" vertical feed (most recent reviews across all customers)
- Quick-add FAB (floating action button) to add a new customer review

### Search
- Full-text search input (name, phone number, address)
- Filter chips: All / High Risk / Good Payers / Disputed
- Results list: Customer name, city, overall star rating, review count, trade tags
- Empty state with prompt to add a new customer

### Customer Profile
- Customer name, city/state, profile initials avatar
- Overall star rating (large, prominent) + total review count
- Rating breakdown bar chart (5→1 stars)
- Category ratings row: Payment, Communication, Clarity, Professionalism, Dispute History
- "Red Flags" badge strip (e.g., "Disputed Invoice", "Slow Pay", "Scope Creep")
- Reviews list (contractor name/trade, date, text, category stars)
- "Add Your Review" button (sticky bottom)

### Add Review
- Customer search/select or create new customer
- Customer name, phone, address, city/state fields
- Overall star rating (large tap targets)
- Category ratings (1–5 stars each):
  - Paid on Time
  - Communication
  - Knew What They Wanted
  - Professionalism / Respect
  - Invoice Disputes
  - Would Work Again
- Red Flag toggles (multi-select chips):
  - Slow/Late Payer
  - Disputed Invoice
  - Scope Creep
  - Aggressive / Rude
  - Changed Mind Mid-Job
  - Didn't Know What They Wanted
  - Tried to Negotiate After Completion
  - Property Damage Claims
- Written review text area
- Submit button

### My Reviews
- List of reviews the current contractor has submitted
- Edit / Delete options per review
- Stats summary: total reviews, avg rating given

### Community Alerts
- High-priority cards for customers with 1–2 star averages
- Filter by trade type (Plumbing, Electrical, General, Roofing, etc.)
- "Mark as Helpful" on alerts

### Profile / Settings
- Contractor name, trade specialty, license number (optional)
- Notification preferences
- Dark mode toggle
- About / Privacy / Terms links
- Logout

---

## Key User Flows

### Flow 1: Vet a New Customer
1. Contractor receives a call from a potential customer
2. Opens app → taps Search tab
3. Types customer name or phone number
4. Sees customer profile with aggregate rating
5. Reads reviews from other contractors
6. Decides to accept or decline the job

### Flow 2: Leave a Review After a Job
1. Job is complete (or went badly)
2. Contractor taps "+" FAB or "Add Review" button
3. Searches for existing customer or creates new profile
4. Rates 1–5 stars overall + fills category ratings
5. Selects applicable red flag chips
6. Writes a text review
7. Submits — review appears on customer profile

### Flow 3: Browse Community Alerts
1. Contractor opens Home tab
2. Sees "Recently Flagged" section
3. Taps alert card → Customer Profile
4. Reads all reviews and red flags
5. Marks alert as helpful

---

## Navigation Structure

```
Tab Bar (bottom):
├── Home (house icon)
├── Search (magnifying glass)
├── Add Review (+ icon, center, accent color)
├── Alerts (bell icon)
└── Profile (person icon)

Stack navigators:
├── Home → Customer Profile → Add Review
├── Search → Customer Profile → Add Review
└── Alerts → Customer Profile
```

---

## Rating Categories (Detailed)

| Category | Icon | Description |
|----------|------|-------------|
| Paid on Time | dollar-sign | Did they pay promptly when invoiced? |
| Communication | chat-bubble | Were they responsive and clear? |
| Knew What They Wanted | lightbulb | Did they have a clear scope? |
| Professionalism | handshake | Were they respectful and professional? |
| Invoice Accuracy | document | Did they dispute legitimate charges? |
| Would Work Again | repeat | Overall — would you take this job again? |
