# MediaDownloadPro

A local web app to analyze and download videos from online platforms (YouTube, etc.) using yt-dlp.

This README gives a deep, practical overview of the project, how it works end-to-end, key files, common problems and fixes, development setup and recommended next steps.

---

## High-level purpose

MediaDownloadPro provides a simple UI to paste a video URL, inspect available formats/qualities, start a background download on the server (using `yt-dlp`), track download progress in the UI, and finally download the saved file to the user's machine. It keeps a history of downloads and supports clearing and removing items.

The app is split into two parts:

- `client/` — React + Vite frontend (TypeScript, Tailwind, React Query)
- `server/` — Node/Express backend that orchestrates yt-dlp, stores metadata in memory or DB, and serves files

---

## Architecture and flow

1. User pastes a URL in the front-end (`client/src/components/download-form.tsx`) and clicks "Analyze".
2. Frontend calls the analyze endpoint (`POST /api/analyze`) on the server. Server runs yt-dlp `--dump-json` or similar to extract metadata and returns available formats and metadata to the client.
3. User selects quality/type (video/audio) and clicks download. Frontend sends a request to start a background download (`POST /api/download`).
4. Server stores a download record (in memory or DB) with status `pending` and `progress: 0`. It spawns `yt-dlp` as a child process and pipes output to the server.
5. Server parses yt-dlp stdout (using `--newline` flag) to extract progress percentages and updates the storage record via `updateDownloadProgress(downloadId, progress)`.
6. Frontend periodically polls or uses React Query to refetch the download record (`GET /api/download/:id`) while status is `pending`, updating the progress bar from 0 to 100.
7. When `yt-dlp` finishes, server saves the file to `./downloads/`, updates `status` to `completed` and stores the filename in the record as `downloadUrl`.
8. The UI shows the completed state and a Download button that calls the streaming endpoint (`GET /api/download/file/:filename`) which streams the file and lets the browser's download manager save it locally.

---

## Key files and responsibilities

- `client/`
  - `src/components/download-form.tsx` — URL input and analyze button.
  - `src/components/video-preview.tsx` — Shows available qualities, start download button, and triggers `POST /api/download`.
  - `src/components/download-progress.tsx` — Shows progress bar for an active download, polls `GET /api/download/:id`, and exposes "Download File" button when `status === 'completed'`.
  - `src/components/download-history.tsx` — Shows recent downloads and allows removing single items or clearing history.
  - `src/lib/*` and `src/hooks/*` — utilities and hooks (React Query client, theme, toasts).

- `server/`
  - `routes.ts` — Registers Express routes: analyze, start-download, get-download, downloads listing, delete single/bulk, stream file endpoint.
  - `storage.ts` — In-memory (or DB) storage abstraction that provides `createDownload`, `updateDownloadProgress`, `updateDownloadStatus`, `deleteDownload`, `clearAllDownloads`, etc.
  - `vite.ts` (dev-only) and `index.ts` — server setup and bootstrapping.
  - `downloads/` — directory where completed files are stored.

- `shared/schema.ts` — shared DB schema definitions (if using Postgres/Drizzle). Ensure `downloads` table includes a `progress` integer column.

---

## Important implementation notes & gotchas

1. 16-byte file issue (most common):
    - Symptom: client triggers a download but the saved file is tiny (~16 bytes) and not playable.
    - Cause: the client is fetching `POST /api/download` and treating the JSON response (e.g. `{ downloadId: 1 }`) as a file blob, or the server returns JSON instead of streaming the file.
    - Fix: Start downloads as background jobs (server-side) and only stream the real file via `GET /api/download/file/:filename`. On the client, don't fetch the POST response as a blob. Use an anchor (`<a href="/api/download/file/...">`) to let the browser stream and save the file.

2. Progress stuck at 0:
    - Symptom: progress UI remains 0% until finished.
    - Cause: server not parsing `yt-dlp` stdout correctly or not updating storage with progress. Another cause is the client not polling frequently or not reading the `progress` field.
    - Fixes:
      - Launch `yt-dlp` with `--newline` to get one progress line per stdout `data` event.
      - Parse stdout for lines like `[download]  45.3%` and extract the percentage.
      - Call `storage.updateDownloadProgress(id, parsedProgress)` frequently.
      - Ensure `storage.createDownload` initializes `progress: 0` and `updateDownloadProgress` clamps 0-100.
      - On the client, use React Query to refetch `GET /api/download/:id` while `status === 'pending'`.

