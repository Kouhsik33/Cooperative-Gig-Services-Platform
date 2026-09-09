FROM node:20-alpine

# Prisma's query engine is dynamically linked against libssl and needs the
# `openssl` package present so it can detect the version and load the
# matching engine (linux-musl-openssl-3.0.x). Without it, Prisma falls
# back to the legacy linux-musl engine, which wants libssl.so.1.1, and the
# container crashes at startup with "Error loading shared library
# libssl.so.1.1". Do NOT switch the base to node:20-slim — that image
# carries no libssl at all and cannot run Prisma even with openssl added.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
