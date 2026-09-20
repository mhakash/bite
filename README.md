# 🍊 Bite — daily nutrition tracker

A fast, local-first calorie and macro tracker built with React + Vite. No accounts, no backend — everything is stored in the browser.

## Features

- **Daily logging** — log foods into Breakfast, Lunch, Dinner, and Snacks, with a running calorie ring and protein/carbs/fat progress bars against your goals.
- **Food library** — build up a personal library of foods with per-portion gram weights and full macro/micronutrient breakdowns.
- **Custom amounts & quantities** — log by a saved portion, a quantity multiplier, or a custom gram amount.
- **JSON food import** — paste or import structured JSON to add foods in bulk (see the in-app prompt helper).
- **Water tracking** and a **weekly trend** chart of calories/macros over time.
- **Backup & transfer** — export/import a single day's log or your whole food library as JSON files.
- **Goals & settings** — set calorie, protein, carb, fat, and water goals.

## Getting started

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Tech stack

- [React](https://react.dev/) 19 + [Vite](https://vite.dev/)
- [Framer Motion](https://www.framer.com/motion/) for sheet/transition animations
- [Recharts](https://recharts.org/) for the weekly trend chart
- Plain CSS per component, no CSS framework

## Project structure

```
src/
  components/   UI components (sheets, cards, shared IconButton, etc.)
  context/      App-wide state (AppContext): foods, entries, goals, day
  data/         Nutrient definitions and seed foods
  utils/        Date helpers, nutrition math, JSON import/export
```

Data persists to `localStorage` — there is no server component.
