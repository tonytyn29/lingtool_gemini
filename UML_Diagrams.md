# LingTool 项目 UML 图集

## 1. 类图 (Class Diagram)

```mermaid
classDiagram
    class Book {
        +string id
        +string title
        +string author
        +string languageCode
        +string fileType
        +number totalPages
        +number currentPage
        +number readingProgress
        +number totalReadingTime
        +Date lastReadAt
        +string[] contentPages
        +string fileDataUrl
        +Chapter[] chapters
    }

    class Chapter {
        +string id
        +string title
        +number page
    }

    class Sentence {
        +string id
        +string originalText
        +string translatedText
        +string languageCode
        +string[] words
        +number difficulty
        +Date createdAt
        +Date lastReviewed
        +number reviewCount
        +number correctCount
    }

    class Word {
        +string wordText
        +string pronunciation
        +string meaning
        +string partOfSpeech
    }

    class User {
        +string id
        +string username
        +string email
        +string nativeLanguage
        +string[] learningLanguages
        +Date createdAt
    }

    class BookStore {
        +Book[] books
        +addBook(bookData) Book
        +updateBook(id, updates) void
        +deleteBook(id) void
        +getBook(id) Book
        +getRecentBooks() Book[]
    }

    class SentenceStore {
        +Sentence[] sentences
        +addSentence(sentence) Sentence
        +updateSentence(id, updates) void
        +deleteSentence(id) void
        +getSentences() Sentence[]
        +getSentencesByLanguage(lang) Sentence[]
    }

    class AuthStore {
        +User user
        +boolean isAuthenticated
        +login(credentials) void
        +logout() void
        +updateUser(updates) void
    }

    class AIService {
        -string[] endpoints
        -boolean debug
        +translateText(text, targetLang) string
        +summarizeText(text) string
        +generateQuestions(text) Question[]
        +analyzeDifficulty(text) number
    }

    class BookParser {
        +parseTxt(file) ParsedBook
        +parsePdf(file) ParsedBook
        +parseEpub(file) ParsedBook
        +parseBookByType(file, type) ParsedBook
    }

    Book ||--o{ Chapter : contains
    BookStore ||--o{ Book : manages
    SentenceStore ||--o{ Sentence : manages
    Sentence ||--o{ Word : contains
    AIService ..> Sentence : processes
    BookParser ..> Book : creates
```

## 2. 组件图 (Component Diagram)

```mermaid
graph TB
    subgraph "前端 React 应用"
        A[App.tsx] --> B[路由系统]
        B --> C[页面组件]
        C --> D[UI组件]
        C --> E[状态管理]
    end

    subgraph "页面组件"
        C1[BookShelfPage] --> C2[BookReaderPage]
        C1 --> C3[LanguageLearningPage]
        C1 --> C4[SentenceImportPage]
        C1 --> C5[SentenceManagementPage]
        C1 --> C6[BookSummarizerPage]
        C1 --> C7[LanguageSettingsPage]
        C1 --> C8[LoginPage]
    end

    subgraph "状态管理 (Zustand)"
        E1[BookStore] --> E2[SentenceStore]
        E2 --> E3[AuthStore]
    end

    subgraph "工具服务"
        F1[BookParser] --> F2[AIService]
        F2 --> F3[MemoryCurve]
        F3 --> F4[Helpers]
    end

    subgraph "外部服务"
        G1[AI API] --> G2[PDF.js CDN]
        G2 --> G3[JSZip CDN]
    end

    C --> E1
    C --> F1
    F1 --> G1
```

## 3. 用例图 (Use Case Diagram)

```mermaid
graph TB
    User[用户] --> UC1[导入书籍]
    User --> UC2[阅读书籍]
    User --> UC3[翻译文本]
    User --> UC4[导入句子]
    User --> UC5[学习复习]
    User --> UC6[管理句子]
    User --> UC7[书籍摘要]
    User --> UC8[语言设置]
    User --> UC9[用户登录]

    UC1 --> UC1a[上传文件]
    UC1 --> UC1b[选择格式]
    UC1 --> UC1c[解析内容]

    UC2 --> UC2a[翻页阅读]
    UC2 --> UC2b[选择文本]
    UC2 --> UC2c[查看翻译]

    UC5 --> UC5a[记忆曲线复习]
    UC5 --> UC5b[难度调整]
    UC5 --> UC5c[进度跟踪]

    UC7 --> UC7a[AI摘要生成]
    UC7 --> UC7b[关键信息提取]
```

