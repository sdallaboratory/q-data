FROM node:16.13.0-alpine as prod

WORKDIR /app

COPY package*.json ./
# RUN npm ci --only=production
COPY ./node_modules ./node_modules 
# TODO: Dont copy dev dependencies

COPY ./dist/ ./dist/

EXPOSE 3000

CMD [ "npm", "run", "serve" ]