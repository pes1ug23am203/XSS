# XSS Attack Lab — Interview Preparation

## 1. About the Project

The project is a deliberately insecure educational web application designed to teach how Cross-Site Scripting (XSS) works in a controlled environment. The backend is implemented in Node.js with Express, and the frontend is a single-page React-style interface that presents lab tasks, simulates an Elgg social network, and exposes attack workflows students can practice.

The system is not a production security product; it is a teaching sandbox. Its core workflow is:

1. A student starts a lab session.
2. The server creates a lab token and in-memory session state.
3. The student solves tasks by crafting XSS payloads and interacting with the simulated Elgg profile system.
4. The app simulates browser execution when a victim visits an infected profile.
5. The backend logs exfiltration attempts, profile changes, friend additions, and worm propagation.
6. The terminal interface displays the captured data to mimic a real attacker listener.

The most technically interesting part of the project is that it intentionally models browser vulnerabilities using simulated server-side state and HTTP requests rather than a real database or browser engine. This makes it excellent for learning, but it also means state resets on restart and the model is deterministic rather than fully realistic.

## 2. Project at a Glance

| Layer | Technology / Component |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | React-style JSX UI (`frontend/XssLab_v2.jsx`) |
| Static frontend assets | Express static serving from `backend/public` |
| Session state | In-memory `Map` objects (`labSessions`, `elggSessions`) |
| Data model | Server-side task definitions in `backend/src/data/tasks.ts` |
| Terminal simulation | Netcat-style listener and captured requests in `terminal.routes.ts` |
| AI/LLM integration | Anthropic and Gemini API proxy routes in `backend/src/app.ts` |
| Deployment | Docker Compose + Nginx reverse proxy |
| Testing | No formal automated test suite was verified in the repository |
| Containerization | Dockerfile + docker-compose configuration |

## 3. Repository Structure

```text
xss/
├── backend/
│   ├── public/
│   │   ├── index.html
│   │   ├── RealTerminal.jsx
│   │   └── XssLab_v2.js / XssLab_v2.jsx
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── types.ts
│   │   ├── data/
│   │   │   └── tasks.ts
│   │   └── routes/
│   │       ├── elgg.routes.ts
│   │       ├── lab.routes.ts
│   │       ├── terminal.routes.ts
│   │       └── workshop.routes.ts
│   ├── Dockerfile.backend
│   ├── build-frontend.js
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── XssLab_v2.jsx
│   ├── RealTerminal.jsx
│   ├── build-jsx.js
│   ├── check-detailed.js
│   ├── check-syntax.js
│   ├── find-first-error.js
│   ├── full-trace.js
│   ├── trace-braces.js
│   └── public/
│       └── index.html
├── nginx/
│   ├── nginx.conf
│   └── certs/
├── logs/
│   └── student1..student5/
├── changes/
│   ├── BEFORE_AFTER_COMPARISON.md
│   ├── CHANGES_GUIDE.md
│   └── INTEGRATION_GUIDE.md
├── docker-compose.yml
├── docker-compose.terminal.yml
├── Dockerfile
├── docker-manage.bat
├── docker-manage.ps1
├── .env.example
├── .env.local
└── README files / lab materials (PDFs)
```

### Important directories and files

- `backend/src/routes/lab.routes.ts`: manages the lab session lifecycle, scoreboard, task completion, hints, and current task state.
- `backend/src/routes/elgg.routes.ts`: simulates the vulnerable social network and checks whether a profile description triggers XSS behavior.
- `backend/src/routes/workshop.routes.ts`: simulates the attack payload execution against a victim profile and applies state changes such as friend requests or profile edits.
- `backend/src/routes/terminal.routes.ts`: models a terminal netcat listener and captures stolen cookie requests.
- `backend/src/data/tasks.ts`: single source of truth for the XSS lab tasks, questions, hints, XP values, answers, and progression.
- `backend/src/types.ts`: defines the core in-memory state model for lab sessions and Elgg profiles.
- `frontend/XssLab_v2.jsx`: the main student-facing UI for interacting with tasks, attacks, and the lab flow.
- `backend/src/app.ts`: central Express app setup, CORS, static serving, and AI endpoints.

## 4. System Architecture

### End-to-end request flow

1. User opens the frontend and starts a lab by calling `/api/lab/start`.
   - The server creates a UUID token and initializes a `LabSession` object.
   - A `Map<string, LabSession>` in memory stores all active sessions.
   - The API returns the token plus a stripped task list without correct answers.

