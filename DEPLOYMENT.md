# LingTool 部署指南

本文档介绍如何部署 LingTool 多语言学习平台。

## 部署方式

### 1. 静态文件部署

#### 构建项目
```bash
npm run build
```

构建完成后，`build` 目录包含所有静态文件。

#### 部署到 Web 服务器

**Nginx 配置示例:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/lingtool/build;
    index index.html;

    # 处理 React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**Apache 配置示例:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/lingtool/build

    # 处理 React Router
    <Directory "/path/to/lingtool/build">
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # 静态资源缓存
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
    </LocationMatch>
</VirtualHost>
```

### 2. Docker 部署

#### 创建 Dockerfile
```dockerfile
# 构建阶段
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 创建 nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### 构建和运行
```bash
# 构建镜像
docker build -t lingtool .

# 运行容器
docker run -p 80:80 lingtool
```

### 3. 云平台部署

#### Vercel 部署
1. 连接 GitHub 仓库到 Vercel
2. 设置构建命令: `npm run build`
3. 设置输出目录: `build`
4. 部署

#### Netlify 部署
1. 连接 GitHub 仓库到 Netlify
2. 设置构建命令: `npm run build`
3. 设置发布目录: `build`
4. 添加重定向规则: `/* /index.html 200`
5. 部署

#### AWS S3 + CloudFront
1. 构建项目: `npm run build`
2. 上传 `build` 目录到 S3
3. 配置 CloudFront 分发
4. 设置错误页面重定向到 `index.html`

## 环境配置

### 生产环境变量
创建 `.env.production` 文件:
```env
REACT_APP_API_BASE_URL=https://your-api-domain.com
REACT_APP_AI_ENDPOINT=your-preferred-endpoint
REACT_APP_DEBUG=false
REACT_APP_ENABLE_ANALYTICS=true
```

### 构建优化
```bash
# 分析构建包大小
npm install --save-dev webpack-bundle-analyzer
npm run build
npx webpack-bundle-analyzer build/static/js/*.js

# 生产构建
npm run build
```

## 性能优化

### 1. 代码分割
项目已配置 React.lazy 进行代码分割:
```typescript
const LazyComponent = React.lazy(() => import('./Component'));
```

### 2. 资源优化
- 图片压缩和 WebP 格式
- CSS 和 JS 文件压缩
- 启用 Gzip/Brotli 压缩

### 3. 缓存策略
- 静态资源长期缓存
- API 响应适当缓存
- Service Worker 离线缓存

## 监控和日志

### 1. 错误监控
集成 Sentry 进行错误监控:
```bash
npm install @sentry/react @sentry/tracing
```

### 2. 性能监控
使用 Web Vitals 监控性能:
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 3. 访问统计
集成 Google Analytics 或百度统计。

## 安全配置

### 1. HTTPS
确保生产环境使用 HTTPS:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... 其他配置
}
```

### 2. 安全头
添加安全响应头:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 3. CSP 策略
配置内容安全策略:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## 备份和恢复

### 1. 数据备份
定期备份用户数据:
```bash
# 备份 localStorage 数据
# 实现数据导出功能
```

### 2. 配置备份
备份重要配置文件:
- nginx.conf
- .env 文件
- SSL 证书

## 故障排除

### 1. 常见问题
- **白屏问题**: 检查控制台错误，通常是路由配置问题
- **API 调用失败**: 检查 CORS 配置和 API 地址
- **构建失败**: 检查 Node.js 版本和依赖

### 2. 日志查看
```bash
# Nginx 日志
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Docker 日志
docker logs -f container-name
```

### 3. 性能调试
使用浏览器开发者工具:
- Network 面板检查资源加载
- Performance 面板分析性能
- Lighthouse 进行性能审计

## 更新和维护

### 1. 版本更新
```bash
# 更新依赖
npm update

# 重新构建
npm run build

# 重启服务
systemctl restart nginx
```

### 2. 监控检查
- 定期检查服务器资源使用
- 监控应用性能和错误率
- 检查 SSL 证书有效期

### 3. 数据清理
定期清理:
- 临时文件
- 日志文件
- 缓存数据

## 联系支持

如遇到部署问题，请:
1. 查看本文档的故障排除部分
2. 检查项目的 Issues 页面
3. 联系技术支持团队
