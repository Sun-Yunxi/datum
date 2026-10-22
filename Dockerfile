# 构建阶段
FROM node:22.23.4-alpine AS build
WORKDIR /app

# 先只复制依赖清单，最大化利用镜像层缓存
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 运行阶段：仅保留静态产物
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# dist 内已包含 LICENSE-MiSans.txt 与 THIRD-PARTY-NOTICES.txt（由 vite 构建插件生成），
# 随镜像一同分发，满足 MiSans 协议「在字体的任何副本中保留版权声明和本协议」的要求
EXPOSE 80
