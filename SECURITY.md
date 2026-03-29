# Firebase Security Checklist

This project uses client-side Firebase, so config values in `script.js` are public by design.
Real security is enforced by Firestore rules and Firebase settings.

## 1. Deploy the Firestore rules

```bash
firebase login
firebase use ovexi-6ef38
firebase deploy --only firestore:rules,firestore:indexes
```

## 2. Turn on App Check enforcement

In Firebase Console:
- Enable **App Check** for Web app (reCAPTCHA Enterprise or v3).
- Enforce App Check for:
  - Firestore
  - (Any other used services)

## 3. Lock down admin access

`contact_requests` reads are blocked for public users in rules.
Use admin-only tooling (Cloud Functions/Admin SDK) to read and process them.

## 4. Monitor and rate-limit abuse

- Use Firebase Usage + Cloud Logging alerts.
- Add Cloud Functions endpoint + CAPTCHA verification for stricter bot defense if abuse appears.

## 5. Keep keys and SDK updated

- Rotate keys/secrets if leaked.
- Keep Firebase Web SDK current.
