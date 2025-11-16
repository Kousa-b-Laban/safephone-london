# SafePhone London

Phone theft prevention app for London with crime mapping and incident reporting.

## Features

- **Interactive Crime Map**: View phone theft hotspots across London using Mapbox
- **Real-time Incident Reporting**: Report thefts, suspicious activity, or safe zones
- **Live Statistics**: Track total reports, thefts, and safe areas
- **Geolocation**: Automatically centers on your location
- **Firebase Backend**: Real-time data sync across all users

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Mapbox GL JS for mapping
- Firebase Firestore for database
- Vercel for deployment

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Your Mapbox access token
- `NEXT_PUBLIC_FIREBASE_*` - Your Firebase project configuration

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
vercel login
vercel deploy --prod
```

Then add your environment variables in the Vercel dashboard.

### Option 2: GitHub Integration

1. Push this code to GitHub
2. Import the repository in Vercel
3. Add the following environment variables in Vercel's project settings:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoia291c2FibGFiYW4iLCJhIjoiY21pMjVyeGt3MTNxaTJtc2Z1NXNpcWlrNCJ9.D2okdmGKJYjo7n3ooTfDTQ
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDKIIjF2Vx7RjtWMyU-oaE1zN4Vvzqwx-g
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=safephone-london.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=safephone-london
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=safephone-london.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=576786760012
NEXT_PUBLIC_FIREBASE_APP_ID=1:576786760012:web:94be8ca2bbb4c055e28fe9
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-YB373T02BD
```

4. Deploy!

## Firebase Setup

Make sure your Firebase project has:
1. Firestore Database enabled
2. Security rules configured for your use case

Basic security rules for testing:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /incidents/{document} {
      allow read, write: if true;
    }
  }
}
```

## Usage

1. Allow location access when prompted
2. The map will center on your location
3. Tap anywhere on the map to report an incident
4. Choose the incident type (Theft, Suspicious Activity, or Safe Zone)
5. Add a description and submit
6. View all reported incidents on the map with color-coded markers

## License

MIT
