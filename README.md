# FocusFlow — DevOps Deployment Journey

This README documents, step by step, how the FocusFlow 3-tier app (React frontend, Node/Express backend, Postgres database) was taken from raw source code to a live, publicly reachable deployment on an Azure Linux VM — using Docker, Docker Compose, and versioned image tagging. It's written so a beginner can follow the exact same path, including the real problems hit along the way and how each one was fixed.

This satisfies the **"Dockerized 3-Tier App with Full CI/CD"** capstone project (compulsory for all groups).

---

## Prerequisites

- Docker Desktop installed and running
- Git installed, Git Bash (Windows) or any terminal
- An Azure account with the CLI (`az`) installed and logged in
- A free Docker Hub account
- A GitHub account

---

## Part 1 — Understand the app before touching infrastructure

Before writing a single Dockerfile, the app was tested locally exactly as it runs, to understand what it actually needs.

**The stack:**
```
[React frontend] --HTTP--> [Express backend] --SQL--> [Postgres database]
```

**Backend routes found by reading `backend/server.js` and `backend/routes/sessions.js`:**
- `GET /health` — checks the DB connection
- `GET /api/sessions` — list all sessions
- `GET /api/sessions/stats` — aggregate stats
- `POST /api/sessions` — create a session

### Step 1: Run Postgres locally in a throwaway container

```bash
docker run -d \
  --name focusflow-db-local \
  -e POSTGRES_USER=focus_user \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=focusflow \
  -p 5432:5432 \
  postgres:16
```

Confirm it's running:
```bash
docker ps
```

### Step 2: Load the schema

```bash
docker exec -i focusflow-db-local psql -U focus_user -d focusflow < database/init.sql
```

Verify the table actually exists (don't just trust the success message):
```bash
docker exec -it focusflow-db-local psql -U focus_user -d focusflow -c "\dt"
```

Check the actual data:
```bash
docker exec -it focusflow-db-local psql -U focus_user -d focusflow -c "SELECT * FROM focus_sessions;"
```

### Step 3: Run the backend locally

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Step 4: Test every endpoint with curl

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/sessions
curl http://localhost:5000/api/sessions/stats
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"task":"Test the backend","category":"DevOps","duration":30,"mood":"Curious"}'
```

To prove the health check is a *live* check, not a cached flag:
```bash
docker stop focusflow-db-local
curl http://localhost:5000/health   # returns 503 / "unreachable"
docker start focusflow-db-local
curl http://localhost:5000/health   # back to "connected"
```

**How routing works:** `app.use('/api/sessions', sessionsRouter)` in `server.js` mounts every route inside `routes/sessions.js` under the `/api/sessions` prefix. So `router.get('/stats', ...)` becomes `/api/sessions/stats`. This is a naming convention the developer chose, not a rule Express forces.

---

## Part 2 — Containerize the backend

### Step 5: Write `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
USER node
CMD ["node", "server.js"]
```

`package*.json` is copied and installed **before** the rest of the source code — this lets Docker cache the slow `npm ci` layer across rebuilds, since it only reruns if dependencies actually change.

Also add `backend/.dockerignore`:
```
node_modules
.env
```

### Step 6: Build and test the backend image standalone

```bash
cd backend
docker build -t focusflow-backend:test .
```

To connect it to Postgres, both containers need to share a Docker network (containers are isolated from each other by default):

```bash
docker network create focusflow-net
docker network connect focusflow-net focusflow-db-local

docker run -d \
  --name focusflow-backend-test \
  --network focusflow-net \
  -p 5000:5000 \
  -e DB_HOST=focusflow-db-local \
  -e DB_PORT=5432 \
  -e DB_NAME=focusflow \
  -e DB_USER=focus_user \
  -e DB_PASSWORD=changeme \
  -e PORT=5000 \
  focusflow-backend:test

curl http://localhost:5000/health
```

Note: `DB_HOST=focusflow-db-local` uses the **container name**, not `localhost` — inside a container, `localhost` means "inside this container," not your machine or another container.

---

## Part 3 — Containerize the frontend

React doesn't "run" in production — `vite build` compiles it into static HTML/CSS/JS, which then just needs to be served. This needs a **two-stage** Dockerfile: one stage to build, one to serve.

### Step 7: Write `frontend/Dockerfile`

```dockerfile
# Stage 1: build the static files
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Only the compiled `dist/` folder crosses over from Stage 1 to Stage 2 — Node, `node_modules`, and raw source never ship in the final image.

