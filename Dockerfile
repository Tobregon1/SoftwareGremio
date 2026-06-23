FROM node:20-alpine

# Herramientas necesarias para compilar sqlite3 (módulo nativo)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar dependencias primero (mejor cache de Docker)
COPY package*.json ./
RUN npm install

# Copiar el resto del proyecto
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
