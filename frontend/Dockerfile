# Білд-фаза
FROM node:20-alpine AS builder
WORKDIR /app

# Передача змінних під час білду
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Встановлення залежностей
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копіюємо проєкт і білдимо
COPY . .
RUN npm run build

# Продакшн-фаза
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
