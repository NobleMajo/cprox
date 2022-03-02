FROM node:16 as build

WORKDIR /app

RUN npm i -g npm@latest
COPY package*.json /app/
RUN npm i
COPY . /app
RUN npm run build

FROM node:16

RUN npm i -g npm@latest

WORKDIR /app
VOLUME [ "/app/certs" ]
EXPOSE 80
EXPOSE 433

COPY --from=build /app/package*.json /app/
RUN npm ci --only=prod
COPY --from=build /app/dist /app/dist

CMD ["/app/dist/index.js"]