## 4. 序列图 (Sequence Diagram) - 书籍导入流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant BS as BookShelfPage
    participant BP as BookParser
    participant AI as AIService
    participant Store as BookStore

    U->>BS: 选择文件并上传
    BS->>BP: parseBookByType(file, type)
    
    alt TXT文件
        BP->>BP: parseTxt(file)
    else PDF文件
        BP->>BP: parsePdf(file)
    else EPUB文件
        BP->>BP: parseEpub(file)
    end
    
    BP-->>BS: 返回解析结果
    BS->>Store: addBook(bookData)
    Store-->>BS: 书籍添加成功
    BS-->>U: 显示成功消息
```

## 5. 状态图 (State Diagram) - 应用状态

```mermaid
stateDiagram-v2
    [*] --> 未登录
    未登录 --> 登录中: 用户输入凭据
    登录中 --> 已登录: 登录成功
    登录中 --> 未登录: 登录失败
    
    已登录 --> 书架页面: 进入应用
    书架页面 --> 阅读页面: 选择书籍
    书架页面 --> 学习页面: 开始学习
    书架页面 --> 设置页面: 打开设置
    
    阅读页面 --> 翻译模式: 启用翻译
    翻译模式 --> 阅读页面: 关闭翻译
    阅读页面 --> 书架页面: 返回书架
    
    学习页面 --> 复习模式: 开始复习
    复习模式 --> 学习页面: 完成复习
    学习页面 --> 书架页面: 返回书架
```

## 6. 活动图 (Activity Diagram) - 学习流程

```mermaid
flowchart TD
    A[开始学习] --> B[选择学习语言]
    B --> C[导入句子或选择书籍]
    C --> D{学习模式}
    
    D -->|句子学习| E[显示句子]
    D -->|书籍学习| F[选择文本]
    
    E --> G[用户输入翻译]
    F --> H[点击翻译按钮]
    
    G --> I[AI验证答案]
    H --> I
    
    I --> J{答案正确?}
    J -->|是| K[增加正确次数]
    J -->|否| L[显示正确答案]
    
    K --> M[更新记忆曲线]
    L --> M
    
    M --> N{继续学习?}
    N -->|是| E
    N -->|否| O[保存学习进度]
    
    O --> P[结束学习]
```

## 7. 部署图 (Deployment Diagram)

```mermaid
graph TB
    subgraph "客户端浏览器"
        A[React应用] --> B[本地存储]
        A --> C[PDF.js库]
        A --> D[JSZip库]
    end
    
    subgraph "外部服务"
        E[AI翻译API] --> F[OpenAI API]
        E --> G[其他AI服务]
    end
    
    subgraph "CDN服务"
        H[PDF.js CDN] --> I[JSZip CDN]
    end
    
    A --> E
    A --> H
    A --> I
```

## 8. 按数据流的上下文图 (Context Diagram by Data Flow)

### Mermaid 版本
```mermaid
graph TB
    %% 外部实体
    User[👤 用户]
    FileSystem[📁 文件系统]
    AIProvider[🤖 AI服务提供商]
    Browser[🌐 浏览器存储]
    
    %% 系统边界
    subgraph LingTool["📚 LingTool 阅读工具"]
        direction TB
        
        %% 核心功能模块
        subgraph Core["核心功能"]
            BookParser[📖 书籍解析器]
            BookReader[📄 阅读器]
            BookSummarizer[📝 总结器]
            BookShelf[📚 书架管理]
        end
        
        %% 数据存储
        subgraph Storage["数据存储"]
            BookStore[📦 书籍存储]
            AuthStore[🔐 认证存储]
            ContentStorage[💾 内容存储]
        end
        
        %% 服务层
        subgraph Services["服务层"]
            AIService[🤖 AI服务]
            TranslationService[🌍 翻译服务]
        end
    end
    
    %% 数据流连接
    User -->|上传书籍文件| BookParser
    User -->|阅读操作| BookReader
    User -->|生成总结| BookSummarizer
    User -->|管理书籍| BookShelf
    
    FileSystem -->|读取文件| BookParser
    BookParser -->|解析结果| BookStore
    BookStore -->|书籍数据| BookReader
    BookStore -->|书籍数据| BookSummarizer
    BookStore -->|书籍列表| BookShelf
    
    BookReader -->|阅读进度| BookStore
    BookSummarizer -->|总结结果| BookStore
    
    AIService -->|API调用| AIProvider
    BookSummarizer -->|请求总结| AIService
    BookReader -->|请求翻译| TranslationService
    TranslationService -->|API调用| AIProvider
    
    BookStore -->|持久化| Browser
    AuthStore -->|持久化| Browser
    ContentStorage -->|持久化| Browser
    
    Browser -->|恢复数据| BookStore
    Browser -->|恢复数据| AuthStore
    Browser -->|恢复数据| ContentStorage
    
    %% 数据流标签
    User -.->|"书籍文件<br/>(EPUB/PDF/TXT)"| BookParser
    BookParser -.->|"解析数据<br/>(content, chapters, fileIndex, anchorIndex)"| BookStore
    BookStore -.->|"书籍元数据<br/>(title, author, chapters)"| BookReader
    BookStore -.->|"章节内容<br/>(text, pageOffsets)"| BookSummarizer
    BookSummarizer -.->|"总结请求<br/>(chapterText, prompt)"| AIService
    AIService -.->|"AI响应<br/>(summary, translation)"| BookSummarizer
    BookReader -.->|"阅读状态<br/>(currentPage, progress)"| BookStore
    BookStore -.->|"存储数据<br/>(JSON, localStorage)"| Browser
