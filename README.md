# Burkit SmartCity

A mobile-first local marketplace: React (Vite) frontend + Google Apps Script / Sheets / Drive backend.

## Folder structure

```
burkit-smartcity/
├── backend/
│   └── Code.gs          # Full Apps Script REST API (paste into Apps Script editor)
└── frontend/             # React + Vite + Tailwind app
```

## 1. Backend setup (Google Apps Script)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
   Copy its ID from the URL: `https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the default code and paste in the contents of `backend/Code.gs`.
4. Replace `SHEET_ID` at the top of the file with the ID you copied.
5. (Optional) add your own number(s) to `ADMIN_MOBILE_NUMBERS` so you can access `/admin`.
6. In the function dropdown at the top, select `setup` and click **Run** once.
   - The first run will ask for authorization — approve it (this is your own script acting on your own sheet/drive).
   - This creates the `Users`, `Products`, `Categories`, `Reports` sheets with headers, seeds 10 default categories, and creates two Drive folders for images.
7. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Copy the Web App URL (ends in `/exec`) — this is your API base URL.

Whenever you edit `Code.gs`, redeploy with **Deploy → Manage deployments → Edit → New version** so the live URL picks up your changes.

## 2. Frontend setup (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env
# edit .env and paste your Apps Script Web App URL into VITE_API_URL
npm run dev
```

The app runs at `http://localhost:5173`.

To build for production:

```bash
npm run build
```

This outputs static files to `frontend/dist/`, which you can host anywhere (Vercel, Netlify, Firebase Hosting, GitHub Pages, or even Google Drive/Apps Script itself).

## How it works

- **Auth**: Login/Register happen against the `Users` sheet, matched by mobile number. There's no password — OTP verification is stubbed as optional in `Code.gs` (`login()`), ready for you to wire up an SMS provider like MSG91 or Twilio via `UrlFetchApp`.
- **Products**: Sellers submit via *Add Product*. New listings are saved with `status = Pending` and only appear in the Market once an admin approves them from `/admin`.
- **Images**: Uploaded as base64 to the `/upload-image` endpoint, which writes the file to a Google Drive folder, makes it link-viewable, and returns a direct image URL that gets stored in the `Products` sheet's `imageUrls` column (comma-separated).
- **Buy Now**: Opens `https://wa.me/<sellerNumber>?text=...` with a pre-filled message — no in-app chat or payment, the deal happens directly on WhatsApp.
- **Admin**: Any user whose mobile number is listed in `ADMIN_MOBILE_NUMBERS` (in `Code.gs`) sees an Admin Dashboard entry in their Profile menu and can approve/reject pending listings.

## Notes & next steps

- This is a working reference implementation, not a production-hardened system: Apps Script has execution-time and quota limits, and the "auth" here trusts the mobile number without a password or verified OTP. For anything beyond a small pilot, consider adding real OTP verification and rate limiting on the `/login` and `/register` endpoints.
- Dark mode: Tailwind is configured with `darkMode: 'class'` and dark-mode variants are already applied throughout the UI — toggle it by adding/removing the `dark` class on `<html>` (a settings toggle can be wired up in `Profile.jsx`).
