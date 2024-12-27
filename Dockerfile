FROM node:alpine

ADD src /app
WORKDIR /app

RUN npm install --omit=dev

USER node

CMD ["npm", "start"]
