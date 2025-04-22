# 1. Базовий образ
FROM node:20-alpine AS builder

# 2. Встановлення робочої директорії
WORKDIR /app

# 3. Копіюємо файли
COPY . .

# 4. Встановлюємо залежності
RUN npm install --legacy-peer-deps

# 5. Встановлюємо production змінні (ручне вбудовування)
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# 6. Збираємо білд
RUN npm run build

# 7. Продакшн сервер — Nginx
FROM nginx:alpine

# 8. Копіюємо білд
COPY --from=builder /app/dist /usr/share/nginx/html

# 9. Замінюємо nginx конфіг
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
