# 简单微博 - 私密分享系统

## 📌 项目介绍

一个**极简风格的私密微博系统**，专注于好友间的私密分享，所有内容24小时后自动销毁。

### 核心功能
- ✅ 极简用户系统 - 仅用户名和密码，无邮箱验证
- ✅ 好友关系管理 - 双向确认机制（发送请求→对方确认）
- ✅ 私密留言板 - 仅互相添加的好友可见彼此内容
- ✅ 文本留言 - 支持简单格式化，每条留言独立存在
- ✅ 自动销毁 - 24小时后自动删除所有留言
- ✅ 服务器加密 - 留言内容在服务器端加密存储
- ✅ 链接分享 - 可分享个人留言板链接（仅好友可访问）

### 技术特点
- **前端**：原生HTML/CSS/JS单页面应用
- **后端**：Node.js + Express + SQLite（单文件数据库）
- **加密**：服务器端AES加密存储
- **架构**：模块化设计，易于部署和维护
- **无外部依赖**：不依赖第三方服务，降低部署复杂度

## 🚀 快速开始

### 1. 环境要求
- Node.js 12.0 或更高版本

### 2. 安装依赖

```bash
# 克隆项目后进入目录
cd simple-weibo

# 安装依赖
npm install
```

### 3. 运行项目

```bash
# 启动开发服务器
npm start

# 或使用
node server.js
```

### 4. 访问系统

打开浏览器访问：`http://localhost:3000`

## 🔧 部署方案

### 方案一：传统部署

1. 在服务器上安装Node.js
2. 上传项目文件到服务器
3. 安装依赖并启动服务

```bash
# 安装依赖
npm install

# 启动服务（可使用PM2等进程管理工具）
npm start
```

### 方案二：Docker部署

#### 1. 构建Docker镜像

```bash
# 构建镜像
docker build -t simple-weibo .

# 运行容器
docker run -d -p 3000:3000 --name simple-weibo simple-weibo
```

#### 2. 使用Docker Compose（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: '3'
services:
  simple-weibo:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./database.db:/app/database.db
    restart: always
```

启动服务：

```bash
docker-compose up -d
```

### 方案三：一键部署

#### 支持的平台：
- [Glitch](https://glitch.com/)
- [Vercel](https://vercel.com/)
- [Heroku](https://www.heroku.com/)

#### 部署步骤：
1. 登录对应平台
2. 选择「从Git仓库部署」
3. 输入项目仓库地址
4. 等待部署完成
5. 访问生成的URL

## 📁 项目结构

```
simple-weibo/
├── server.js          # 后端服务入口
├── package.json       # 项目配置和依赖
├── database.db        # SQLite数据库文件（自动生成）
├── public/            # 前端静态文件
│   └── index.html     # 前端单页面应用
├── README.md          # 项目文档
├── Dockerfile         # Docker构建文件
└── .dockerignore      # Docker忽略文件
```

## 🎯 核心API

### 用户系统
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 好友管理
- `POST /api/friends/request` - 发送好友请求
- `POST /api/friends/accept` - 接受好友请求
- `POST /api/friends/reject` - 拒绝好友请求
- `GET /api/friends/requests/:userId` - 获取好友请求列表
- `GET /api/friends/:userId` - 获取好友列表

### 留言管理
- `POST /api/posts` - 创建留言
- `GET /api/posts/:userId` - 获取用户的留言
- `GET /api/friends/posts/:userId` - 获取好友的留言

### 系统
- `GET /api/health` - 健康检查

## ⚙️ 配置说明

### 环境变量（可选）

| 变量名 | 默认值 | 描述 |
|-------|-------|------|
| PORT | 3000 | 服务器端口 |
| ENCRYPTION_KEY | simple-weibo-secret-key | 加密密钥（实际部署时应修改） |

### 安全建议

1. **修改加密密钥**：在生产环境中，应修改 `server.js` 中的 `encryptionKey` 值
2. **使用HTTPS**：在生产环境中，建议配置HTTPS
3. **数据库备份**：定期备份 `database.db` 文件
4. **限制访问**：可通过Nginx等反向代理限制访问

## 📱 用户界面

### 主要页面
1. **登录/注册** - 用户认证
2. **我的微博** - 发布和查看自己的留言
3. **好友管理** - 添加好友和查看好友列表
4. **好友请求** - 处理收到的好友请求

### 界面特点
- 极简设计，移动端优先
- 清晰的视觉层次和操作流程
- 响应式布局，适配不同屏幕尺寸

## 🎨 自定义

### 修改前端样式

编辑 `public/index.html` 文件中的 `<style>` 标签，可自定义颜色、字体和布局。

### 修改后端配置

编辑 `server.js` 文件，可修改：
- 服务器端口
- 加密密钥
- 数据库路径
- 清理过期留言的时间间隔

## 🔒 安全特性

- **服务器端加密**：留言内容在服务器端使用AES加密存储
- **自动销毁**：所有留言24小时后自动删除
- **好友验证**：只有互相添加为好友的用户才能查看彼此的留言
- **无外部依赖**：不依赖第三方服务，减少安全风险

## 📊 性能优化

- **轻量级架构**：使用SQLite单文件数据库，减少资源占用
- **高效加密**：采用AES-256-CBC加密算法，平衡安全性和性能
- **定时清理**：后台定时清理过期数据，保持数据库小巧
- **前端优化**：原生HTML/CSS/JS，无框架依赖，加载速度快

## 🐛 常见问题

### 1. 服务启动失败

- 检查Node.js版本是否满足要求
- 检查端口是否被占用
- 查看控制台错误信息

### 2. 数据库连接错误

- 确保有写入权限创建 `database.db` 文件
- 检查文件系统权限

### 3. 留言不显示

- 检查好友关系是否已确认
- 确认留言是否已超过24小时（自动销毁）

### 4. 加密解密失败

- 确保加密密钥一致
- 检查留言内容是否包含特殊字符

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📞 联系

如有问题或建议，欢迎联系项目维护者。

---

**简单微博** - 让分享更私密，让沟通更纯粹。