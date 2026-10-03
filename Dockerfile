FROM node:18-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install -g @nestjs/cli
RUN npm ci

COPY . .

RUN npm run build

ENV PORT 3000
EXPOSE 3000

CMD ["npm", "run","start:dev"]