2. The frontend renders task modules and the mock Elgg portal.
   - The student sees the current task, challenge description, embedded questions, and the simulated social network.
   - The UI interacts with the backend through the `/api/lab/*` endpoints.

3. Student answers challenge questions or completes setup tasks.
   - `/api/lab/answer` compares the submitted answer to a server-side answer in `tasks.ts`.
   - Correct answers increment score and mark a task complete.
   - Hints are deducted from score and returned via `/api/lab/hint`.

4. The simulated social network triggers XSS behaviors.
   - A profile description is stored in `lab.elggState.profiles[username].description`.
   - When another user views that profile, `simulateXssOnView` checks for dangerous patterns like `document.cookie`, AJAX requests to `/action/friends/add`, `POST` to `/action/profile/edit`, and self-propagating worm patterns.
   - This mirrors how a stored XSS payload executes only when the victim loads the infected page.

5. Payload simulation updates the lab state.
   - Friend additions are added to the viewer’s profile state.
   - Profile descriptions are overwritten.
   - Cookie theft events are recorded.
   - Activity logs are appended to describe what the worm did.

6. Terminal capture replicates an attacker listening socket.
   - The student runs a terminal command that begins a fake listener.
   - The attack route `/api/terminal/capture-cookie` receives data representing cookie exfiltration and appends it to the terminal output.
   - This makes the student experience feel like a real terminal attack chain.

7. The response flows back to the frontend.
   - The front-end re-renders based on updated `session` state and captured terminal output.
   - The lab is intentionally stateful in memory so the experience stays interactive without a database.

### Architecture diagram

```text
User
  ↓
Frontend (React JSX / static UI)
  ↓
Express API (/api/lab, /api/elgg, /api/workshop, /api/terminal)
  ↓
Backend services (session manager, Elgg simulation, terminal logger)
  ↓
In-memory session state (`Map` objects, task definitions)
  ↓
Response + UI updates
```

## 5. Component-Level Architecture

### Lab Session Manager (`lab.routes.ts`)

Purpose:
- Create and manage student lab sessions.
- Track current task, completion state, hints, and score.
- Anchor all lab progress to a single token.

Input:
- Student name, task ID, question ID, answers.

Processing:
- Generates UUID token.
- Initializes per-task `TaskState` values and `elggState`.
- Validates answer correctness by comparing normalized strings.
- Awards XP and marks tasks complete when all required questions are answered.

Output:
- Session JSON including tokens, score, current task, updated Elgg state.

Dependencies:
- `tasks.ts` for content and answers.
- `types.ts` for the data model.

### Elgg Social Network Simulation (`elgg.routes.ts`)

Purpose:
- Mimic an Elgg-style app with login, profile viewing, and friend relationships.
- Model the web application that is being attacked.

Input:
- Username, password, lab token, cookie-based session ID.

Processing:
- Verifies user credentials against a server-side map.
- Creates a fake Elgg session on login.
- Reads and returns profile data for the logged-in user.
- Triggers XSS effects when a different user views a profile containing a malicious payload.

Output:
- Login result, profile metadata, activity log, and detected XSS events.

Key logic:
- `simulateXssOnView()` checks for dangerous patterns such as crafted `img`, AJAX GET to friends add, or a POST to the profile edit endpoint.

### Attack Workshop (`workshop.routes.ts`)

Purpose:
- Simulate how a malicious payload behaves when a victim visits an infected profile.

Input:
- `labToken`, `payload`, `viewer`, `profileOwner`.

Processing:
- Normalizes the string and detects whether the payload contains:
  - cookie display logic
  - cookie exfiltration via image request
  - friend-add AJAX
  - profile edit AJAX
  - self-propagating worm behavior
- Writes the payload into the owner’s profile field and updates the Elgg model.

Output:
- `attackType`, `requests`, `stateChanges`, `events`, and final session snapshot.

### Terminal Capture (`terminal.routes.ts`)

Purpose:
- Model a real attacker netcat listener for stolen cookies.

Input:
- Terminal session ID, lab token, command, captured request.

Processing:
- Maintains `terminalSessions` in memory.
- Accepts a simulated `nc -lknv` command and logs port information.
- Records captured requests such as `GET /?c=...`.

Output:
- Terminal output, port metadata, and captured cookie requests.

This is educationally useful because the user can see realistic looking terminal output without needing a true network bridge or a real shell.

### AI Routes (`app.ts`)

Purpose:
- Provide optional LLM integration for tasks or assistant help.

Implementation:
- Anthropic `messages.create(...)` route at `/api/chat`.
- Gemini `generateContent` proxy route at `/api/gemini`.

