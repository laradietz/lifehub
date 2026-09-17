FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# npm ci (no npm install): instala exactamente lo que dice package-lock.json, sin
# poder actualizarlo silenciosamente en cada build (ver AUDITORIA.md).
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
