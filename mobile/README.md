# Seeder Mobile — Native Android Music Application

A native Android music player built with **Flutter**, featuring uninterrupted background playback, lock-screen controls, on-device music discovery, and the exact same Spotify-inspired dark UI as the Seeder mobile web application.

---

## 📱 Features

- **100% Native Background Playback**:
  - Uses `just_audio` + `audio_service` to run a true Android Foreground Service (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`).
  - Keeps playing when you minimize the app, switch to other apps, or lock your phone screen.
  - Native lock-screen media player with album art, scrub bar, play/pause, and skip controls.
- **Standalone On-Device Engine**:
  - Direct music search and stream resolution using `youtube_explode_dart`.
  - Zero server dependency — queries YouTube/YouTube Music directly on the device.
- **Exact Mobile Web Aesthetic**:
  - Identical dark theme palette (`#0F0F12`, `#18181C`, Amber `#F59E0B` accents).
  - 4-tab bottom navigation: **Home**, **Search**, **Your Library**, and **Create**.
  - Docked floating **MiniPlayer** with live track progress.
  - Expandable **Now Playing Theater View** with ambient blurred backdrop, album artwork, lyrics mode, and elevated thumb-zone playback controls.
- **Local Library Storage**:
  - Persistent Liked Songs and Custom Playlists saved directly on device storage.

---

## 🛠️ Prerequisites

1. **Flutter SDK** (3.0+): [Install Flutter](https://docs.flutter.dev/get-started/install)
2. **Android Studio** or **Android SDK Command-line Tools** with an Android device or emulator (Android 8.0+ / API 26+).

---

## 🚀 Running on Your Android Device / Emulator

1. Open a terminal and navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```

2. Fetch all dependencies:
   ```bash
   flutter pub get
   ```

3. Connect your Android phone via USB (with USB Debugging enabled) or start an emulator, then run:
   ```bash
   flutter run
   ```

---

## 📦 Building Standalone APK for Direct Download

To generate the standalone release APK that can be transferred, downloaded, and installed on any Android phone:

```bash
cd mobile
flutter build apk --release
```

The APK will be generated at:
```
mobile/build/app/outputs/flutter-apk/app-release.apk
```

You can distribute this APK or upload it directly to your website/drive for 1-click mobile download!
