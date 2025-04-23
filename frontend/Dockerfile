# 🔨 Білд-фаза
FROM node:20-alpine AS builder
WORKDIR /app

# Аргументи для білду
ARG VITE_API_URL
ARG VITE_WS_URL

# Експортуємо у змінні середовища, які Vite зможе прочитати
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Встановлення залежностей
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копіюємо увесь проект
COPY . .

# ⚙️ Білд з Vite
RUN npm run build

# 🚀 Продакшн-фаза
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Замінюємо стандартну конфігурацію Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
