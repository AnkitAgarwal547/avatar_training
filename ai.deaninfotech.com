server {
  listen 80;
  server_name ai.deaninfotech.com;

  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name ai.deaninfotech.com;

  ssl_certificate     /etc/letsencrypt/live/ai.deaninfotech.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ai.deaninfotech.com/privkey.pem;
  include             /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 10M;

  # Main app mounted at /ocr-app (path is preserved when proxying)
  location /ocr-app {
    proxy_pass http://127.0.0.1:5001;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }

  # Redirect legacy asset URLs without /ocr-app prefix to the correct path
  # e.g. /assets/ACR%20Logo.png -> /ocr-app/assets/ACR%20Logo.png
  location /assets/ {
    return 301 /ocr-app$request_uri;
  }

  # Next.js static assets (CSS/JS)
  location /_next/ {
    proxy_pass http://127.0.0.1:5001/_next/;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }

  # Next.js Image Optimization when app is behind /ocr-app
  # With basePath=/ocr-app, upstream expects the SAME path (/ocr-app/_next/image),
  # so we proxy without rewriting the URI.
  location /ocr-app/_next/image {
    proxy_pass http://127.0.0.1:5001;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }

  # ---------------- Chatbot app at /chatbot ----------------

  # Main chatbot app mounted at /chatbot
  # Next.js basePath is set to /chatbot in next.config.ts
  location /chatbot {
    proxy_pass http://127.0.0.1:5002;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }

  # Image optimization for chatbot app behind /chatbot
  location /chatbot/_next/image {
    proxy_pass http://127.0.0.1:5002;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }

  # ---------------- AI Avatar Training app at /ai-avatar ----------------

  # WebSocket proxy for avatar backend (port 5008)
  location /ai-avatar-ws {
    proxy_pass http://127.0.0.1:5008/;

    proxy_http_version 1.1;
    proxy_set_header Upgrade         $http_upgrade;
    proxy_set_header Connection      "Upgrade";
    proxy_set_header Host            $host;
    proxy_set_header X-Real-IP        $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # TTS API proxy for avatar backend
  location /ai-avatar-api/ {
    proxy_pass http://127.0.0.1:5008/;

    proxy_set_header Host            $host;
    proxy_set_header X-Real-IP        $remote_addr;
    proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Main AI Avatar app mounted at /ai-avatar (Next.js basePath)
  location /ai-avatar {
    proxy_pass http://127.0.0.1:5003;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }

  # Image optimization for AI Avatar app behind /ai-avatar
  location /ai-avatar/_next/image {
    proxy_pass http://127.0.0.1:5003;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass          $http_upgrade;
  }
}

