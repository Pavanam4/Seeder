# Music Fetcher — Technical Proof of Concept

> **Goal**: A lightweight, desktop-friendly web application evaluating the feasibility of a future Spotify-style music player by querying YouTube Music for songs, artists, albums, playlists, and new releases, and inspecting metadata and embedded playback capabilities.

---

## 1. Executive Summary & Feasibility Verdict

| Evaluation Area | Feasibility Verdict | Technical Detail & Findings |
| :--- | :---: | :--- |
| **Primary Music Search (`ytmusicapi`)** | **HIGH FEASIBILITY** | `ytmusicapi` (Python FastAPI service) queries YouTube Music's catalog directly without API keys or billing. Provides rich normalized metadata for **songs, artists, albums, playlists, and recent releases** in **~300ms – 1,200ms**. |
| **Alternative Search Providers** | **OPERATIONAL** | `YouTubeExplode` (.NET) and `Invidious` (open proxy) remain available as alternative fallback providers selectable dynamically from the UI. |
| **Desktop Embedded Playback** | **FEASIBLE (WITH CONSTRAINTS)** | The official YouTube IFrame Player API supports programmatic transport (`play`, `pause`, `seek`, `volume`, `mute`) and playback state monitoring (`PLAYING`, `BUFFERING`, `PAUSED`, `ENDED`). Compatible only when an 11-character video ID is available. |
| **Unrestricted Background / Headless Audio** | **UNSUPPORTED / BLOCKED** | Direct stream ripping or headless audio extraction violates YouTube Terms of Service and triggers IP throttling/bot detection. Player must remain visible and use the official IFrame. |
| **Major Label Embedding Restrictions** | **RESTRICTED ON KEY TRACKS** | Major music distributors (e.g., Sony Music / UMG / VEVO) enforce embedding blocks (`Error 150` / `Error 101`). The application detects these codes and displays a one-click fallback link to official YouTube / YouTube Music. |

---

## 2. Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          React + TypeScript          │
                      │          (Vite Dev Server)           │
                      │         http://localhost:5173        │
                      └──────────────────┬───────────────────┘
                                         │  Proxy / API Call (/api)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │         ASP.NET Core Web API         │
                      │         http://localhost:5005        │
                      └──────────────────┬───────────────────┘
                                         │
     ┌───────────────────────────────────┼───────────────────────────────────┐
     ▼                                   ▼                                   ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│   ytmusicapi Provider   │ │ YouTubeExplode Provider │ │    Invidious Provider   │
│   (Primary Provider)    │ │  (Alternative Engine)  │ │   (Alternative Engine)  │
│ - YouTube Music catalog │ │ - No API keys needed    │ │ - Multi-instance retry  │
│ - Songs/Artists/Albums  │ │ - Fast video search     │ │ - Configurable hosts    │
│ - http://localhost:5006 │ └────────────┬────────────┘ └────────────┬────────────┘
└────────────┬────────────┘              │                           │
             │                           └─────────────┬─────────────┘
             │                                         │
             └───────────────────────────┬─────────────┘
                                         ▼
                                   YouTube Servers
```

### Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Vanilla Modern CSS with Spotify-inspired dark aesthetic, Lucide React icons.
- **Backend API**: ASP.NET Core 8.0 Minimal Web API, `HttpClientFactory`, provider resolver adapter pattern.
- **Primary Search Service**: Python 3.12 + FastAPI + `ytmusicapi` microservice running on `http://127.0.0.1:5006`.
- **Alternative Providers**: `YouTubeExplode 6.6.2`, `Invidious` REST client.
- **Testing**: xUnit test suite (`backend.Tests`) covering query validation, limit/page bounds, result normalization, and provider resolution.

---

## 3. Search Provider Evaluation & Free Usage Disclosure

