# OpenPress API

The backend for OpenPress: authentication, the editorial workflow, the media library, campaigns, surveys and static-site publishing. It is a plain Node (ESM) service with no web framework. Each route is a small `handler(event)` function behind one router.

- **Runtime:** Node 24 or newer
- **Data:** Postgres through [Drizzle ORM](https://orm.drizzle.team) and `postgres.js`
- **Files:** any S3-compatible object store, set with the `STORAGE_*` variables
- **Auth:** signed JWTs (`jsonwebtoken`) and `bcryptjs` password hashes
- **Hosting target:** Neon Functions (`neon.ts`), or any Node host

## Contents

- [How it is built](#how-it-is-built)
- [Project layout](#project-layout)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Data model](#data-model)
- [Authentication and access](#authentication-and-access)
- [Publishing pipeline](#publishing-pipeline)
- [Optional features](#optional-features)
- [API reference](#api-reference)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## How it is built

```
Request ──► src/server.mjs ──► index.mjs ──► routes/<domain>/<handler>.mjs ──► Postgres / object storage
            Fetch to event      CORS, JWT,     one function per endpoint
            adapter             RBAC, router
```

1. **`src/server.mjs`** exports a default `{ fetch }` (the shape Neon Functions expects). It converts a standard `Request` into the plain `event` object the handlers use (headers, body, base64 for binary uploads) and converts the handler's result back into a `Response`. The raw request body is preserved byte-for-byte.
2. **`index.mjs`** is the router. It answers CORS preflights, verifies the JWT for every route that is not public, applies role checks, and dispatches on `method + path` to a handler. Routes for a disabled optional feature answer `503` here.
3. **`routes/*`** hold the handlers, grouped by domain. A handler receives `event` and returns `{ statusCode, headers, body }`.
4. **`db/`** holds the Drizzle schema, the client and the *document store*, a key-value layer over one JSONB table.
5. **`lib/storage.mjs`** builds the S3 client from environment variables and turns object keys into public URLs.

Because handlers are plain functions, they are easy to call directly in tests.

## Project layout

```
apps/api/
├── index.mjs               Router, CORS, JWT and role checks
├── src/
│   ├── server.mjs          Request/Response adapter (the deployable entry)
│   ├── dev.mjs             Local dev server (API on :3001 and the site on :8080)
│   └── site-dev.mjs        Serves the website bucket from its own root, like production
├── routes/                 Handlers, one folder per domain
│   ├── users/  roles/  story/  articles/  taxonomy/  dam/  campaigns/
│   ├── placements/  surveys/  contact/  pagestudio/  analysis/  ai/
│   └── middleware/  utils/  utility/  test/
├── db/
│   ├── schema.mjs          Drizzle tables
│   ├── client.mjs          postgres.js client
│   ├── doc-store.mjs       Document store over Postgres
│   └── doc-tables.mjs   Which legacy table names map to the document store
├── lib/
│   ├── storage.mjs         S3-compatible client and URL helpers
│   └── features.mjs        Optional-feature switches
├── drizzle/                Generated SQL migrations
├── scripts/
│   ├── local-setup.mjs     One-time local setup
│   ├── seed/               Sample data (users, taxonomies, assets, stories, pages, site assets)
│   ├── smoke.mjs           Smoke test for a running API
│   └── extract-routes.mjs  Regenerates contract/routes.json
├── contract/routes.json    The frozen route list and access rules
├── tests/                  Node test runner suites
└── neon.ts                 Neon Functions deployment config
```

## Run it locally

From the repository root:

```bash
npm install
npm run dev:infra                       # Postgres + S3-compatible store in Docker
cp apps/api/.env.example apps/api/.env.local
npm run setup:local                     # schema, buckets, roles, first Super User
npm run seed -w apps/api                # optional sample content
npm run build -w apps/pagestudio        # renderer bundle used for site-wide publishing
npm run dev                             # API + admin (+ local public site)
```

To run only the API: `npm run dev -w apps/api`. It prints `OpenPress API listening on http://localhost:3001` and, when storage is configured, `OpenPress site listening on http://localhost:8080`.

`npm run setup:local` runs `drizzle-kit push` for the schema, creates the four buckets, inserts the four roles and creates the first Super User from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (defaults `admin@openpress.local` / `admin12345`, **local use only**). It is safe to run again.

## Configuration

Copy `.env.example` to `.env.local`. The dev server loads `.env.local` automatically.

### Core

| Variable | Purpose |
| --- | --- |
| `PORT` | API port, default `3001` |
| `SITE_PORT` | Local public-site port, default `8080` |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs and verifies sign-in tokens. **Set a long random value outside local development.** |
| `CRON_SECRET` | Shared secret for the scheduled-publish endpoint |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS (admin and public site) |
| `PUBLISH_RENDERER_FILE` | Local path to `publish-renderer.js`. When unset, the renderer is downloaded from an allowed https origin. |

### Storage

| Variable | Purpose |
| --- | --- |
| `STORAGE_ENDPOINT_URL` | S3 endpoint. Set for Neon Object Storage or the local MinIO/RustFS container |
| `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Storage credentials |
| `STORAGE_REGION` | Region (default `ap-southeast-1`) |
| `PUBLIC_STORAGE_URL` | Base URL under which public buckets are readable (`<base>/<bucket>/<key>`) |
| `DAM_BUCKET_NAME` | Uploaded media bucket (default `openpress-dam`) |
| `WEBSITE_BUCKET_NAME` | The published website bucket (HTML, sitemaps, logos, PWA files; default `openpress-website`) |
| `ANALYSIS_BUCKET_NAME` | Bucket for optional image analysis |

### Site addresses

| Variable | Purpose |
| --- | --- |
| `FRONTEND_URL` | Admin app origin (default `http://localhost:5173`) |
| `FRONTEND_WEBSITE_URL` | Public site origin used for canonical links and story URLs |
| `SITE_URL` | Public site origin used in responses of page-save endpoints |

### Seeding

| Variable | Purpose |
| --- | --- |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First Super User created by `setup:local` (defaults: `admin@openpress.local` / `admin12345`) |

### Optional features

See [Optional features](#optional-features) below for AI (`GEMINI_API_KEY`), Search (`BRAVE_API_KEY`), Email (`EMAIL_SENDER`), and Transcode keys. All optional features are off by default.

## Data model

Postgres holds all data in two forms.

**Typed tables** (`db/schema.mjs`)

| Table | Holds |
| --- | --- |
| `users` | Staff accounts: email, name, role, status, hashed password, profile |
| `roles` | Role name and its permission matrix (JSONB) |
| `taxonomies` | Section, Category, Editor, Reporter, Tags, Story Type, Region and their values |
| `stories` | The editorial workflow: title, status, assignee, author, body, slug, publish URL, comments, extra fields (JSONB) |
| `articles` | Long-form articles and their review state |
| `pages` | Page Studio pages by `page_type` (`Home`, `Section-News`, `Blog`, `About`, ...) with the Puck JSON in `data` |
| `assets` | Media library records and metadata |

**Document store** (`db/doc-store.mjs`): a single `documents` table (table name, key, JSONB item) with an implementation of the document commands (`Put`, `Get`, `Update`, `Delete`, `Scan`, `Query`, condition and update expressions, paging). Campaigns, placements, audience records, contact inquiries, search history and surveys use it, which kept those handlers unchanged during the move to Postgres.

> The store filters in JavaScript after reading a table. That is fine for newsroom-sized tables. If one grows large, move it to a typed table.

Migrations live in `drizzle/`. After changing the schema run `npm run db:generate -w apps/api` and commit the new SQL file. `npm run db:push` applies the schema directly (used by local setup).

## Authentication and access

- `POST /login` checks the password and returns a JWT containing the user's id, email and role. Send it as `Authorization: Bearer <token>`.
- Every route needs a valid token except the **public** routes in the [reference](#api-reference) (login, password reset, the published-story feed, contact form, campaign tracking and public survey pages).
- Roles are `Super User`, `Admin`, `Editor` and `Reporter`. The router enforces:
  - user and role management (`addUser`, `editUser`, `deleteUser`, `deleteAuthor`, `addRole`, `updateRole`, `deleteRole`): **Super User** only
  - survey management: **Admin, Editor or Super User**
  - everything else: any signed-in user. Fine-grained module permissions are stored on the role and enforced by the admin app.
- Passwords are hashed with bcrypt. Password reset creates a hashed token that is valid for 30 minutes and emails the link, so it needs the **Email** feature (`EMAIL_SENDER`).

The Page Studio routes (`/pagestudio/*`) currently accept any signed-in user. Restricting the studio's own actions to Super Users on the server is planned.

## Publishing pipeline

Page content is rendered by the Page Studio code (`apps/pagestudio`), then written to the website bucket by the API.

| Step | Endpoint | Result |
| --- | --- | --- |
| Save a story page | `POST /pagestudio/saveHtml` | `<section>/<slug>.html` in the website bucket |
| Save a page | `POST /pagestudio/saveHomeHtml`, `saveSectionHtml`, `saveAboutHtml`, ... | `home.html`, `<section>/index.html`, `about/index.html`, ... |
| Sitemaps and PWA files | `saveSiteMap`, `saveNewsSiteMap`, `savePwaFiles` | `sitemap.xml`, `news-sitemap.xml`, `manifest.json`, `sw.js` |
| Site-wide republish | `POST /pagestudio/republishAll` (then poll `GET /pagestudio/republishAll/status`) | Every published page rebuilt |

**The republish worker** (`routes/pagestudio/republishAllWorker.mjs`) loads `publish-renderer.js` (built from `apps/pagestudio` by `npm run build -w apps/pagestudio`), then re-renders each page that carries a `publishedSnapshot`, every section, the stories and the sitemaps. The bundle is read from `PUBLISH_RENDERER_FILE` locally and downloaded from an allowed https origin when deployed.

Section and story folders use one slug rule, so `Arts & Culture` is `arts-culture` everywhere. A section page shares its folder with the stories in it.

## Optional features

Services that cost money are **off** unless configured. When off, their routes answer `503` with `{ "disabled": true }`, and handlers that use them as a side step simply skip them.

| Feature | Turn on with | Used for |
| --- | --- | --- |
| Image and video analysis | `ENABLE_IMAGE_ANALYSIS=true` | AI tags and face search |
| Video transcoding | `TRANSCODE_ENDPOINT` and `TRANSCODE_ROLE_ARN` | Quality variants and thumbnails |
| Support payments (YouPI PG) | `YOUPI_WEBHOOK_SECRET`, `DOC_SUPPORTERS_TABLE` | `POST /youpi/webhook` verifies the gateway's HMAC signature and stores confirmed support payments |
| AI features (Gemini) | `GEMINI_API_KEY`, optional `GEMINI_MODEL` (default `gemini-2.5-flash`) | Story editor tools, DAM semantic search, image captions, survey summaries and chat |
| Email | `EMAIL_SENDER` | Contact-form mail and survey invitations |
| Web search | `BRAVE_API_KEY` and/or `GEMINI_API_KEY` | Research page. Brave first when its key is set, Gemini (Google Search grounding) otherwise or when Brave errors |

No third-party tracking is added to published pages unless `VITE_GA_MEASUREMENT_ID` or `VITE_RUM_APP_MONITOR_ID` is set at build time.

## API reference

171 routes, generated from `contract/routes.json`. **Access** is `Public` (no token), `Signed in` (any valid token), `Admin / Editor / Super User` or `Super User`.

#### Authentication and users

| Method | Path | Access |
| --- | --- | --- |
| POST | `/login` | Public |
| GET | `/api/getAllUsers` | Signed in |
| POST | `/addUser` | Super User |
| GET | `/getAllUsers` | Signed in |
| GET | `/getAuthors` | Signed in |
| DELETE | `/deleteUser` | Super User |
| DELETE | `/deleteAuthor` | Super User |
| PUT | `/editUser` | Super User |
| POST | `/forgotPassword` | Public |
| POST | `/resetPassword` | Public |
| POST | `/uploadUserImage` | Signed in |
| PUT | `/updateProfile` | Signed in |
| DELETE | `/deleteAccount` | Signed in |
| DELETE | `/api/pagestudio/deleteAccount` | Signed in |
| GET | `/api/audience/profile` | Signed in |
| GET | `/api/audience/users` | Signed in |

#### Roles

| Method | Path | Access |
| --- | --- | --- |
| POST | `/addRole` | Super User |
| GET | `/getAllRoles` | Signed in |
| DELETE | `/deleteRole` | Super User |
| PUT | `/updateRole` | Super User |
| GET | `/roles/list` | Signed in |
| GET | `/getRole` | Signed in |

#### Stories and drafts

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/story/postCommentAction` | Signed in |
| PUT | `/api/updateStory` | Signed in |
| DELETE | `/api/draft` | Signed in |
| DELETE | `/api/deleteStory` | Signed in |
| DELETE | `/api/deleteStoryPermanent` | Signed in |
| PUT | `/api/editComment` | Signed in |
| GET | `/api/fetchDrafts` | Signed in |
| POST | `/api/postComments` | Signed in |
| POST | `/api/articles/postStory` | Signed in |
| POST | `/api/saveDraft` | Signed in |
| PUT | `/api/updateDraft` | Signed in |
| GET | `/story/fetchStories` | Signed in |
| GET | `/api/storyById` | Signed in |
| GET | `/api/fetchStory` | Signed in |
| GET | `/story/fetchStoryById` | Signed in |
| GET | `/story/fetchReadyToPublish` | Public |
| PUT | `/api/stories/:id` | Signed in |

#### Articles

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/article/create` | Signed in |
| GET | `/api/news` | Signed in |
| POST | `/api/articles/edit` | Signed in |
| POST | `/api/articles/update` | Signed in |
| POST | `/api/articles/getById` | Signed in |
| POST | `/api/articles/get` | Signed in |
| POST | `/api/articles/getRemarks` | Signed in |
| GET | `/api/articles/getArticlesByEditor` | Signed in |
| GET | `/api/articles` | Signed in |
| GET | `/api/journalist/articles` | Signed in |
| POST | `/api/articles/reviewArticle` | Signed in |
| POST | `/api/articles/updateArticleStatus` | Signed in |

#### Taxonomy

| Method | Path | Access |
| --- | --- | --- |
| POST | `/taxonomy` | Signed in |
| GET | `/taxonomies` | Signed in |
| GET | `/api/taxonomies` | Signed in |
| POST | `/taxonomy/addValue` | Signed in |
| DELETE | `/taxonomy/value` | Signed in |
| DELETE | `/taxonomy` | Signed in |
| PUT | `/taxonomy/name` | Signed in |
| PUT | `/taxonomy/updateValue` | Signed in |
| PUT | `/taxonomy/permissions` | Signed in |
| GET | `/taxonomy/section/values` | Signed in |

#### Page Studio and publishing
Page Studio endpoints use `/pagestudio/*`.

| Method | Path | Access |
| --- | --- | --- |
| PUT | `/pagestudio/autosave` | Signed in |
| GET | `/pagestudio/page` | Signed in |
| POST | `/pagestudio/saveHtml` | Signed in |
| POST | `/pagestudio/saveHomeHtml` | Signed in |
| POST | `/pagestudio/saveErrorHtml` | Signed in |
| POST | `/pagestudio/saveAboutHtml` | Signed in |
| POST | `/pagestudio/savePrivacyPolicyHtml` | Signed in |
| POST | `/pagestudio/saveMediaCouncilHtml` | Signed in |
| POST | `/pagestudio/saveContactUsHtml` | Signed in |
| POST | `/pagestudio/saveSectionHtml` | Signed in |
| POST | `/pagestudio/saveAuthorsHtml` | Signed in |
| POST | `/pagestudio/saveAuthorHtml` | Signed in |
| POST | `/pagestudio/saveSurveyHtml` | Signed in |
| POST | `/pagestudio/saveSiteMap` | Signed in |
| POST | `/pagestudio/saveNewsSiteMap` | Signed in |
| POST | `/pagestudio/savePwaFiles` | Signed in |
| GET | `/pagestudio/forceUpdatePwaIcons` | Public |
| POST | `/pagestudio/republishAll` | Signed in |
| GET | `/pagestudio/republishAll/status` | Signed in |

#### Media library

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/uploadAsset` | Signed in |
| POST | `/api/assets/create` | Signed in |
| GET | `/api/fetchAsset` | Signed in |
| DELETE | `/api/assets/delete` | Signed in |
| PUT | `/api/assets/update` | Signed in |
| POST | `/api/generateThumbnail` | Signed in |
| POST | `/api/uploadCustomThumbnail` | Signed in |
| POST | `/api/confirmCustomThumbnail` | Signed in |
| POST | `/api/selectThumbnail` | Signed in |
| POST | `/api/debug/listStorageObjects` | Signed in |
| POST | `/api/generateSingleThumbnail` | Signed in |
| POST | `/api/extractMetadata` | Signed in |
| GET | `/api/asset/status` | Signed in |
| GET | `/api/assets/videos` | Signed in |
| GET | `/api/check-ffprobe` | Signed in |
| GET | `/api/getQualityVariants` | Signed in |
| GET | `/api/asset/:id/status` | Signed in |

#### Campaigns and placements

| Method | Path | Access |
| --- | --- | --- |
| POST | `/uploadCampaignAdImage` | Signed in |
| POST | `/createCampaign` | Signed in |
| DELETE | `/deleteCampaign` | Signed in |
| GET | `/getCampaigns` | Signed in |
| POST | `/campaigns/checkAvailability` | Signed in |
| POST | `/publishCampaign` | Signed in |
| PUT | `/updateCampaign` | Signed in |
| POST | `/campaigns/trackEvent` | Public |
| GET | `/placements` | Signed in |
| POST | `/placement` | Signed in |
| PUT | `/placement` | Signed in |
| DELETE | `/placement` | Signed in |

#### Surveys

| Method | Path | Access |
| --- | --- | --- |
| GET | `/surveys` | Admin / Editor / Super User |
| POST | `/surveys` | Admin / Editor / Super User |
| PUT | `/surveys` | Admin / Editor / Super User |
| DELETE | `/surveys` | Admin / Editor / Super User |
| POST | `/surveys/invite` | Admin / Editor / Super User |
| GET | `/surveys/public/` | Public |
| GET | `/surveys/:id/responses` | Admin / Editor / Super User |
| POST | `/surveys/:id/responses` | Public |
| POST | `/surveys/:id/ai-summary` | Admin / Editor / Super User |
| GET | `/surveys/:id/chat` | Admin / Editor / Super User |
| POST | `/surveys/:id/chat` | Admin / Editor / Super User |
| POST | `/surveys/:id/chat/assets` | Admin / Editor / Super User |
| DELETE | `/surveys/:id/chat/assets` | Admin / Editor / Super User |

#### Contact

| Method | Path | Access |
| --- | --- | --- |
| POST | `/contact/submit` | Public |
| GET | `/contact/inquiries` | Signed in |

#### Optional paid features (return 503 unless configured)

| Method | Path | Access |
| --- | --- | --- |
| any | `/story/syncStories` | Signed in |
| POST | `/api/transcodingTrigger` | Signed in |
| POST | `/api/transcodingProcessor` | Signed in |
| POST | `/api/getTranscodeEndpoint` | Signed in |
| POST | `/api/analysis/getVideoAnalysis` | Signed in |
| POST | `/api/analysis/createFaceCollection` | Signed in |
| POST | `/api/analysis/addFaceToCollection` | Signed in |
| POST | `/api/analysis/searchFaceByImage` | Signed in |
| POST | `/api/analysis/listFaceCollections` | Signed in |
| GET | `/api/utils/search` | Signed in |
| GET | `/api/utils/search/history` | Signed in |
| DELETE | `/api/utils/search/history` | Signed in |

#### ePaper reader authentication

| Method | Path | Access |
| --- | --- | --- |
| POST | `/epaper/auth/sync` | Public |
| POST | `/api/epaper/auth/sync` | Public |
| GET | `/epaper/auth/me` | Public |
| GET | `/api/epaper/auth/me` | Public |
| POST | `/epaper/auth/logout` | Public |
| POST | `/api/epaper/auth/logout` | Public |

#### Utilities

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/proxy` | Signed in |

## Scripts

Run from the repository root with `-w apps/api`, or from `apps/api` directly.

| Script | Purpose |
| --- | --- |
| `dev` | Start the API (and the local public site) |
| `setup` | One-time local setup: schema, buckets, roles, first Super User |
| `check`, `test` | Syntax check of the router and server entries |
| `smoke` | Smoke-test a running API: `API_URL=https://... npm run smoke` |
| `routes:extract` | Regenerate `contract/routes.json` after adding a route on purpose |
| `db:generate`, `db:push` | Create or apply schema migrations |
| `seed` | All sample data, in order: users, taxonomies, assets, stories, pages, site assets |
| `seed:users`, `seed:taxonomies`, `seed:assets`, `seed:stories`, `seed:pages`, `seed:site-assets` | Individual seeds. They are idempotent. |

What the seeds create: 6 sample staff users, the 7 taxonomies, 8 media assets, 10 published stories, 17 page layouts (Home, 9 sections, Blog, About, Privacy, Editorial standards, Contact, Authors, Error) and the logos and icons in the website bucket.

## Syntax check

```bash
npm test -w apps/api      # Syntax check of index.mjs and server.mjs
```

## Deployment

The API deploys to **Neon Functions**.

```bash
# .env.deploy is git-ignored and holds the keys listed in neon.ts
npx neon link --project-id <id>
npx neon checkout <branch>
npx neon deploy --env .env.deploy
API_URL=https://<function-url> npm run smoke -w apps/api
```

`.github/workflows/deploy-api.yml` does the same on every push to `main`: it applies new database migrations (`npm run db:migrate`), deploys, then runs the smoke test. Only the keys that are set are uploaded, so optional features stay off.

> The deploy pipeline has been written and validated locally but not yet run against a live Neon project.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `401 Unauthorized request` | Missing or expired token. Sign in again. |
| Site-wide publish fails with "No https origin available to load the renderer bundle" | Set `PUBLISH_RENDERER_FILE=../pagestudio/dist/publish-renderer.js` locally and run `npm run build -w apps/pagestudio`. |
| Publishing a story does nothing | The story has no featured image. The admin app refuses to publish without one. |
| A route answers `503` with `disabled: true` | The optional feature is not configured. See [Optional features](#optional-features). |
| `/api/check-ffprobe` fails locally | Video features need `ffmpeg` and `ffprobe`. They stay off without them. |
| Images or logos are broken on the local site | Run `npm run seed:site-assets -w apps/api` to upload them to the website bucket. |