Important note:
- These routes exist, but the project’s main educational workflow does not depend on them for the XSS lab progression itself.
- They were added as assistant-like augmentation rather than as the core engine of the lab.

### Task Data (`data/tasks.ts`)

Purpose:
- Centralize challenge content, correct answers, hints, XP, and progression.

Key ideas:
- Each task is a structured object with `id`, `title`, `category`, `xp`, `questions`, and `hints`.
- Answers remain server-side and are intentionally not exposed to the frontend.
- The project uses a progression model from basic script injection to cookie theft, friend spam, profile poisoning, and self-propagating XSS worm logic.

## 6. Important Design Decisions

### 1. In-memory state instead of a database

The entire lab state is kept in JavaScript `Map` instances (`labSessions`, `elggSessions`, `terminalSessions`). This is a practical choice for a learning environment because it is simple, fast, and easy to reset, but it introduces the following constraints:

- sessions are lost on backend restart
- there is no persistence or audit trail
- it does not scale to multi-instance or multi-server deployments without external shared storage

### 2. The app is intentionally vulnerable

The lab is built around unsafe patterns:

- raw HTML stored in profile fields
- unescaped rendering
- cookie access via JavaScript
- fake CSRF tokens used in simulated requests
- intentionally disabled CSP restrictions in the backend setup

This is a teaching decision, not a production-ready security architecture.

### 3. State is driven by deterministic string matching

The project does not use a full browser engine or real DOM sandbox. Instead, payload analysis is rule-based. For example:

- `analysePayload()` checks whether the payload contains `document.cookie`, `action/friends/add`, or `action/profile/edit`.
- The server then updates the simulated Elgg state accordingly.

This makes the lab reproducible and easy to test, but it is not equivalent to a real browser execution engine.

### 4. Role separation: attacker vs. victim vs. observer

The project makes a clear distinction between:

- the profile owner (`samy`)
- the current logged-in viewer (`alice`, `boby`, etc.)
- the attacker trying to exfiltrate data

This is central to XSS learning because the exploit only truly triggers when the victim loads the infected profile, not when the attacker saves it.

## 7. Key Challenges and Bugs Visible in the Repository

These are not necessarily “bugs” in the sense of broken code; they are design and implementation constraints that matter in an interview discussion.

### Challenge 1: In-memory sessions are ephemeral

Since session data is kept in memory, the lab cannot survive process restarts. A production implementation would require database-backed or Redis-backed session storage.

### Challenge 2: Attack logic is simplified and rule-based

The project does not emulate real browser security boundaries precisely. Instead, it approximates exploit behavior by string-matching payloads. That makes it educationally effective, but less realistic than a full browser automation or sandbox environment.

### Challenge 3: Security is intentionally disabled for the lab

`app.ts` explicitly disables `helmet` CSP protection:

```ts
app.use(helmet({ contentSecurityPolicy: false }));
```

This is essential for the learning environment because the entire exercise depends on being able to observe XSS execution in a simulated environment.

### Challenge 4: The code is teaching-oriented, not “secure-by-default”

The app exposes endpoints like `/api/elgg/login`, profile views, and social actions without robust production protections, because the environment is meant to demonstrate exploit paths. This is intentionally not a secure general-purpose app architecture.

## 8. Security Model and Attack Flow

The project is best understood as a controlled, intentionally insecure application model. The core security assumptions are:

- profile fields store raw HTML without sanitization
- the browser executes scripts on the victim page when the payload is rendered
- cookie values can be read if the cookie is not `HttpOnly`
- AJAX requests can be forged with CSRF token values if the attacker can read them from the DOM
- the attack can be chained: steal cookie → add friend → overwrite profile → worm-like propagation

The lab simulates the classic XSS chain:

1. Attacker places payload in `About Me` or `Brief Description`.
2. Victim visits the profile.
3. Browser executes payload in victim context.
4. Payload reads cookie or makes background request.
5. Server logs the exfiltration or mutation.
6. Frontend shows the result in terminal or activity log.

This project is an excellent teaching model because it turns abstract browser behaviors into concrete Labs and stepwise tasks.

## 9. Data Model and Persistence

The project’s core persistence model is intentionally minimal.

### Session models (`types.ts`)

- `LabSession`
  - token
  - studentName
  - score
  - hintsUsed
  - startedAt
  - expiresAt
  - currentTask
  - tasks
  - elggState
  - elggSessionUser

- `TaskState`
  - completed
  - started
  - answersCorrect
  - flagEarned

- `ElggState`
  - profiles
  - activityLog
  - cookiesStolen

- `UserProfile`
  - username
  - displayName
  - description
  - briefDescription
  - friends

