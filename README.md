# Smart Society 🌴

A mobile-first, installable web app (PWA) for apartment community management:
announcements, community feed, maintenance payments, complaints, visitors & gate
security, facility booking, marketplace, events, polls, emergency help and a
role-based admin dashboard.

Open it in Chrome on your phone → tap **⋮ → Add to Home screen** (or the
**Install** button in Profile). It then opens full-screen like an app and works
offline. No APK, no Android Studio, no computer needed.

---

## 1. Put it online (one time, from your phone)

1. Open this repository on github.com in your phone browser.
2. **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
3. Go to the **Actions** tab → *Deploy to GitHub Pages* → **Run workflow**
   (or just push any commit to the default branch).
4. After ~1 minute your app is live at
   `https://<your-username>.github.io/Society-app/`.
5. Open that link in Chrome on your phone → **Add to Home screen**.

## 2. Try the demo

On the login screen either log in with a mobile number (an OTP is shown on screen
in demo mode — no SMS is sent), or tap a demo account:

| Demo account | What to try |
|---|---|
| **Resident** – Priya Sharma, A-302 | Approve the Swiggy delivery waiting at the gate, pay maintenance, raise a complaint, invite a guest (QR + OTP pass), book the badminton court, vote, RSVP |
| **Chairman** | Admin dashboard, approve new registrations, publish announcements, broadcast emergency alerts, moderate the feed, reports |
| **Treasurer** | Configure maintenance charges, generate monthly bills, apply late fees, record cash payments, export CSV |
| **Facility Manager** | Assign complaints to staff, update status, internal notes, approve hall bookings |
| **Security Guard** | Separate gate console: verify OTP / scan QR, register walk-ins, approvals, entry/exit log |
| **Super Admin** | Everything, including role changes |

Use **Profile → Log out / switch demo account** to switch roles, and
**Profile → Reset demo data** to start fresh.

Test-card tip: on the simulated payment gateway, any card works; a card ending in
`0002` simulates a bank decline.

> **Important — demo mode:** all data is stored on the device (IndexedDB). Two
> different phones do **not** see each other's posts or payments yet. Open tabs on
> the same phone do sync live (try a Guard tab and a Resident tab side by side).
> To share data across all residents, connect the Supabase backend (section 4).

## 3. Features

- **Languages: English · मराठी · हिंदी** – switch on the login screen or in Profile → Settings → Language. The choice is remembered on the phone, and phones set to Marathi or Hindi open in that language automatically. Menus, buttons, forms, messages and dates are translated; what residents type themselves (posts, comments, names, notices) stays in the language it was written in. Downloaded PDF receipts are in English.

- **Home** – greeting, flat number, notification bell, emergency banner, visitor-at-gate approval card, dues card, shortcuts, announcements (pinned, Urgent/Important/General, expiry, read/unread, attachments, acknowledgements) and a social feed (photos/videos, likes, comments, share, report, 7 categories with filters).
- **Central ＋ button** – bottom sheet with 8 quick actions: complaint, pay maintenance, post, report issue, request service, invite visitor, lost & found, create event.
- **Maintenance** – outstanding amount, next due date, last payment, status; bill breakdown, late fees, adjustments; simulated UPI / card / net-banking gateway; payment history; downloadable **PDF receipts**. Admin: rate per sq.ft, fixed and flat-specific charges, bill generation, late fees, waivers, offline payments, paid/unpaid tracking, CSV export.
- **Helpdesk** – complaints & service requests with unique ticket numbers, categories, photos/videos, location, priority, contact preference; Submitted → Acknowledged → In Progress → Resolved → Closed; comments, reopen, star rating. Admin: assign staff, internal notes, SLA/overdue tracking, response & resolution times.
- **Visitors** – pre-approve with QR code + 6-digit OTP, share pass via WhatsApp, arrival notifications, approve/deny walk-ins, history. **Guard console**: verify code or scan QR (camera), register guests/deliveries/cabs/service providers, call resident, entry/exit log with CSV.
- **Facilities** – 8 amenities, 14-day date strip, slot grid, rules, charges, approvals, cancellation, double-booking prevention and per-flat limits.
- **Directory** – searchable residents by tower with privacy controls, committee, useful & emergency contacts with one-tap call/WhatsApp.
- **Marketplace** – sell, rent, services, free, wanted; photos, price, expiry, renew, mark sold, call/WhatsApp seller.
- **Events** – calendar, RSVP with guests and capacity, reminders, add to phone calendar (.ics), photo gallery.
- **Polls** – single/multiple choice, closing date, anonymous voting, live results, eligibility (per flat / per resident / owners only).
- **Emergency** – SOS to security, one-tap 108/101/100/112, society contacts, admin-only emergency broadcasts.
- **Notifications** – in-app centre, per-category preferences, real device notifications (when allowed), reminders for dues and events.
- **Profile** – photo, contact info, family members with full/limited access and optional own login, vehicles, emergency contact, privacy and notification settings.
- **Admin dashboard** – overview stats, residents & flat map, registration approvals, role management, billing, complaints, bookings, visitor logs, moderation, and reports (collection, outstanding, complaints, visitors, facility usage, engagement).

### Roles
Super Admin · Chairman · Secretary · Treasurer · Committee Member · Facility
Manager · Security Guard · Resident — permissions are defined in one place,
`src/lib/rbac.js`, and enforced in both the UI and the data layer
(`src/lib/actions.js`).

## 4. Architecture

```
src/
  lib/db.js        local-first store (IndexedDB) – list/get/insert/update/remove, cross-tab sync
  lib/actions.js   domain API: validation + permission checks for every workflow
  lib/rbac.js      roles → permissions
  lib/seed.js      realistic sample society (72 flats, residents, bills, tickets…)
  lib/pdf.js       dependency-free PDF writer (receipts, notices)
  i18n/            Marathi & Hindi dictionaries (strings1-4.js) + translator (index.js)
  components/      design system (cards, sheets, chips, tabs, charts…)
  pages/           feature modules; pages/admin/ for the dashboard
supabase/schema.sql  Postgres schema + RLS for the cloud backend
```

- React 18 + Vite + Tailwind CSS, `vite-plugin-pwa` (service worker, offline, install).
- **Multi-society ready:** every record carries `societyId`; the store scopes queries to the current society.
- **Going live with real shared data:** create a Supabase project, run `supabase/schema.sql`, enable phone OTP auth, and replace the bodies of `db.list/insert/update/remove` with Supabase table calls (the action layer and UI stay the same). Use Supabase Storage for photos and Realtime for notifications.
- **Real payments:** use an Indian gateway such as Razorpay or Cashfree. Create orders and verify payment signatures in a server-side function (e.g. a Supabase Edge Function) and only mark bills paid from that verified webhook — never from the browser.
- **Native Android later:** this PWA can be wrapped as a Play Store app with a Trusted Web Activity (e.g. Bubblewrap / PWABuilder) without rewriting it.

## 5. Develop locally (optional, needs a computer)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

### Adding or correcting a translation
Open `src/i18n/strings1.js` … `strings4.js` and edit the line
`['English text', 'मराठी', 'हिंदी']`. Text with numbers or names in it
("3h ago", "Ticket #PG-1043 created") is handled by the patterns in
`src/i18n/index.js`.