3. UI lag during download
    - Cause: client pulls the whole file into memory via fetch + blob before triggering browser download.
    - Fix: Use the streaming endpoint and let Chrome handle the download (anchor element with href to `/api/download/file/:filename`). This avoids loading the file into JS memory and prevents UI freezing.

4. 404 when clicking download button
    - Symptom: clicking the download button opens a new tab and returns 404.
    - Cause: wrong `downloadUrl` value stored (maybe path vs filename), or the streaming route not implemented.
    - Fix: Ensure `download.downloadUrl` stores only the saved filename, and the streaming route `GET /api/download/file/:filename` maps that filename to `./downloads/<filename>` and streams it.

---

## Development setup (quick)

Prerequisites
- Node 18+ (or the version used by the project)
- `yt-dlp` installed and available in PATH

Install packages

```bash
cd /path/to/MediaDownloadPro
npm install
cd client
npm install
```

Run locally

```bash
# start server (from project root)
npm run dev:server

# start client (from client/)
npm run dev
```

Open http://localhost:5173/ (or the port shown by Vite) and the server is likely on http://localhost:3000/.

---

## API reference (main endpoints)

- POST /api/analyze
  - Body: { url }
  - Returns: video metadata and available formats

- POST /api/download
  - Body: { url, title, quality, platform, ... }
  - Returns: { downloadId }
  - Starts the server-side download in background and returns immediately.

- GET /api/download/:id
  - Returns the download record including { id, status, progress, downloadUrl }

- GET /api/downloads/recent
  - Returns the recent downloads list

- GET /api/download/file/:filename
  - Streams the saved file from the server's `downloads/` directory. Browser will save via native download manager.

- DELETE /api/downloads/:id
  - Deletes a single download record (and optionally the saved file)

- DELETE /api/downloads
  - Clears all download records

---

## Troubleshooting checklist (quick)

- 16-byte downloads: check client isn't `fetch()`ing POST and reading JSON as blob. Use streaming GET instead.
- Progress stuck at 0: add `--newline` to yt-dlp spawn flags and log stdout to verify progress lines are emitted. Ensure storage.updateDownloadProgress is called.
- File missing/404: inspect `storage.updateDownloadStatus` — `downloadUrl` must be the actual filename, and the file must be present in `downloads/`.
- UI lag: avoid fetching the whole file into JS; stream via server endpoint and use an anchor to trigger Chrome's download.

---

## Recommended next steps / PRs

1. Add/verify `GET /api/download/file/:filename` streaming route (server/routes.ts). Use fs.createReadStream and set Content-Length + Content-Disposition.
2. Ensure `server/downloadVideo` spawns yt-dlp with `--newline` and parses `[download]  42.7%` lines to call `storage.updateDownloadProgress`.
3. Update `client/src/components/download-progress.tsx` to poll `GET /api/download/:id` while `status === 'pending'` and update progress from the returned `progress` field.
4. Replace any client-side code that `fetch()`es the POST download response and instead call the streaming GET once `downloadUrl` is available.

---

## Where to look in the code

- Server
  - `server/routes.ts` — Register routes and download orchestration
  - `server/storage.ts` — Storage implementation and progress methods
  - `server/index.ts` — startup

- Client
  - `client/src/components/download-form.tsx` — input & analyze
  - `client/src/components/video-preview.tsx` — start download
  - `client/src/components/download-progress.tsx` — progress bar and final download button
  - `client/src/components/download-history.tsx` — history UI

---

## Contact / Help

If you want, I can create PRs with the exact fixes (server streaming endpoint, storage progress methods, client download handler changes) and run a quick smoke test here. Tell me which parts you want me to patch and I will produce diffs.

---

Thank you — this README should give you the deeper understanding you asked for. If you'd like, I can also generate a short `DEVELOPMENT.md` with step-by-step debugging commands and example logs for `yt-dlp` output parsing.
