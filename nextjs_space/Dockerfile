FROM node:20-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --include=dev --legacy-peer-deps
COPY . .
RUN DATABASE_URL=postgresql://dummy:dummy@127.0.0.1:5432/dummy npx prisma generate
RUN DATABASE_URL=postgresql://dummy:dummy@127.0.0.1:5432/dummy npm run build
EXPOSE 3000
CMD ["npm", "start"]
