# Next.js Study Platform

Local development study app (Next.js) with five courses and a reusable course layout.

Setup

1. Install dependencies:

```bash
cd "$(pwd)"
npm install
```

2. Run development server:

```bash
npm run dev
```

App routes

- `/` – landing page with five course cards
- `/design-patterns` – full Design Patterns viewer (integrates provided component)
- `/srs` – SRS course (empty topics, ready to fill)
- `/dbms` – DBMS course (empty topics)
- `/os` – OS course (empty topics)
- `/business` – Business course (empty topics)
- `/code-smells` – bonus route that shows the provided Code Smells component

Notes

- The Design Patterns and Code Smells components were provided and wired into the app under `components/` and their routes.
- Topic data files are under `data/`. For courses without content the arrays are empty so you can fill them later.
# sem4
# sem4
