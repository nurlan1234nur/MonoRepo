# nous mobile

Expo React Native app for the gradual PWA -> native migration.

## Start

```powershell
npm --prefix mobile run start
```

From the workspace root, this is also available as:

```powershell
npm run dev:mobile
```

## Environment

Set the backend origin before starting the app:

```powershell
$env:EXPO_PUBLIC_API_ORIGIN="http://localhost:4000"
npm run dev:mobile
```

For a real device, use a backend URL reachable from the phone, for example the computer's LAN IP instead of `localhost`.
