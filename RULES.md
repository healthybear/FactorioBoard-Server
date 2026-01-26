# FactorioBoard 项目规则

## 项目概述
这是一个基于 Express.js 5.x + TypeScript 的后端项目，采用分层架构设计。

## 技术栈
- **运行时**: Node.js (ESNext)
- **框架**: Express.js 5.x
- **语言**: TypeScript 5.x (严格模式)
- **验证**: Zod
- **API 文档**: Swagger UI + @asteasolutions/zod-to-openapi
- **日志**: Pino + pino-http
- **测试**: Vitest + Supertest
- **代码格式化**: Biome
- **包管理器**: pnpm

## 代码风格规范

### 格式化
- 行宽限制: 120 字符
- 使用制表符缩进
- 字符串使用双引号
- 启用 bracket spacing

### TypeScript
- 启用严格模式 (`strict: true`)
- 使用 ESNext 模块系统
- 使用路径别名 `@/` 代替相对路径（映射到 `src/` 目录）
- 类型导入使用 `type` 关键字：`import type { Request } from "express"`

### 命名约定
- **文件名**: camelCase（如 `userService.ts`、`userRouter.ts`）
- **类名**: PascalCase（如 `UserService`、`UserController`）
- **单例实例**: camelCase（如 `export const userService = new UserService()`）
- **Schema**: PascalCase + Schema 后缀（如 `UserSchema`、`GetUserSchema`）
- **路由**: kebab-case URL 路径（如 `/health-check`、`/users`）

## 架构模式

### 分层架构
遵循 Router → Controller → Service → Repository 的分层结构：

1. **Router** (`*Router.ts`):
   - 定义路由和 OpenAPI 文档
   - 使用 `OpenAPIRegistry` 注册 API 文档
   - 应用请求验证中间件

2. **Controller** (`*Controller.ts`):
   - 处理 HTTP 请求和响应
   - 调用 Service 层获取数据
   - 使用类的方式定义，导出单例实例

3. **Service** (`*Service.ts`):
   - 包含业务逻辑
   - 返回 `ServiceResponse` 统一响应格式
   - 处理异常并记录日志

4. **Repository** (`*Repository.ts`):
   - 数据访问层
   - 与数据库或数据源交互

### 文件夹结构
```
src/
├── api/                    # API 模块（按功能分组）
│   └── [feature]/          # 功能模块
│       ├── __tests__/      # 测试文件
│       ├── [feature]Router.ts
│       ├── [feature]Controller.ts
│       ├── [feature]Service.ts
│       ├── [feature]Repository.ts
│       └── [feature]Model.ts
├── api-docs/               # Swagger/OpenAPI 配置
├── common/                 # 通用模块
│   ├── middleware/         # 中间件
│   ├── models/             # 通用模型
│   └── utils/              # 工具函数
├── index.ts                # 应用入口
└── server.ts               # Express 应用配置
```

## 统一响应格式

所有 API 响应必须使用 `ServiceResponse` 类：

```typescript
// 成功响应
ServiceResponse.success<T>(message: string, responseObject: T, statusCode?: number)

// 失败响应
ServiceResponse.failure<T>(message: string, responseObject: T, statusCode?: number)
```

响应结构:
```typescript
{
  success: boolean;
  message: string;
  responseObject: T;
  statusCode: number;
}
```

## 验证规范

### 请求验证
使用 Zod Schema 定义请求验证：

```typescript
// 模型定义
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  // ...
});
export type User = z.infer<typeof UserSchema>;

// 请求参数验证
export const GetUserSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});
```

### 环境变量验证
使用 Zod 验证环境变量，在 `envConfig.ts` 中定义 Schema。

## API 文档规范

使用 `@asteasolutions/zod-to-openapi` 生成 OpenAPI 文档：

```typescript
// 注册 Schema
userRegistry.register("User", UserSchema);

// 注册路由
userRegistry.registerPath({
  method: "get",
  path: "/users",
  tags: ["User"],
  responses: createApiResponse(z.array(UserSchema), "Success"),
});
```

## 导入顺序

1. 外部依赖（node_modules）
2. 使用 `@/` 路径别名的内部模块
3. 相对路径导入（仅在同一模块内使用）

```typescript
// 外部依赖
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

// 内部模块（使用 @/ 别名）
import type { User } from "@/api/user/userModel";
import { ServiceResponse } from "@/common/models/serviceResponse";

// 相对路径（同模块内）
import { userController } from "./userController";
```

## 错误处理

- Service 层捕获异常并返回适当的 `ServiceResponse`
- 使用 `logger.error()` 记录错误信息
- 使用 `http-status-codes` 包的状态码常量

## 测试规范

- 测试文件放在 `__tests__/` 目录下
- 测试文件命名：`[filename].test.ts`
- 使用 Vitest 作为测试框架
- 使用 Supertest 进行 HTTP 端点测试

## 常用命令

- `pnpm start:dev` - 开发模式运行
- `pnpm build` - 构建项目
- `pnpm start:prod` - 生产模式运行
- `pnpm check` - Biome 代码检查和修复
- `pnpm test` - 运行测试
- `pnpm test:cov` - 运行测试并生成覆盖率报告
