FROM node:16.15.0-alpine
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY . .