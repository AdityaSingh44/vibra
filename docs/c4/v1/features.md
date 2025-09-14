# Vibra — Minimal Launch Feature List (Granular)

This file defines a minimal, low-effort feature set to launch a usable and pleasant social app quickly using Node.js (backend), React (frontend), and MongoDB (database). The goal is to minimize development time while giving users a complete core experience: sign up, post, follow, and participate in communities.

Principles
- Keep the UI minimal and mobile-friendly.
- Favor server-side simplicity and clear APIs over fancy client-side state logic.
- Prioritize features that create value and avoid attention-harvesting patterns.

MVP Scope (high-level)
- Authentication (email + password) with session JWTs
- Profiles: display name, avatar (optional), bio
- Posts: create, read, delete (text + optional image)
- Follow: follow/unfollow users
- Feed: chronological feed of followed users and community posts
- Communities: create/join simple communities (public only for MVP)
- Moderation: report post endpoint and a simple moderator UI
- Basic notifications: in-app notifications for new follower and comments (polling or websocket optional)

Granular feature breakdown (prioritized)

1) Auth & Users (Priority P0)
- Frontend routes
  - `/auth/signup` - Signup form (email, password, displayName)
  - `/auth/login` - Login form
  - `/profile/:userId` - Public profile page
- Backend endpoints
  - `POST /api/auth/signup` -> create user, send verification (optional)
  - `POST /api/auth/login` -> returns JWT
  - `GET /api/users/:id` -> public profile
- DB (MongoDB collections)
  - `users`:
    - _id: ObjectId
    - email: string (unique)
    - passwordHash: string
    - displayName: string
    - avatarUrl?: string
    - bio?: string
    - followers: [ObjectId]
    - following: [ObjectId]
    - createdAt: Date
- Acceptance
  - Users can sign up and log in, JWT is returned, and profile retrieved.

2) Posts (Priority P0)
- Frontend routes
  - `/` - main feed with compose box
  - `/post/:postId` - post detail + comments
- Backend endpoints
  - `POST /api/posts` -> create post (auth required)
  - `GET /api/posts/:id` -> get post
  - `GET /api/posts?userId=...&limit=...&before=...` -> list posts
  - `DELETE /api/posts/:id` -> delete if owner
- DB
  - `posts`:
    - _id: ObjectId
    - authorId: ObjectId
    - content: string
    - media: [ {url, type} ]
    - communityId?: ObjectId
    - createdAt: Date
    - deleted: boolean
- Acceptance
  - Authenticated users can create posts; they show up in feeds; owners can delete.

3) Follow / Feed (Priority P1)
- Backend endpoints
  - `POST /api/users/:id/follow` -> toggle follow/unfollow (auth required)
  - `GET /api/feed?limit=...&before=...` -> returns chronological posts from followed users + joined communities
- Implementation notes
  - Start with a simple query: posts where authorId in user's `following` OR communityId in user's `joinedCommunities` sorted by `createdAt` DESC.
- Acceptance
  - Feed returns recent posts for the user; follow action updates feed.

4) Communities (Priority P1)
- Frontend routes
  - `/communities` - list communities + create form
  - `/community/:id` - community feed and join button
- Backend endpoints
  - `POST /api/communities` -> create community (name, description)
  - `GET /api/communities/:id` -> community details + posts
  - `POST /api/communities/:id/join` -> join community
- DB
  - `communities`:
    - _id: ObjectId
    - name: string
    - description?: string
    - members: [ObjectId]
    - createdAt: Date
- Acceptance
  - Users can create public communities and join them; community posts appear in community feed.

5) Reporting & Moderation (Priority P2)
- Backend endpoints
  - `POST /api/posts/:id/report` -> submit a report
  - `GET /api/moderation/reports` -> list reports (moderator auth)
  - `POST /api/moderation/reports/:id/action` -> take action (dismiss, remove)
- DB
  - `reports`:
    - _id
    - postId
    - reporterId
    - reason
    - status: open/closed
    - createdAt
- Acceptance
  - Reports are stored; moderators can view and act on them.

