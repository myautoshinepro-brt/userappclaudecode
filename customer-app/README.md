# SparkWash 🚗💧

A BookMyShow-style car wash booking platform for India (Mumbai first).

## Project Structure

```
sparkwash/
├── index.html              # Home screen (entry point)
├── css/
│   ├── base.css            # Reset, variables, shared utilities
│   ├── components.css      # Reusable components (cards, buttons, modals)
│   └── screens.css         # Screen-specific styles
├── js/
│   ├── data.js             # All data: centers, packages, promos
│   ├── state.js            # Global app state & state management
│   ├── router.js           # Screen navigation
│   ├── location.js         # Location modal (GPS, type, drop pin)
│   ├── home.js             # Home screen: search, filters, map
│   ├── detail.js           # Center detail: packages, slots
│   ├── summary.js          # Booking summary & promo codes
│   ├── booking.js          # Confirmed, manage, modify, cancel
│   ├── bookings.js         # My bookings list & rating
│   └── profile.js          # Profile & all sub-screens
└── screens/
    ├── home.html
    ├── detail.html
    ├── summary.html
    ├── confirmed.html
    ├── manage.html
    ├── bookings.html
    └── profile/
        ├── index.html
        ├── edit.html
        ├── addresses.html
        ├── vehicles.html
        ├── payments.html
        ├── notifications.html
        ├── language.html
        └── help.html
```

## Screens Built ✅

### Booking Flow
- 🏠 **Home** — Location modal (GPS/type/pin), search, filter chips, mini-map, center cards
- 🔍 **Center detail** — Wash type tabs (Water→Dry→Steam→D2D), package cards, slot picker, smart bottom bar
- 📋 **Summary** — Booking details, promo code sheet, price breakdown, payment methods
- ✅ **Confirmed** — Booking confirmation, WhatsApp notification
- 📱 **Manage** — Live map, booking details, status tracker, modify/cancel
- 📋 **My bookings** — Upcoming + past bookings, star rating

### Profile
- 👤 **Profile home** — All menu items
- ✏️ **Edit profile** — Name, email, city, photo
- 📱 **Change phone** — OTP verification flow
- ⭐ **My reviews** — All ratings given
- 🎟️ **Promo codes** — Active codes, add code, refer & earn
- 📍 **Saved addresses** — Home/Office/Parents, set default, add new
- 🚗 **My vehicles** — Saved cars/bikes, add vehicle
- 💳 **Payment methods** — UPI, saved cards, add new
- 🔔 **Notifications** — Toggle channels & event types
- 🌐 **Language** — English, Hindi, Marathi, Gujarati
- ❓ **Help & support** — WhatsApp, call, email, FAQs

## App Ecosystem (Planned)

| App | Platform | Status |
|-----|----------|--------|
| Customer App | iOS + Android + Web | ✅ Prototyped |
| Center Admin | Web + Android tablet | 🔲 Planned |
| Field Agent | Android (budget phones) | 🔲 Planned |
| Call Center | Web desktop | 🔲 Planned |
| Super Admin | Web (secure) | 🔲 Planned |

## Wash Types (Priority Order)
1. 💧 Water Wash
2. 🧴 Dry Wash
3. 💨 Steam Wash
4. 🚗 Door-to-Door (D2D)

## Promo Codes (Test)
| Code | Discount | Valid |
|------|----------|-------|
| SPARKFIRST10 | 10% off | ✅ First-time users |
| WASH20 | 20% off | ✅ Water wash |
| MUMBAI30 | ₹30 flat off | ✅ Mumbai users |
| STEAM15 | 15% off | ❌ Steam only |
| WEEKEND50 | ₹50 flat | ❌ Weekends only |
| NEWUSER100 | ₹100 off | ❌ Min ₹500 |

## Tech Stack (Recommended for Production)
- **Frontend**: React Native (iOS + Android) + Next.js (Web)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Redis
- **Payments**: Razorpay
- **Maps**: Google Maps API
- **Notifications**: WhatsApp Business API + Firebase FCM
- **Hosting**: AWS / Railway

## Design Decisions
- Selected states: dark navy `#1e40af` background + white text (contrast)
- Total payable: dark navy box, white text
- Location: one-tap saved address → auto-close modal
- Package select → slot section auto-scrolls into view
- No "Confirm" button for saved addresses — one tap closes
- Bottom nav: 3 tabs only (Home, Bookings, Profile) — no Search tab

## Color Palette
```css
--blue:  #1a73e8   /* Primary actions */
--green: #2e7d32   /* Confirm, success */
--red:   #c62828   /* Cancel, error */
--gold:  #f9a825   /* Star ratings */
--navy:  #1e40af   /* Selected states, total box */
```
