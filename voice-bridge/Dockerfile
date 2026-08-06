# Deployable from this subdirectory alone — set the build root to /voice-bridge
# on Railway/Render/Fly. The frontend and backend stay on Vercel, untouched.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Long-lived websockets: give in-flight calls time to drain on redeploy rather
# than cutting them mid-sentence.
STOPSIGNAL SIGTERM
EXPOSE 8080
CMD ["node", "dist/index.js"]
