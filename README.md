# SafePhone London

A Progressive Web App (PWA) for preventing phone theft in London. Features real-time geofencing alerts, interactive crime maps using UK Police API data, and crowdsourced incident reporting.

## Features

- **Interactive Crime Map**: Displays phone theft hotspots in London using data from the UK Police API
- **Real-time Geofencing**: Alerts users when they enter high-theft zones (10 predefined areas)
- **Location Tracking**: Continuously monitors user position with permission
- **Theft Reporting**: Crowdsourced incident reporting stored in Firebase Firestore
- **PWA Support**: Installable on mobile devices, works offline with service worker caching
- **Mobile-First Design**: Optimized for iOS Safari and Android Chrome

## High-Risk Zones

The app monitors the following high-theft areas in London:
- Westminster
- Camden Town
- Shoreditch
- Oxford Street
- King's Cross
- Brixton
- Stratford
- Elephant & Castle
- Tottenham Court Road
- Liverpool Street

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite with PWA plugin
- **Mapping**: Mapbox GL JS
- **Crime Data**: UK Police API (theft-from-the-person crimes)
- **Database**: Firebase Firestore for user reports
- **Location**: Web Geolocation API with continuous tracking
- **PWA**: Service Worker with Workbox for caching

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

### Mapbox Token

The app uses a demo Mapbox token. For production, replace `mapboxgl.accessToken` in `src/App.tsx` with your own token from [Mapbox](https://www.mapbox.com/).

### Firebase

Update the Firebase configuration in `src/App.tsx` with your project credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

## PWA Installation

1. Open the app in a mobile browser (Chrome on Android, Safari on iOS)
2. Look for "Add to Home Screen" option
3. The app will function like a native app with offline support

## Security Notes

- Location permissions are requested on first load
- User reports are limited to 200 characters
- No personal data is stored beyond location coordinates
- All API calls use HTTPS

## API References

- [UK Police API](https://data.police.uk/docs/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)

## License

MIT