### Step 8: Write `frontend/nginx.conf`

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_set_header Host $host;
    }
}
```

This does two jobs: serves the React app, and reverse-proxies any `/api/...` call to the backend container (by Docker Compose service name — see Part 4) so the browser never needs to know the backend exists separately.

---

## Part 4 — docker-compose.yml (local development)

Instead of juggling manual `docker run`/`docker network` commands, Compose manages everything as one stack.

```yaml
services:
  db:
    image: postgres:16
    container_name: focusflow-db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    container_name: focusflow-backend
    depends_on:
      - db
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 5000
    ports:
      - "5000:5000"

  frontend:
    build: ./frontend
    container_name: focusflow-frontend
    depends_on:
      - backend
    ports:
      - "8080:80"

volumes:
  pgdata:
```

Key ideas:
- Compose creates a private network automatically — every service can reach every other service **by service name** (e.g. `DB_HOST: db`), no manual `docker network` commands needed.
- `pgdata` is a named volume — without it, all Postgres data would vanish every time the container is recreated.
- `init.sql` is mounted into Postgres's special auto-init folder — it only runs once, the first time the data volume is empty.

Run everything:
```bash
docker compose up --build
```

Then open `http://localhost:8080` in a browser — this is the real end-to-end test (browser → nginx → backend → Postgres → back).

---

## Part 5 — Versioned image tagging + Docker Hub

`latest` alone isn't good enough for rollback — it always points at whatever was pushed most recently. Instead, tag images with the **short git commit hash**, which is a permanent, traceable version identifier.

```bash
git init
git add .
git commit -m "Initial commit: FocusFlow 3-tier app with Docker setup"
git log --oneline -1        # gives a hash like b1e46eb
```

```bash
docker login

docker tag focusflow-capstone-backend glaciercodes/focusflow-backend:b1e46eb
docker tag focusflow-capstone-backend glaciercodes/focusflow-backend:latest
docker push glaciercodes/focusflow-backend:b1e46eb
docker push glaciercodes/focusflow-backend:latest

docker tag focusflow-capstone-frontend glaciercodes/focusflow-frontend:b1e46eb
docker tag focusflow-capstone-frontend glaciercodes/focusflow-frontend:latest
docker push glaciercodes/focusflow-frontend:b1e46eb
docker push glaciercodes/focusflow-frontend:latest
```

`git checkout b1e46eb` at any time shows exactly what code that image tag was built from — this is the actual "rollback with certainty" the brief asks for.

---

## Part 6 — Provision the Azure Linux VM

### Step 9: `infra/provision-vm.sh`

```bash
#!/bin/bash
set -e

RESOURCE_GROUP="focusflow-rg"
LOCATION="eastus3"
VM_NAME="focusflow-vm"
VM_SIZE="Standard_B1s"
ADMIN_USER="azureuser"

az group create --name $RESOURCE_GROUP --location $LOCATION

az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image Ubuntu2204 \
  --size $VM_SIZE \
  --admin-username $ADMIN_USER \
  --generate-ssh-keys

az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 22 --priority 100
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 80 --priority 110

az vm show --resource-group $RESOURCE_GROUP --name $VM_NAME --show-details --query publicIps --output tsv
```

Only ports **22** (SSH, for us to deploy) and **80** (public HTTP) are opened — matching the brief's requirement that the public IP not expose any port besides 80.

```bash
chmod +x infra/provision-vm.sh
./infra/provision-vm.sh
```

---

## Part 7 — Install Docker on the VM and deploy

```bash
ssh azureuser@<VM_PUBLIC_IP>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
ssh azureuser@<VM_PUBLIC_IP>     # reconnect for the group change to apply
docker --version
docker compose version
```

The VM doesn't need the source code — it pulls the already-built, versioned images from Docker Hub. A separate `docker-compose.prod.yml` reflects that (`image:` instead of `build:`, and the frontend mapped to public port `80`):

```yaml
services:
  db:
    image: postgres:16
    container_name: focusflow-db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  backend:
    image: glaciercodes/focusflow-backend:b1e46eb
    container_name: focusflow-backend
    depends_on:
      - db
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 5000
    ports:
      - "5000:5000"

  frontend:
    image: glaciercodes/focusflow-frontend:b1e46eb
    container_name: focusflow-frontend
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

Copy the compose file and schema up to the VM, then bring it up:

```bash
scp docker-compose.prod.yml azureuser@<VM_PUBLIC_IP>:~/docker-compose.yml
scp database/init.sql azureuser@<VM_PUBLIC_IP>:~/init.sql

