# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

ENV BACKEND_UPSTREAM=http://backend:8000

RUN rm -f /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY security-headers.inc /etc/nginx/security-headers.inc

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
