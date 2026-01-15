# 🚀 Express TypeScript 模板 2025

[![CI](https://github.com/edwinhern/express-typescript/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/edwinhern/express-typescript-2024/actions/workflows/ci.yml)

```code
你好！🙌
如果你喜欢这个模板，请点击 ⭐️ 按钮支持我们。
```

## 🌟 简介

欢迎使用 Express TypeScript 模板 2025 —— 一个简单且开箱即用的起始模板，用于使用 Express.js 和 TypeScript 构建后端 Web 服务。

## 💡 我们为什么做这个

这个起始套件可以帮助你：

- ✨ 更快地启动新项目
- 📊 编写整洁、一致的代码
- ⚡ 快速构建应用
- 🛡️ 遵循安全和测试的最佳实践

## 🚀 包含的功能

- 📁 组织良好的文件夹：按功能分组文件，方便查找
- 💨 快速开发：使用 `tsx` 快速运行代码，使用 `tsc` 进行类型检查
- 🌐 最新 Node.js：使用 `.tool-versions` 中的最新稳定版 Node.js
- 🔧 安全配置：使用 Zod 检查环境设置，防止错误
- 🔗 简短导入路径：使用路径别名实现简洁的代码导入
- 🔄 自动更新：使用 Renovate 保持依赖项最新
- 🔒 更好的安全性：内置 Helmet 和 CORS 设置保护
- 📊 便捷追踪：内置 `pino-http` 日志记录
- 🧪 测试就绪：已配置好 Vitest 和 Supertest 测试工具
- ✅ 代码整洁：使用 `Biomejs` 保持一致的编码风格
- 📃 标准响应：使用 `ServiceResponse` 统一 API 响应
- 🐳 便捷部署：支持 Docker 容器化
- 📝 输入检查：使用 Zod 进行请求验证
- 🧩 API 浏览器：使用 Swagger UI 提供交互式 API 文档

## 🛠️ 快速开始

### 视频演示

如需可视化指导，请观看[视频演示](https://github.com/user-attachments/assets/b1698dac-d582-45a0-8d61-31131732b74e)了解项目的设置和运行。

### 分步指南

#### 步骤 1：🚀 初始设置

- 克隆仓库：`git clone https://github.com/edwinhern/express-typescript.git`
- 进入目录：`cd express-typescript`
- 安装依赖：`pnpm install`

#### 步骤 2：⚙️ 环境配置

- 创建 `.env`：将 `.env.template` 复制为 `.env`
- 更新 `.env`：填写必要的环境变量

#### 步骤 3：🏃‍♂️ 运行项目

- 开发模式：`pnpm start:dev`
- 构建：`pnpm build`
- 生产模式：在 `.env` 中设置 `NODE_ENV="production"`，然后运行 `pnpm build && pnpm start:prod`

## 🤝 反馈与贡献

我们很乐意听取您的反馈和进一步改进的建议。欢迎贡献代码，与我们一起让后端开发更加整洁和快速！

🎉 祝编码愉快！

## 📁 文件夹结构

```code
├── biome.json
├── Dockerfile
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── README.md
├── src
│   ├── api
│   │   ├── healthCheck
│   │   │   ├── __tests__
│   │   │   │   └── healthCheckRouter.test.ts
│   │   │   └── healthCheckRouter.ts
│   │   └── user
│   │       ├── __tests__
│   │       │   ├── userRouter.test.ts
│   │       │   └── userService.test.ts
│   │       ├── userController.ts
│   │       ├── userModel.ts
│   │       ├── userRepository.ts
│   │       ├── userRouter.ts
│   │       └── userService.ts
│   ├── api-docs
│   │   ├── __tests__
│   │   │   └── openAPIRouter.test.ts
│   │   ├── openAPIDocumentGenerator.ts
│   │   ├── openAPIResponseBuilders.ts
│   │   └── openAPIRouter.ts
│   ├── common
│   │   ├── __tests__
│   │   │   ├── errorHandler.test.ts
│   │   │   └── requestLogger.test.ts
│   │   ├── middleware
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── requestLogger.ts
│   │   ├── models
│   │   │   └── serviceResponse.ts
│   │   └── utils
│   │       ├── commonValidation.ts
│   │       ├── envConfig.ts
│   │       └── httpHandlers.ts
│   ├── index.ts
│   └── server.ts
├── tsconfig.json
└── vite.config.mts
```
