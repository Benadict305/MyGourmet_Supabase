# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Cache-Optimierung: Erst Dependencies installieren
COPY package*.json ./
RUN npm ci

# Dann den Rest kopieren
COPY . .

# Build-Argumente übernehmen
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Production Stage
FROM nginx:alpine

# 1. App kopieren
COPY --from=builder /app/dist /usr/share/nginx/html

# 2. WICHTIG: Nginx Config INLINE erstellen (statt externe Datei kopieren)
# Das garantiert, dass React-Routing (z.B. /mygourmet/login) funktioniert
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]