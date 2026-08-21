# ---- Stage 1: build the static files ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# At this point, /app/dist contains plain HTML/CSS/JS — nothing Node-specific left

# ---- Stage 2: serve those files with nginx ----
FROM nginx:alpine

# Remove nginx's default sample page
RUN rm -rf /usr/share/nginx/html/*

# Copy ONLY the built static files from Stage 1 — nothing else from that stage ships
COPY --from=build /app/dist /usr/share/nginx/html

# Our own nginx config (we'll write this next) — replaces the default one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]