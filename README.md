# Block Day Planner

A React + Vite web app for building a day from custom movable time blocks.

**Live app:** [https://colo-two.vercel.app](https://colo-two.vercel.app)

**Repo:** [https://github.com/bluepani/block-day-planner](https://github.com/bluepani/block-day-planner)

## Setup

```bash
npm install
npm run dev
```

Open the localhost URL shown in the terminal.

## Deploy

Production is hosted on Vercel. After the GitHub repo is connected in the Vercel project settings, pushes to `main` trigger a cloud build and production deploy.

Manual production deploy from this folder:

```bash
npx vercel --prod
```

## Features

- Set a wake-up/start time and sleep/end time.
- Add blocks from the Create Block popup with separate hours and minutes fields.
- Edit block duration, category, notes, and lock status inline after the block is added.
- Colors are assigned automatically by type: Study blue, Break grey, Food green, Fun amber, Other grey, and Custom purple.
- Use Edit Type to rename types, add/delete types, and set type colors.
- Drag and drop unlocked blocks to reorder the day.
- Move blocks up/down, duplicate blocks, delete blocks, and edit blocks inline.
- Recalculate every block's start and end time automatically from the current order.
- Highlight blocks that run past the sleep/end time.
- Save blocks and day settings in localStorage.
- Load an example day.
