FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG NEXT_PUBLIC_GRAFANA_HOST
ARG NEXT_PUBLIC_GRAFANA_PORT

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]