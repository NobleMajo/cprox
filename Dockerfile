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
COPY --from=build /app/package*.json /app/
RUN npm ci --only=prod
COPY --from=build /app/dist /app/dist

EXPOSE 8080

CMD ["/app/dist/index.js"]




