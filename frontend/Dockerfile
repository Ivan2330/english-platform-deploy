
# FROM node:20-alpine AS builder
# WORKDIR /app

# ARG VITE_API_URL
# ARG VITE_WS_URL
# ENV VITE_API_URL=$VITE_API_URL
# ENV VITE_WS_URL=$VITE_WS_URL

# COPY package*.json ./
# RUN npm install --legacy-peer-deps

# COPY . .
# RUN npm run build


# FROM nginx:alpine

# COPY --from=builder /app/dist /usr/share/nginx/html

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

################  BUILD  ################
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

################  RUNTIME (edge nginx)  ################
FROM nginx:alpine
# прибираємо дефолт-конфіг, щоб не був 403
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf          
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
