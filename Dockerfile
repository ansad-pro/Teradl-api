FROM ghcr.io/puppeteer/puppeteer:21.0.0

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
