# Use Node.js 20 as the base image
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --include=optional

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

