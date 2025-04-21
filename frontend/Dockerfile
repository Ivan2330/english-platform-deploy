# 1. Базовий образ для білду
FROM node:20-alpine AS builder

# 2. Встановлюємо робочу директорію
WORKDIR /app

# 3. Копіюємо package.json і встановлюємо залежності
COPY package.json package-lock.json* ./
RUN npm install

# 4. Копіюємо увесь код та збираємо фронт
COPY . .
RUN npm run build

# 5. Продакшн сервер — Nginx
FROM nginx:alpine

# 6. Копіюємо зібраний фронтенд у Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 7. Замінюємо стандартну конфігурацію nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 8. Відкритий порт
EXPOSE 80

# 9. Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
