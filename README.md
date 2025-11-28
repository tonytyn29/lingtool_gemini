# LingTool - 多语言学习平台

一个基于React 5的智能多语言学习工具，集成了语言学习、书籍阅读和AI辅助功能。

## 功能特性

### 🌍 多语言支持
- 支持16种主流语言
- 可设置母语、精通语言和学习语言
- 智能语言识别和切换

### 📚 语言学习模块
- **句子导入**: 支持手动输入、书籍导入、剪贴板等多种方式
- **智能学习**: 基于Anki记忆曲线的间隔重复学习
- **聚焦单词**: 支持单词高亮和发音标注（特别支持日语假名）
- **学习管理**: 完整的句子管理和学习进度跟踪

### 📖 智能书架
- **书籍管理**: 支持PDF、EPUB、TXT、MOBI格式
- **阅读器**: 支持翻页阅读、文本选择、标注功能
- **智能总结**: AI自动生成章节总结和学习建议
- **阅读统计**: 详细的阅读进度和时间统计

### 🤖 AI集成
- **多端点支持**: 集成9个AI API端点，自动故障转移
- **智能翻译**: 支持多语言互译
- **内容总结**: 自动生成书籍章节总结
- **学习建议**: 基于内容的个性化学习建议

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5
- **状态管理**: Zustand
- **路由管理**: React Router 6
- **动画效果**: Framer Motion
- **数据持久化**: LocalStorage
- **构建工具**: Create React App 5

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

应用将在 http://localhost:3000 启动

### 构建生产版本
```bash
npm run build
```

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── AppHeader.tsx   # 应用头部
│   └── AppSider.tsx    # 侧边栏
├── pages/              # 页面组件
│   ├── LoginPage.tsx   # 登录页面
│   ├── LanguageSettingsPage.tsx  # 语言设置
│   ├── LanguageLearningPage.tsx  # 学习复习
│   ├── SentenceImportPage.tsx    # 句子导入
│   ├── SentenceManagementPage.tsx # 句子管理
│   ├── BookShelfPage.tsx         # 书架
│   ├── BookReaderPage.tsx        # 阅读器
│   └── BookSummarizerPage.tsx    # 总结器
├── stores/             # 状态管理
│   ├── authStore.ts    # 用户认证状态
│   ├── sentenceStore.ts # 句子数据状态
│   └── bookStore.ts    # 书籍数据状态
├── utils/              # 工具函数
│   ├── aiService.ts    # AI服务集成
│   ├── memoryCurve.ts  # 记忆曲线算法
│   ├── constants.ts    # 应用常量
│   └── helpers.ts      # 辅助函数
├── types/              # 类型定义
│   └── global.d.ts     # 全局类型声明
├── App.tsx             # 主应用组件
├── App.css             # 应用样式
├── index.tsx           # 应用入口
└── index.css           # 全局样式
```

## 核心功能说明

### 记忆曲线算法
基于Anki的SM-2算法实现间隔重复学习：
- 根据用户反馈调整复习间隔
- 动态调整难度因子
- 智能预测学习进度

### AI服务集成
支持多个AI API端点，自动故障转移：
- 智能翻译服务
- 内容总结生成
- 学习建议提供
- 日语假名标注

### 数据模型
完整的数据模型设计：
- 用户和语言设置
- 句子和翻译管理
- 学习记录跟踪
- 书籍和阅读笔记

## 使用指南

### 1. 首次使用
1. 启动应用后进入登录页面
2. 输入任意用户名密码（演示版本）
3. 设置您的母语、精通语言和学习语言
4. 开始使用各项功能

### 2. 语言学习
1. 在"导入句子"页面添加学习内容
2. 选择聚焦单词和添加翻译
3. 在"学习复习"页面进行卡片式学习
4. 在"句子管理"页面查看学习进度

### 3. 书籍阅读
1. 在"书架"页面添加书籍
2. 点击"阅读"进入阅读器
3. 选择文本进行标注和翻译
4. 使用"总结"功能查看AI生成的总结

## 配置说明

### AI API配置
在 `src/utils/aiService.ts` 中配置AI端点：
```typescript
const AI_ENDPOINTS: AIEndpoint[] = [
  {
    name: 'your-endpoint',
    url: 'https://your-api.com/v1/chat/completions',
    apiKey: 'your-api-key',
    priority: 1
  }
];
```

### 语言配置
在 `src/utils/constants.ts` 中添加新语言：
```typescript
export const SUPPORTED_LANGUAGES = [
  { code: 'new-lang', name: 'New Language', native: 'Native Name' }
];
```

## 开发说明

### 添加新页面
1. 在 `src/pages/` 目录创建新页面组件
2. 在 `src/App.tsx` 中添加路由
3. 在 `src/components/AppSider.tsx` 中添加导航菜单

### 添加新状态
1. 在 `src/stores/` 目录创建新的store
2. 使用Zustand进行状态管理
3. 支持数据持久化

### 样式定制
- 全局样式：`src/index.css`
- 应用样式：`src/App.css`
- 组件样式：使用Ant Design主题定制

## 部署说明

### 构建优化
```bash
npm run build
```

### 环境变量
创建 `.env` 文件配置环境变量：
```
REACT_APP_API_BASE_URL=your-api-url
REACT_APP_AI_ENDPOINT=your-ai-endpoint
```

### 服务器部署
将 `build` 目录部署到Web服务器即可。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交Issue或联系开发者。

---

**注意**: 这是一个演示版本，AI API密钥仅用于开发测试，请在生产环境中使用您自己的API密钥。
