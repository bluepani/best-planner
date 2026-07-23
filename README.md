# BestPlanner

A React + Vite web app for building a day from custom movable time blocks.

**Live app:** [https://best-planner-app.vercel.app](https://best-planner-app.vercel.app)

**Repo:** [https://github.com/bluepani/best-planner](https://github.com/bluepani/best-planner)

## Setup

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Enable **Email + password** and **Google** under User & authentication / SSO.
3. Copy the publishable key into `.env.local`:

```bash
cp .env.example .env.local
# set VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

4. Add your local and production URLs in Clerk (e.g. `http://localhost:5173`, `https://best-planner-app.vercel.app`).

```bash
npm install
npm run dev
```

## Deploy

Set `VITE_CLERK_PUBLISHABLE_KEY` in the Vercel project environment variables, then deploy:

```bash
npx vercel --prod
```

## Features

- Sign up / sign in with Google or email + password (accounts stored in Clerk).
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