ssh azureuser@<VM_PUBLIC_IP>
docker compose up -d
docker compose ps
curl http://localhost:5000/health
```

Then from a browser, on any machine: `http://<VM_PUBLIC_IP>` — the live, public deployment.

---

## Part 8 — Secrets: never commit real credentials

Credentials were initially hardcoded directly in the compose files — fine for local testing, but unsafe once committed to Git. Fixed by moving them into environment variables:

**`.env`** (real values, never committed):
```
DB_USER=focus_user
DB_PASSWORD=changeme
DB_NAME=focusflow
```

**`.env.example`** (committed — documents the shape without real secrets):
```
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

**`.gitignore`** must include:
```
node_modules/
.env
dist/
*.log
```

Both compose files then reference variables instead of literal values:
```yaml
environment:
  POSTGRES_USER: ${DB_USER}
  POSTGRES_PASSWORD: ${DB_PASSWORD}
  POSTGRES_DB: ${DB_NAME}
```

Before pushing to GitHub, confirm nothing is exposed:
```bash
grep -r "changeme" --include="*.yml" .
```
No output = clean. If anything prints, that file still needs fixing.

The VM also needs its own `.env` (created directly there, never committed):
```bash
ssh azureuser@<VM_PUBLIC_IP>
cat > .env << 'EOF'
DB_USER=focus_user
DB_PASSWORD=changeme
DB_NAME=focusflow
EOF
docker compose up -d
```

---

## Part 9 — Push to GitHub

```bash
gh auth status
git remote add origin https://github.com/<your-username>/focusflow-capstone.git
git branch -M main
git add .
git commit -m "Dockerized 3-tier app with Compose, versioned images, and Azure VM deployment"
git push -u origin main
```

`.env` is never staged (it's gitignored) — only `.env.example`, the Dockerfiles, both compose files, `nginx.conf`, and the provisioning script get committed.

---

## Issues encountered and how they were solved

| Issue | Cause | Fix |
|---|---|---|
| `docker build` failed: `'docker buildx build' requires 1 argument` | Forgot the trailing `.` (build context) at the end of the command | Added `.` to the end of `docker build -t <name> .` |
| `TLS handshake timeout` pulling `node:20-alpine` | Unstable connection to Docker Hub's registry, not a Dockerfile problem | Retried the pull a few times — Docker resumes/caches completed layers, so retries make real progress |
| `SkuNotAvailable: Standard_B1s ... not available in location 'eastus'` | This specific subscription (free/trial tier) is restricted from that VM size in that region | Ran `az vm list-skus --size Standard_B1s --all --output table` to find regions with no restriction (e.g. `eastus3`), and re-provisioned there |
| `scp`/`ssh` failed with `Permission denied (publickey)` and "lost connection" | Was running `scp` **from inside** the VM's SSH session, trying to SSH into itself, instead of running it from the local machine | Exited back to the local terminal first, then ran `scp` from there to push files *to* the VM |
| Credentials (`changeme`) hardcoded directly in both `docker-compose.yml` files | Fast local setup skipped proper secrets handling early on | Moved all credentials into a gitignored `.env` file, referenced via `${DB_USER}` etc. in both compose files, added `.env.example` as a template, and verified with `grep -r "changeme" --include="*.yml" .` before pushing |
| `docker compose up -d` showed "Running" instead of recreating containers after editing the compose file | Compose only recreates a container if the config actually changed — the file still had the old hardcoded values when this was run the first time | Verified the compose file was truly edited, then ran `docker compose down && docker compose up -d` for a guaranteed clean recreation |

---

## What's still outstanding for full capstone compliance

- [ ] Full GitHub Actions CI/CD pipeline (build → push → SSH deploy)
- [ ] A documented, tested rollback performed and screenshotted
- [ ] Completed Phase 0 design worksheet (tier boundaries, tagging strategy, secrets plan — much of this is implicitly answered above)
- [ ] Incident report (symptom → investigation → root cause → fix → design reflection)
- [ ] Screenshots of the live deployment and successful/blocked scenarios