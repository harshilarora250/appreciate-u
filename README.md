# AppreciateU

A frontend-only UPI QR generator and embeddable tipping widget. Anyone can create a payment QR or link with a recipient's UPI ID; no registration, backend, database, or payment verification is involved.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. Run the automated core tests with `npm test`, then serve `dist/` with any static host. Vercel can deploy this repository directly; `vercel.json` rewrites `/embed`, `/privacy`, and `/terms` to the static app and allows third party framing of `/embed` using `frame-ancestors *`. No environment variables are required. Embed URLs use the current `window.location.origin`, so a Vercel preview/production origin is used automatically. Add a custom domain to the Vercel project when you are ready; the widget builder will then generate links for that origin.

## Features

- Create UPI deep links and QR images (PNG and SVG) in the browser.
- Adjust QR foreground and background colors; keep strong contrast and the quiet zone for reliable scanning.
- Build a self-contained widget on `/embed` and copy its iframe HTML or URL.
- The embedded route reads only its own URL. It does not depend on parent-page code, cookies, storage, or messaging.
- No analytics, accounts, tracking, uploads, or server-side application logic.

## Widget URL parameters

Required: `upi` (syntactic UPI address such as `someone@okaxis`). Optional: `amount` (initial INR amount), `amounts` (comma-separated preset amounts), `name` (display name), `theme` (`dark` or `light`), `color` (six-digit hex accent color), and `cta` (short label). For example:

```text
https://your-vercel-origin.vercel.app/embed?upi=someone%40okaxis&amount=40&amounts=10%2C20%2C40%2C100&theme=dark
```

Amounts must be positive, finite, up to ₹100,000 and have at most two decimal places. Invalid list entries are discarded, duplicates removed, and at most six presets are shown. A safe set of presets is used when a provided list has no valid entries. An invalid UPI ID results in a compact error state. Example iframe:

```html
<iframe src="https://your-vercel-origin.vercel.app/embed?upi=someone%40okaxis&amp;amount=40&amp;amounts=10%2C20%2C40%2C100&amp;theme=dark" title="UPI tipping widget" width="320" height="420" loading="lazy" style="border:0;border-radius:16px;max-width:100%;"></iframe>
```

## Payment and privacy limits

The URI opens a compatible UPI app through the device's normal link handling. App and browser support varies. If no UPI app opens, the supporter can scan the QR or copy the payment link. The supporter completes payment in their UPI app. AppreciateU never processes or verifies a payment and never shows a payment-success state. Always check the UPI ID and amount before sharing or paying; this tool cannot verify account ownership.

The UPI ID and optional display name are encoded in the payment QR/link and widget URL. Anyone with those can see the recipient details. The app does not store them or send them to an AppreciateU backend. Browser support and iframe policies may vary by embedding host; `/embed` is served with a permissive framing policy on Vercel. The main application pages do not set that relaxed header.
