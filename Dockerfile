FROM node:20-alpine as build
LABEL version="1.0" maintainer="Majo Richter <majo418@coreunit.net>"
WORKDIR /app
RUN npm i -g npm@10

COPY package*.json /app/
RUN npm i

COPY . /app
RUN npm run build && \
    rm -rf src tsconfig.json node_modules

FROM node:20-alpine
LABEL version="1.0" maintainer="Majo Richter <majo418@coreunit.net>"
WORKDIR /app
RUN npm i -g npm@10

COPY --from=build /app/package*.json /app/
RUN npm ci --omit=dev

COPY --from=build /app /app

ENTRYPOINT [ "/app/bin/prod.sh" ]
