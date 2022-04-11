FROM node:16-alpine as build

RUN npm i -g npm@latest
WORKDIR /app

COPY package*.json /app/
RUN npm ci
COPY . /app
RUN npm run build

FROM node:16-alpine

RUN npm i -g npm@latest
WORKDIR /app

VOLUME [ "/app/certs" ]
EXPOSE 80
EXPOSE 433

COPY --from=build /app/package*.json /app/
RUN npm ci --only=prod
COPY --from=build /app/dist /app/dist

ENTRYPOINT [ "node", "/app/dist/index.js" ]
