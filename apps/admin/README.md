# OpenPress Admin

The newsroom dashboard: where stories are raised, reviewed and published, media and campaigns are managed, and (for Super Users) the public site is designed in **Page Studio** (the page builder) at `/build`.

- **Stack:** React 18, Vite 7, TypeScript and JavaScript, Tailwind CSS 3, React Router 6
- **Editors:** [Editor.js](https://editorjs.io) for story bodies, [Puck](https://puckeditor.com) for page layouts
- **Charts and scheduling:** Recharts, FullCalendar
- **UI kit:** a small in-house kit (`src/components/ui/dx`) of grids, card views, charts, pop-ups and form inputs. It replaced a commercial component suite, so no licence key is needed.

## Contents

- [What is in the app](#what-is-in-the-app)
- [Run it](#run-it)
- [Configuration](#configuration)
- [Project layout](#project-layout)
- [Page Studio at /build](#page-studio-at-build)
- [Publishing from the admin app](#publishing-from-the-admin-app)
- [Authentication and roles](#authentication-and-roles)
- [Build and deploy](#build-and-deploy)
- [Testing](#testing)
- [Known limits](#known-limits)

## What is in the app

| Route | Screen | Who |
| --- | --- | --- |
| `/login`, `/auth/forgot-password` | Sign in and password reset | everyone |
| `/dashboard` | Kanban board of stories: Ideas, In progress, In review, Ready to publish. **Raise A Story**, notifications, AI search | signed in |
| `/dashboard/review/:id` | Story review and the publish drawer (metadata, placement, social, media) | signed in |
| `/all_stories` | Table of every story with filters, columns, Excel and PDF export, **Publish All** | signed in |
| `/library` | Media library: upload, search, tag, edit, thumbnails | signed in |
| `/campaigns`, `/campaigns/detail` | Campaign manager: create, schedule, placements, performance, calendar | signed in |
| `/surveys`, `/survey/s/:id` | Survey builder, responses, AI summaries and chat | Admin, Editor, Super User |
| `/analytics` | Charts of publishing and audience activity | signed in |
| `/contact_inquiries` | Messages from the site's contact form | signed in |
| `/signals`, `/research`, `/queries` | Research and wire tools | signed in |
| `/settings` | Users, roles and permissions, taxonomies, authors, ad placements | Super User for users and roles |
| `/build` | **Page Studio**, the page builder (see below) | **Super User only** |

A slim strip above every page holds two buttons: **Page Studio** (Super Users, opens `/build`) and **ePaper**, which opens the published site in a new tab. Both are in `components/common/ToolbarLinks.jsx`.

## Run it

From the repository root:

```bash
npm install
npm run dev:infra            # Postgres and storage
npm run setup:local          # first time only
npm run dev                  # admin on :5173, API on :3001, site on :8080
```

To run only this app: `npm run dev -w apps/admin` (the API must already be running).

Sign in as `admin@openpress.local` / `admin12345` (the local Super User from `setup:local`).

## Configuration

Set values in `apps/admin/.env.local`. Vite exposes only variables that start with `VITE_`.

| Variable | Purpose | Default (local) |
| --- | --- | --- |
| `VITE_BACKEND_API` | API address | `http://localhost:3001` |
| `VITE_SITE_BASE_URL` | Public site address, used by the **ePaper** link and page rendering | `http://localhost:8080` |
| `VITE_CANONICAL_URL` | Canonical site origin written into published pages | `http://localhost:8080` |
| `VITE_DOMAIN` | Cookie domain for the sign-in token outside localhost | `localhost` |
| `VITE_SITE_NAME`, `VITE_TWITTER_HANDLE` | Names written into page metadata | `OpenPress`, `@shreyanshtri26` |
| `VITE_BASEPATH` | Base path if the app is served from a sub-path | empty |
| `VITE_AI_API` | Override for the AI endpoints. Empty uses the API's own `/ai` routes (Gemini). | empty |
| `VITE_GA_MEASUREMENT_ID`, `VITE_RUM_APP_MONITOR_ID` | Optional analytics for **published pages**. Empty means no tracking. | empty |
| `VITE_YOUPI_URL`, `VITE_YOUPI_PUBLIC_KEY` | Optional payment gateway configuration for the Support Us page. | empty |

These values are baked into the build, **including the renderer bundle** that the API uses to republish the site, so set them before building for an environment.

## Project layout

```
apps/admin/src/
├── App.jsx                 Routes, idle timeout (9 h), service worker
├── pages/                  One folder per route
│   └── build/              The page-builder route
├── components/
│   ├── KanbanBoard/        Dashboard board
│   ├── StoryEditor/        Story editor, headers, raise-a-story form
│   ├── common/DAM/         Media library and the publish drawer
│   ├── campaigns/  surveys/  settings/  dashboard/
│   ├── SideBar/            Sidebar and the layout wrapper with the top action strip
│   └── ui/dx/              The in-house UI kit (grid, card view, chart, inputs, ...)
├── context/                UserContext (session, role), KanbanContext, AuthGuard
├── helpers/                Publishing helpers and renderers used by story publish
├── utils/                  apiFetch (adds the token), env, cookies
├── styles/globals.css      Global styles and design tokens
├── puck/                   Older copy of builder blocks (to be removed, see Known limits)
└── generated/              Compiled CSS for published pages (do not edit)
```

Path aliases: `@` is `apps/admin/src`, and `@studio` / `@builder` is `apps/pagestudio/src`.

## Page Studio at /build

`/build` is a route inside this app. It imports the editor from `apps/pagestudio` through the `@builder` alias and loads it lazily, so it adds nothing to the normal dashboard load.

- Only a **Super User** can open it. Anyone else is redirected to the dashboard, and the **Page Studio** button is hidden for them.
- Choose what you are editing in the **Currently editing** menu: Home, Section, Blog (the article template), About, Privacy policy, Editorial standards, Contact, Authors, Error, and others. The URL records the choice (`/build?page=About`). Legacy experimental layouts such as `DesiFix` have been removed in favor of clean unified grids.
- **Masthead & Chrome Configuration:** The Atlantic navbar (`AtlanticNavbar` / `MastheadNavbar`) exposes full layout controls directly in the editor:
  - Announcement banner toggle (`showTopBanner`), custom text, and custom background/text colors.
  - Header action buttons: toggles for `showSignIn`, `showSupportUs`, and `showBecomeMember`.
  - Social media icons: master toggle `showSocialLinks` and individual network toggles (`showTwitter`, `showFacebook`, `showInstagram`, `showLinkedin`, `showYoutube`).
  - Radio boolean selections use strict normalization (`toBoolean`) to ensure immediate live preview rendering and reliable JSON persistence.
  - Changes to the masthead navbar and footer on the `Home` page automatically propagate across all section and flat pages.
- **ePaper Reader & Auth Modal:** The live newspaper reader features a floating auth modal with a light frosted glass backdrop (`bg-black/25 backdrop-blur-[6px]`), Google OAuth sign-in, and 1-click demo access connected to the `/epaper/auth/sync` API.
- Edits **autosave** as a draft. **Preview** and **Publish** open the rendered page in a new tab and write it to the public site.
- Navigation utilizes trimmed, transparent brand assets (`openpress-logo-full-nobg-trim.png` and `openpress-quill-nobg-trim.png`).
- The top bar links back to the dashboard and to the live newspaper.

The blocks, renderers and publish bundle are documented in [apps/pagestudio/README.md](../pagestudio/README.md).

## Publishing from the admin app

**A story.** Open a card from *Ready to publish*, open the details drawer and press **Publish**. The app:

1. checks that the story has a featured image,
2. loads the **Blog** page template and renders the story into it,
3. saves the HTML to `<section>/<slug>.html`,
4. marks the story published, and
5. starts a site-wide republish so the home page, sections and sitemaps update.

**A page.** Use `/build` and press **Publish**.

**Everything.** `/all_stories` has **Publish All**, and campaign changes trigger a republish of the affected pages.

## Authentication and roles

- Sign-in calls `POST /login`. The returned token is kept in a cookie and sent as `Authorization: Bearer ...` by `apiFetch`.
- `UserContext` exposes the user, the role and the permission matrix. `AuthGuard` redirects signed-out users to `/login`.
- Sessions end after nine hours without activity.
- The sidebar and screens respect the role's permission matrix. The API enforces role checks for user, role and survey management.

## Build and deploy

```bash
npm run build -w apps/admin
```

This runs three steps: compile the published-page CSS, build the app, and build the **renderer bundle** into `dist/publish-renderer.js`. Deploy `dist/` to a static host. The API downloads `/publish-renderer.js` from this site when it republishes.

`.github/workflows/deploy-web.yml` publishes `dist/` to the Cloudflare Pages project `openpress-publish` on every push to `main`. Every route must fall back to `index.html`; `public/_redirects` does that on Pages.

## Testing

```bash
npm test -w apps/admin     # 48 tests (Vitest, jsdom)
```

The tests cover the in-house UI kit (inputs, data grid, card view, charts, containers) and the calendar component.

## Known limits

- `src/puck` is an older partial copy of the builder blocks. It still backs a few legacy pages and should be removed in favour of `@builder`.
- The dashboard is being given the same Apple-style design foundations as the public site (see `styles/globals.css`). Some screens still use the older look.
- Puck logs a deprecation notice for drop zones in the browser console. It is harmless.
- Lint has existing errors, so the CI lint step is advisory.
