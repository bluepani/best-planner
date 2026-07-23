# Block Day Planner

A local React + Vite web app for building a day from custom movable time blocks.

## Setup

```bash
npm install
npm run dev
```

Open the localhost URL shown in the terminal.

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
