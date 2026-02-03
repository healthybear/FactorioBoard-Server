# FactorioBoard Server 部署说明

## dist 包什么时候会用？

- **直接部署（方式一）**：服务器上执行 `pnpm run build` 得到 `dist/`，再用 `pnpm run start:prod` 或 `pm2 start dist/index.js` 运行。**生产进程跑的就是 dist 里的 JS**，不会跑 TypeScript 源码。
- **Docker 部署（方式二）**：构建镜像时在容器里执行 `pnpm run build`，生成的 `dist/` 被打进镜像，运行时 `node dist/index.js`。**因此不需要在本地先打 dist**，只要 `docker build` 即可；dist 在镜像内生成并被使用。
- **开发环境**：`pnpm run start:dev` 用 tsx 直接跑 `src/index.ts`，不依赖 dist；生产环境不要用 start:dev。

总结：生产环境跑的始终是 dist；打 dist 要么在服务器上做（方式一），要么在 Docker 构建里做（方式二）。

---

## 方式一：直接部署（Node.js + PM2）

### 1. 服务器环境

- Node.js >= 20（与 package.json 的 engines 一致）
- pnpm：`npm install -g pnpm` 或 `corepack enable && corepack prepare pnpm@latest --activate`

### 2. 拉取代码并构建

```bash
cd /opt/factorioBoard-Server   # 或你的部署目录
git pull
pnpm install
pnpm run build
```

### 3. 环境变量

复制 `.env.template` 为 `.env`，按生产环境修改，例如：

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
CORS_ORIGIN=https://你的前端域名
COMMON_RATE_LIMIT_MAX_REQUESTS=1000
COMMON_RATE_LIMIT_WINDOW_MS=1000
```

### 4. 使用 PM2 守护进程

```bash
# 安装 PM2
npm install -g pm2

# 启动（生产用编译后的 dist）
pm2 start dist/index.js --name factorio-board-api

# 开机自启
pm2 startup
pm2 save
```

常用命令：`pm2 logs factorio-board-api`、`pm2 restart factorio-board-api`、`pm2 stop factorio-board-api`。

### 5. 存档目录

上传的存档会保存在项目根目录下的 `game-saves/`。若需要固定路径或备份，可软链接或通过环境变量扩展（当前为代码内写死 `game-saves`）。

---

## 方式二：Docker 部署

### 1. 构建镜像

```bash
cd /path/to/factorioBoard-Server
docker build -t factorio-board-api .
```

### 2. 运行容器

```bash
docker run -d \
  --name factorio-board-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e CORS_ORIGIN=https://你的前端域名 \
  -v $(pwd)/game-saves:/app/game-saves \
  factorio-board-api
```

说明：

- **-p 3000:3000**：宿主机 3000 映射容器内 3000；应用通过环境变量 `PORT` 监听，默认 3000。
- **-v $(pwd)/game-saves:/app/game-saves**：把宿主机的 `game-saves` 挂载进容器，上传的存档持久化，重启容器不丢失。

### 3. 使用 docker-compose（可选）

在项目根目录创建 `docker-compose.yml`：

```yaml
services:
  api:
    build: .
    image: factorio-board-api
    container_name: factorio-board-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3000
      CORS_ORIGIN: https://你的前端域名
    volumes:
      - ./game-saves:/app/game-saves
```

然后执行：

```bash
docker compose up -d
```

---

## 前端与 Nginx 反向代理（可选）

若通过 Nginx 暴露 API，可参考以下配置（监听 8089，后端为 localhost:3001）：

```nginx
server {
    listen 8089;
    server_name 你的服务器IP或域名;

    # Swagger
    location /api-docs {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 个人后端
    location / {
        proxy_pass http://localhost:3001;  # 指向 express 服务器
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;  # WebSocket 支持
        proxy_set_header Connection "upgrade";
    }

    # 静态资源缓存设置（按需启用）
    # location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    #     expires 30d;
    #     add_header Cache-Control "public, max-age=2592000";
    # }
}
```

说明：

- **端口**：对外 8089，后端 Express 监听 3001，部署时需将应用 `PORT` 设为 3001。
- **Swagger**：`/api-docs` 单独 location，与主接口共用同一后端。
- **WebSocket**：`Upgrade` / `Connection` 头用于 WebSocket 代理。

配置 HTTPS 可用 Let's Encrypt（certbot）等。

---

## 健康检查与 Swagger UI

部署后可通过健康检查接口确认服务正常：

```bash
curl http://localhost:3000/health-check
```

**打开 Swagger UI（API 文档）：**

在浏览器访问：

- 本地：<http://localhost:3000/api-docs>
- 服务器：`http://你的服务器IP或域名:3000/api-docs`

例如服务器 IP 为 `192.168.1.100`、端口为 `3000`，则访问：**http://192.168.1.100:3000/api-docs**。若使用上文 Nginx 配置（监听 8089），则访问：**http://你的服务器IP或域名:8089/api-docs**（建议先试**无**尾部斜杠的地址）。若前面有 Nginx 反向代理并绑定了域名，则用：**https://api.你的域名.com/api-docs**。

### 若 /api-docs 访问不到、没数据返回

1. **先试无尾部斜杠**：访问 `http://你的服务器IP或域名:8089/api-docs`（不要用 `/api-docs/`）。
2. **在服务器上确认后端正常**：
   ```bash
   curl -I http://127.0.0.1:3001/api-docs
   curl -I http://127.0.0.1:3001/api-docs/swagger.json
   ```
   若这里就无响应或非 200，说明应用未监听 3001 或未启动，需检查 `PORT=3001` 和 PM2/Docker。
3. **确认 Nginx 把 /api-docs 及子路径都转给后端**：`location /api-docs` 会匹配 `/api-docs`、`/api-docs/`、`/api-docs/swagger.json` 等，且 `proxy_pass` 后不要加尾部斜杠（保持 `http://localhost:3001`），否则路径会被改写，Express 收不到 `/api-docs` 前缀。
