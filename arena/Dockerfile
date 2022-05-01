FROM node:16.13.0-alpine as prod

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY ./dist/ ./dist/

EXPOSE 80

CMD [ "npm", "run", "serve" ]