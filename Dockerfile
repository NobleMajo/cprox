FROM node:16-alpine as build
WORKDIR /app

RUN npm i -g npm@8

COPY package*.json /app/
RUN npm i

COPY . /app
RUN npm run build

FROM node:16-alpine
LABEL version="1.0" maintainer="Majo Richter <majo418@coreunit.net>"
WORKDIR /app

RUN npm i -g npm@8

COPY --from=build /app/package*.json /app/
RUN npm ci --only=prod

COPY --from=build /app/dist /app/dist

VOLUME [ "/app/certs" ]
VOLUME [ "/mountpoint" ]
EXPOSE 80
EXPOSE 433

ENTRYPOINT [ "node", "/app/dist/index.js" ]