### Persistence behavior

- `labSessions` is a `Map` keyed by token.
- `elggSessions` is a `Map` keyed by the cookie session ID.
- `terminalSessions` is a `Map` keyed by terminal session ID.
- There is a TTL cleanup loop in `lab.routes.ts` for lab sessions.

This means the app behaves like a learning sandbox rather than a production-grade application with durable storage.

## 10. API Surface

| Endpoint | Purpose |
|---|---|
| `POST /api/lab/start` | Initialize a session and return task list |
| `GET /api/lab/session/:token` | Fetch a session and current state |
| `POST /api/lab/answer` | Validate a task answer |
| `POST /api/lab/hint` | Return the next hint and deduct points |
| `POST /api/lab/complete-task` | Complete setup/defense tasks |
| `POST /api/lab/set-task` | Set the current task |
| `DELETE /api/lab/session/:token` | Remove a session |
| `POST /api/elgg/login` | Login to the simulated Elgg system |
| `POST /api/elgg/logout` | Clear the fake session cookie |
| `GET /api/elgg/profile/:username` | View a profile and trigger XSS simulation |
| `POST /api/workshop/simulate` | Simulate an XSS payload against a victim profile |
| `POST /api/terminal/start` | Start a fake netcat listener |
| `GET /api/terminal/output/:sessionId` | Read terminal output |
| `POST /api/terminal/input` | Simulate terminal input |
| `POST /api/terminal/capture-cookie` | Record an exfiltrated cookie |
| `POST /api/chat` | Anthropic chat route |
| `POST /api/gemini` | Gemini proxy route |
| `GET /health` | Health check |

## 11. Testing and Validation

The repository does not show a mature automated test framework. No verified Jest, Vitest, Mocha, or Cypress suite was found in the codebase. The project instead depends on:

- static validation via TypeScript compile (`tsc`)
- build scripts for frontend transpilation (`build-frontend.js`)
- manual runtime behavior via browser and API interaction

This is typical for a teaching lab but it means reliability depends heavily on manual validation and the developer’s understanding of the simulated flows.

## 12. Performance and Scalability

The project’s performance characteristics are fine for a classroom lab but not for a production-grade application:

- session state is in process memory
- all task validation is synchronous and in-memory
- no database, queue, or caching system is used
- terminal output and event logs are kept in memory as arrays

Potential scalability bottlenecks:

- multiple backend containers are defined in Docker Compose, but their state is not shared
- a restart clears the whole lab state
- concurrency is limited to a single process per backend instance
- session storage does not scale across multiple hosts

## 13. Interview Questions and Strong Answers

### Q: What is the main architectural pattern in this project?

A: This is a Node.js + Express backend with a React-style frontend and an intentionally vulnerable social-network simulation. The core architecture is session-driven: a token identifies a student’s lab progress, and the backend mutates in-memory state as the student solves tasks or triggers XSS payloads.

### Q: Why is the app intentionally insecure?

A: Because it is an educational XSS lab, not a secure production app. The point is to demonstrate realistic attack chains such as stored XSS, cookie theft, CSRF-like request forgery, and self-propagating worm logic in a controlled environment.

### Q: What is the biggest limitation of this design?

A: It depends on in-memory state and string-based payload simulation. That makes it easy to use in a lab, but it is not resilient, persistent, or production-grade. A restart loses all session state, and the attack logic is simplified compared to a real browser runtime.

### Q: How does the project model the XSS trigger?

A: The backend stores malicious strings in profile descriptions and then checks for them when viewing another user’s profile. If patterns like `document.cookie`, friend-add URLs, or profile edit actions appear, the app simulates the attack and updates the Elgg state.

### Q: Why is the terminal simulation important?

A: It gives the student a realistic “attacker machine” feeling. The backend records a fake `nc -lknv 5555` listener and logs the stolen cookie value as if a browser made a request to an attacker-controlled host.

## 14. Final Takeaway

This project is best described as a teaching platform for web exploitation fundamentals, not a production website. The real engineering value is in how it ties together:

- API-driven session management
- simulated vulnerable social app behavior
- attack chain modeling
- state tracking and scoring
- terminal-style evidence of exfiltration
- a structured learning progression across tasks

The strongest technical story is not “this is a secure application,” but rather “this is a deliberately insecure training environment built to expose the mechanics of browser-based exploitation in a controlled and observable way.”

[NOT_VERIFIED_FROM_CODE]: There is no evidence in the repository of a persistent database, a real user-authentication system beyond simulated Elgg credentials, or a formal automated test suite.
