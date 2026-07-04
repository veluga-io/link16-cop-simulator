# AirShield COP Simulator

AirShield COP Simulator is a lightweight, browser-based commander's common operational picture prototype for a Link-16-inspired air-defense scenario.

It was built for the D4D Deploy for Defense APAC Seoul hackathon as a practical MVP: synthetic tactical messages, public OSINT context, a live COP map, automated situation briefing, commander approval flow, and after-action review in one screen.

## What It Shows

- A real-time COP dashboard without a landing page
- Synthetic Link-16-like tactical feed and fused tracks
- DMZ escalation scenario with BLUE WATCH, ORANGE RESPONSE, and RED WAR lines
- Snapshot-based RED/BLUE fighter raid replay
- Automatic ROE approval when RED fighters cross the RED WAR line
- Commander approval popup for urgent recommendations
- Asset status, OSINT evidence, decision history, and AAR briefing
- Map marker scaling by zoom level for dense aircraft views

## Safety Boundary

This repository does not implement real Link-16.

It does not contain real military locations, real inventory, real weapon performance, real ROE, or live command-and-control interfaces. All tactical messages, force states, fighter raid streams, effects, and decision records are synthetic and advisory-only.

The UI uses public map/source metadata and synthetic scenario data to demonstrate a product concept, not to support real operations.

## Tech Stack

- React
- Vite
- TypeScript
- Leaflet
- Zustand
- Recharts
- Framer Motion
- Lucide React
- Turf.js

## Quick Start

```bash
pnpm install
pnpm run dev
```

Open the local URL printed by Vite.

To share on the same Wi-Fi:

```bash
pnpm run dev -- --host 0.0.0.0
```

Then open `http://<your-local-ip>:5173` from another device on the same network.

## Data Model

The fighter raid map replay uses `stream.snapshots[]` as the source of truth.

For each playback second:

- render only `snapshot.entities`
- render only `snapshot.assignments` as active engagement lines
- render `snapshot.effects` only for their `durationSec`
- do not accumulate old markers
- do not recalculate aircraft movement in the frontend
- use `entity.lat`, `entity.lng`, and `entity.altitudeFt` directly

The included MIXED_50 stream contains:

- 100 synthetic RED fighters
- 50 synthetic BLUE response fighters
- 27 replay snapshots
- assignment lines and temporary kill effects

## Mock Data Export

```bash
pnpm run export:mock-data
```

Generated files are written to:

```text
data/export/
```

Useful files:

- `link16-cop-simulation.v2.mock.json`
- `simulation-presets.mock.json`
- `simulation-index.mock.json`
- `osint-sources.mock.json`

## Project Scripts

```bash
pnpm run dev
pnpm run build
pnpm run preview
pnpm run export:mock-data
pnpm run verify:data-contract
```

## OSINT Direction

The MVP is OSINT-first, but intentionally avoids live API dependency during the demo.

Recommended next step is to integrate OpenSky Network as a cached or snapshot-based civilian/neutral air traffic layer. That layer should remain visually and semantically separate from synthetic tactical tracks.

## AIP Positioning

This is not a Palantir AIP replacement.

The intended position is a lightweight pre-AIP concept validation workbench: a way to test commander's COP UX, decision timing, OSINT context, and AAR training flow before connecting sensitive enterprise data or operational workflows.

## Repository Scope

This repository is the standalone frontend MVP under `prototype/link16-cop-simulator`.

It is intentionally scoped to the browser simulator and synthetic data needed to run the demo.