### Primary Provider: `ytmusicapi` (YouTube Music Catalog Engine)
- **Status**: **Primary Default Provider**
- **Repository**: [https://github.com/sigma67/ytmusicapi](https://github.com/sigma67/ytmusicapi)
- **Supported Query Categories**:
  - **Songs & Tracks** (`filter="songs"`)
  - **Artists** (`filter="artists"`)
  - **Albums** (`filter="albums"`)
  - **Playlists** (`filter="playlists"`)
  - **Recently Released Music** (`filter="new_releases"` via `ytmusic.get_explore()`)
  - **All Categories** (general catalog search)
- **Normalized Metadata Fields**:
  - Track Title
  - Artist Names
  - Album Name (when available in catalog)
  - Thumbnail URL (highest resolution available)
  - Duration string (`mm:ss`) and duration in seconds (when available)
  - YouTube video ID (when available)
  - Result type (`song`, `artist`, `album`, `playlist`, `video`)
  - Provider source (`ytmusicapi`)
  - Embeddable candidate flag (true only when a playable 11-character video ID is present)
- **Important Disclosure on Unofficial API**:
  `ytmusicapi` queries YouTube Music's internal public endpoints. **No Google Cloud API keys or paid subscriptions are used or required.** Because it relies on internal endpoints, it is subject to YouTube IP rate-limiting and changes to internal YouTube structures. Permanent uptime and unlimited requests cannot be guaranteed.

---

## 4. Local Installation & Run Instructions (Windows)

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended: run `python --version` to verify)
- **.NET 8.0 or .NET 10.0 SDK** (Installed: run `dotnet --version` to verify)
- **Node.js (v18+) & npm** (Installed: run `node -v` to verify)

---

### Step 1: Run the `ytmusicapi` Python Service
Open PowerShell in the project root:

```powershell
# Install Python dependencies (first time only)
pip install -r ytmusic_service/requirements.txt

# Start the ytmusicapi FastAPI microservice on port 5006
python ytmusic_service/main.py
```
*The service will start at `http://127.0.0.1:5006`. Verify with `http://127.0.0.1:5006/health`.*

---

### Step 2: Run the ASP.NET Core Backend
Open a second PowerShell terminal in the project root:

```powershell
# Navigate to backend directory and start the API on port 5005
dotnet run --project backend/backend.csproj --urls "http://localhost:5005"
```
*The backend API will start at `http://localhost:5005`. Verify with `http://localhost:5005/api/health`.*

---

### Step 3: Run the Vite Frontend
Open a third PowerShell terminal in the project root:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start the Vite development server
npm run dev
```
*The web application will open at `http://localhost:5173`.*

---

### Step 4: Run the Automated Tests
In the project root:

```powershell
# Run backend xUnit test suite
dotnet test backend.Tests

# Run Python normalizer and live tests
python ytmusic_service/test_service.py

# Type-check and build frontend
cd frontend
npm run build
```

---

## 5. Playback Separation & Terms Compliance

| Policy Area | Implementation Standard |
| :--- | :--- |
| **Search Metadata vs Audio Stream** | Search metadata is strictly catalog information, not an audio stream. Playback is entirely delegated to the official YouTube IFrame Player API. |
| **No Headless Audio / Scraping** | No direct audio stream extraction, downloading, or caching is performed. |
| **No Ad Bypassing** | Advertisements served by YouTube in the embedded player are not blocked, bypassed, or manipulated. |
| **Embedding Errors 101 & 150** | Major record labels frequently block third-party IFrame embedding. When YouTube raises Error 101 or 150, the UI renders a clear diagnostic banner with an external redirect link. |
| **Non-Video Search Items** | Artists, albums, and playlists lack individual 11-character video IDs. The UI marks these as "External Link" and provides direct links to view them on YouTube Music instead of attempting invalid embedded playback. |

---

## 6. Verified Test Checklist

- [x] **Primary Provider Resolution**: `GET /api/providers` lists `ytmusicapi` as the default recommended provider.
- [x] **Song Search**: Querying `"Daft Punk - Get Lucky"` returns normalized track title, artist names, album name (`Random Access Memories`), duration (`6:10`), thumbnail, and video ID (`4D7u5KF7SP8`).
- [x] **Artist Search**: Querying `"Taylor Swift"` with filter `artists` returns artist profile with browse ID and external link flag.
- [x] **Album Search**: Querying `"Random Access Memories"` with filter `albums` returns album metadata, release year, and track count.
- [x] **Playlist Search**: Querying `"Top Hits"` with filter `playlists` returns curated playlists with author and thumbnail.
- [x] **Recent Releases**: Clicking the `"New Releases"` filter queries `ytmusic.get_explore()['new_releases']` and returns current new albums and singles.
- [x] **Query Validation**: Entering `< 2` characters or `> 150` characters returns HTTP 400 Bad Request with immediate UI validation warning.
- [x] **Embed Error Handling**: Embed-restricted tracks trigger diagnostic status `Error 150 / 101` with one-click fallback link.
- [x] **Embedded Playback**: Embeddable tracks load into the YouTube IFrame player with volume, seek, play/pause controls.
- [x] **End-to-End Browser Verification**: Tested with headless browser subagent at `http://localhost:5173` covering search, category filters, and playback panel.
