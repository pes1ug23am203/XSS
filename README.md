# XSS Attack Training Lab

An intentionally vulnerable, local-only training environment for stored XSS, cookie exposure, simulated account actions, and CSP concepts. The Elgg-like API and attack outcomes are partly simulated; this is not a production application.

## Run locally

Requirements: Docker with Compose, Node.js 18+, and npm.

1. Copy `.env.example` to `.env` and set unique local values for `ELGG_DB_PASSWORD` and `ELGG_DB_ROOT_PASSWORD`.
2. Build the disposable terminal image: `docker build -t xss-lab-terminal -f Dockerfile .`
3. Start the API, five configured student instances, Nginx, Elgg, and MariaDB: `docker compose up --build -d`.
4. Start the terminal/WebSocket server on the host: `npm --prefix backend run terminal`.
5. Open `http://localhost/student1/` through `http://localhost/student5/`.

The browser UI currently connects to the terminal server at `localhost:3001`; this setup is intended for a local development machine, not remote classroom hosting. The terminal server controls Docker through the host Docker socket when run via `docker-compose.terminal.yml`; only use that configuration on a disposable, trusted machine. The main Compose setup does not require the terminal Compose file.

Stop services with `docker compose down`. To remove the Elgg database volume too, use `docker compose down -v`.

## Build and verification

- Backend compile: `npm --prefix backend run build`
- Frontend bundle: `npm --prefix backend run build:frontend`
- Compose validation: `docker compose config --quiet`

There is no automated test suite in the repository. The vulnerable simulator, in-memory sessions, and educational credentials are not suitable for production use.