6) Notifications (Priority P2)
- Backend endpoints
  - `GET /api/notifications` -> list notifications
- DB
  - `notifications`:
    - _id
    - userId
    - type (follow, comment, mention)
    - data (json)
    - read: boolean
- Acceptance
  - Users see basic notifications in-app.

Minimal UI notes
- Keep design simple: single-column feed, top nav with search and profile dropdown.
- Use component library like Chakra UI or Tailwind + prebuilt components to speed up UI.
- Compose box: textarea + image upload (optional) + post button.

Media uploads
- For MVP, accept image uploads and store using local disk or S3-compatible storage with signed uploads.
- If local, store under `server/uploads/` and serve with static middleware.

Security & auth
- Hash passwords with `bcrypt`.
- Use JWT with short expiry for access tokens and refresh tokens as needed.
- Validate inputs and sanitize HTML when rendering posts.

Dev ergonomics
- Use TypeScript for both server and client if comfortable — it speeds iteration and prevents common bugs.
- Start with minimal testing: unit tests for auth and posts endpoints, and one end-to-end smoke test (signup -> create post -> see post in feed).
- Provide seed script to create demo users, communities, and posts.

Example minimal API contract (quick)
- `POST /api/auth/signup` { email, password, displayName } -> 201 { userId, token }
- `POST /api/auth/login` { email, password } -> 200 { token }
- `GET /api/feed` (auth) -> 200 [{ post }]
- `POST /api/posts` (auth) { content, communityId?, media? } -> 201 { post }

Deployment notes
- Dockerize `server` and `client`. Use `mongo` image for DB in early stages.
- Use environment variables for secrets and storage endpoints.

Acceptance criteria for "minimal launch"
- A new user can sign up, log in, create a post, follow another user, and see that user's post in their feed.
- Users can create and join communities and see community posts.

Next steps I can do for you
- Scaffold the `server/` and `client/` projects with the minimal routes and models listed above.
- Create seed data and a small Cypress or Playwright smoke test.

---

## Stories & Reels (v1 addendum)

Add these lightweight features to v1 to increase engagement without heavy engineering cost.

Stories (ephemeral)
- Frontend routes/UI
  - Stories tray visible on `/` (top of feed) with tappable story viewer
  - `POST /api/stories` - upload story (multipart)
- Backend endpoints
  - `POST /api/stories` -> accept multipart upload, create story document with `expiresAt`
  - `GET /api/stories/tray` -> return active stories for the current user
- DB (`stories` collection)
  - _id, authorId, mediaUrl, mimeType, caption?, expiresAt, createdAt
- Background jobs
  - Worker job periodically removes/marks expired stories (or queries by `expiresAt` when serving)
- Acceptance
  - Users can post stories which are visible for the configured expiry window (default 24h).

Reels (short-form video)
- Frontend routes/UI
  - `/reels` - scrollable reels feed (vertical, autoplay muted)
  - `POST /api/reels` - upload reel (multipart)
- Backend endpoints
  - `POST /api/reels` -> accept upload, store media ref, set `processed=false`, enqueue processing
  - `GET /api/reels` -> paginated feed (processed reels first)
- DB (`reels` collection)
  - _id, authorId, mediaUrl, caption, duration, processed: boolean, createdAt
- Background jobs
  - Worker handles optional transcoding, thumbnail generation; when finished set `processed=true`
- Acceptance
  - Users can upload short reels and see them in the reels feed; initial uploads may display before processing finishes (showing placeholder thumbnail)

Security & performance notes
- Limit max file size for stories (e.g., 10MB) and reels (e.g., 100MB). Validate mime-types.
- Strip sensitive metadata (EXIF) from images.
- Use streaming upload handling on the server (multipart streaming) to avoid large memory usage.

Quick API examples
- `POST /api/stories` { multipart form-data: file, caption } -> 201 { story }
- `GET /api/stories/tray` -> 200 [{ story }]
- `POST /api/reels` { multipart form-data: file, caption } -> 201 { reel }
- `GET /api/reels?limit=...&before=...` -> 200 [{ reel }]

---

Last updated: 2025-09-14

---

Last updated: 2025-09-14