```

### PlantUML 版本
```plantuml
@startuml LingTool_Context_Diagram
!theme plain
skinparam backgroundColor #FFFFFF
skinparam defaultFontName Arial
skinparam defaultFontSize 10

title LingTool 按数据流的上下文图

' 外部实体
actor "用户" as User
database "文件系统" as FileSystem
cloud "AI服务提供商" as AIProvider
database "浏览器存储" as Browser

' 系统边界
package "LingTool 阅读工具" {
    
    ' 核心功能模块
    package "核心功能" {
        component "书籍解析器" as BookParser
        component "阅读器" as BookReader
        component "总结器" as BookSummarizer
        component "书架管理" as BookShelf
    }
    
    ' 数据存储
    package "数据存储" {
        component "书籍存储" as BookStore
        component "认证存储" as AuthStore
        component "内容存储" as ContentStorage
    }
    
    ' 服务层
    package "服务层" {
        component "AI服务" as AIService
        component "翻译服务" as TranslationService
    }
}

' 数据流连接
User --> BookParser : 上传书籍文件
User --> BookReader : 阅读操作
User --> BookSummarizer : 生成总结
User --> BookShelf : 管理书籍

FileSystem --> BookParser : 读取文件
BookParser --> BookStore : 解析结果
BookStore --> BookReader : 书籍数据
BookStore --> BookSummarizer : 书籍数据
BookStore --> BookShelf : 书籍列表

BookReader --> BookStore : 阅读进度
BookSummarizer --> BookStore : 总结结果

AIService --> AIProvider : API调用
BookSummarizer --> AIService : 请求总结
BookReader --> TranslationService : 请求翻译
TranslationService --> AIProvider : API调用

BookStore --> Browser : 持久化
AuthStore --> Browser : 持久化
ContentStorage --> Browser : 持久化

Browser --> BookStore : 恢复数据
Browser --> AuthStore : 恢复数据
Browser --> ContentStorage : 恢复数据

' 数据流标签
note right of User : 书籍文件\n(EPUB/PDF/TXT)
note right of BookParser : 解析数据\n(content, chapters,\nfileIndex, anchorIndex)
note right of BookStore : 书籍元数据\n(title, author, chapters)
note right of BookSummarizer : 章节内容\n(text, pageOffsets)
note right of AIService : 总结请求\n(chapterText, prompt)
note right of BookReader : 阅读状态\n(currentPage, progress)
note right of Browser : 存储数据\n(JSON, localStorage)

@enduml
```

## 各图的具体用法说明

### 1. 类图 (Class Diagram)
**用途**: 展示系统中所有类的结构、属性和方法，以及类之间的关系
**用法**: 
- 理解数据模型和业务实体
- 设计数据库结构
- 规划API接口
- 代码重构时的参考

### 2. 组件图 (Component Diagram)
**用途**: 展示系统的物理结构和组件之间的依赖关系
**用法**:
- 理解系统架构
- 规划模块划分
- 识别组件间的耦合度
- 指导代码组织

### 3. 用例图 (Use Case Diagram)
**用途**: 从用户角度描述系统功能
**用法**:
- 需求分析和确认
- 功能规划
- 用户故事编写
- 测试用例设计

### 4. 序列图 (Sequence Diagram)
**用途**: 展示对象之间按时间顺序的交互
**用法**:
- 理解业务流程
- 调试复杂交互
- API设计验证
- 性能瓶颈分析

### 5. 状态图 (State Diagram)
**用途**: 展示对象或系统状态的变化
**用法**:
- 理解应用状态管理
- 设计状态机
- 处理复杂状态逻辑
- 用户体验优化

### 6. 活动图 (Activity Diagram)
**用途**: 展示业务流程和算法流程
**用法**:
- 业务流程建模
- 算法设计
- 工作流设计
- 用户操作流程优化

### 7. 部署图 (Deployment Diagram)
**用途**: 展示系统的物理部署结构
**用法**:
- 系统部署规划
- 性能优化
- 安全架构设计
- 运维管理
