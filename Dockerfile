FROM node:26.4.0-alpine AS base

WORKDIR /usr/src/app

RUN npm install -g yarn@1.22.22

COPY package.json yarn.lock ./
COPY scripts ./scripts

FROM base AS development

ENV NODE_ENV=development

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["yarn", "start:dev"]

FROM base AS build

ENV NODE_ENV=development

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000

RUN yarn install --frozen-lockfile --production=true && yarn cache clean

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["yarn", "start:prod"]
