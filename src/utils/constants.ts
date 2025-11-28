// 应用常量定义

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', name: '中文（简体）', native: '中文' },
  { code: 'zh-TW', name: '中文（繁体）', native: '中文' },
  { code: 'en-US', name: 'English (US)', native: '英语' },
  { code: 'en-GB', name: 'English (UK)', native: '英语' },
  { code: 'ja-JP', name: '日本語', native: '日语' },
  { code: 'ko-KR', name: '한국어', native: '韩语' },
  { code: 'fr-FR', name: 'Français', native: '法语' },
  { code: 'de-DE', name: 'Deutsch', native: '德语' },
  { code: 'es-ES', name: 'Español', native: '西班牙语' },
  { code: 'it-IT', name: 'Italiano', native: '意大利语' },
  { code: 'pt-PT', name: 'Português', native: '葡萄牙语' },
  { code: 'ru-RU', name: 'Русский', native: '俄语' },
  { code: 'ar-SA', name: 'العربية', native: '阿拉伯语' },
  { code: 'hi-IN', name: 'हिन्दी', native: '印地语' },
  { code: 'th-TH', name: 'ไทย', native: '泰语' },
  { code: 'vi-VN', name: 'Tiếng Việt', native: '越南语' }
];

// 文件类型
export const FILE_TYPES = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'epub', label: 'EPUB', icon: '📚' },
  { value: 'txt', label: 'TXT', icon: '📝' },
  { value: 'mobi', label: 'MOBI', icon: '📖' }
];

// 句子来源类型
export const SOURCE_TYPES = [
  { value: 'manual', label: '手动输入', icon: '✍️' },
  { value: 'book', label: '书籍', icon: '📚' },
  { value: 'clipboard', label: '剪贴板', icon: '📋' },
  { value: 'import', label: '导入', icon: '📥' }
];

// 学习类型
export const LEARNING_TYPES = [
  { value: 'sentence_translation', label: '句子翻译', icon: '🔄' },
  { value: 'word_learning', label: '单词学习', icon: '📝' },
  { value: 'pronunciation', label: '发音练习', icon: '🎵' }
];

// 熟悉度等级
export const FAMILIARITY_LEVELS = [
  { value: 'unfamiliar', label: '不熟悉', color: 'error', icon: '❌' },
  { value: 'familiar', label: '熟悉', color: 'processing', icon: '✅' },
  { value: 'mastered', label: '已掌握', color: 'success', icon: '⭐' }
];

// 笔记类型
export const NOTE_TYPES = [
  { value: 'highlight', label: '高亮', color: 'yellow', icon: '🖍️' },
  { value: 'translation', label: '翻译', color: 'blue', icon: '🔄' },
  { value: 'query', label: '疑问', color: 'orange', icon: '❓' },
  { value: 'learning', label: '学习', color: 'green', icon: '📚' }
];

// 总结类型
export const SUMMARY_TYPES = [
  { value: 'chapter', label: '章节总结', color: 'blue', icon: '📄' },
  { value: 'book', label: '书籍总结', color: 'green', icon: '📚' },
  { value: 'suggestion', label: '学习建议', color: 'orange', icon: '💡' }
];

// 翻译类型
export const TRANSLATION_TYPES = [
  { value: 'native', label: '母语翻译', icon: '🏠' },
  { value: 'target', label: '目标语言翻译', icon: '🎯' },
  { value: 'learning', label: '学习语言翻译', icon: '📖' }
];

// 应用配置
export const APP_CONFIG = {
  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: ['10', '20', '50', '100']
  },
  
  // 学习配置
  LEARNING: {
    MAX_DAILY_REVIEWS: 100,
    MIN_REVIEW_INTERVAL: 1, // 天
    MAX_REVIEW_INTERVAL: 365, // 天
    DEFAULT_EASE_FACTOR: 2.5,
    MIN_EASE_FACTOR: 1.3,
    MAX_EASE_FACTOR: 3.0
  },
  
  // 文件上传配置
  UPLOAD: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_EXTENSIONS: ['.pdf', '.epub', '.txt', '.mobi'],
    MAX_FILES: 10
  },
  
  // 搜索配置
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    MAX_RESULTS: 100,
    DEBOUNCE_DELAY: 300 // ms
  },
  
  // 缓存配置
  CACHE: {
    SENTENCE_CACHE_TTL: 24 * 60 * 60 * 1000, // 24小时
    BOOK_CACHE_TTL: 7 * 24 * 60 * 60 * 1000, // 7天
    AI_RESPONSE_CACHE_TTL: 60 * 60 * 1000 // 1小时
  }
};

// 主题配置
export const THEME_CONFIG = {
  PRIMARY_COLOR: '#1890ff',
  SUCCESS_COLOR: '#52c41a',
  WARNING_COLOR: '#faad14',
  ERROR_COLOR: '#ff4d4f',
  INFO_COLOR: '#1890ff',
  
  // 渐变色
  GRADIENTS: {
    PRIMARY: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    SUCCESS: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    WARNING: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    ERROR: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    INFO: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  }
};

// 路由配置
export const ROUTES = {
  LOGIN: '/login',
  LANGUAGE_SETTINGS: '/language-settings',
  LANGUAGE_LEARNING: '/language-learning',
  SENTENCE_IMPORT: '/sentence-import',
  SENTENCE_MANAGEMENT: '/sentence-management',
  BOOKSHELF: '/bookshelf',
  BOOK_READER: '/book-reader',
  BOOK_SUMMARIZER: '/book-summarizer'
};

// 本地存储键名
export const STORAGE_KEYS = {
  AUTH: 'auth-storage',
  SENTENCES: 'sentence-storage',
  BOOKS: 'book-storage',
  SETTINGS: 'app-settings',
  THEME: 'app-theme',
  LANGUAGE: 'app-language'
};

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  AUTH_FAILED: '认证失败，请重新登录',
  PERMISSION_DENIED: '权限不足，无法执行此操作',
  FILE_TOO_LARGE: '文件过大，请选择小于50MB的文件',
  INVALID_FILE_TYPE: '不支持的文件类型',
  AI_SERVICE_ERROR: 'AI服务暂时不可用，请稍后重试',
  DATA_NOT_FOUND: '数据不存在',
  OPERATION_FAILED: '操作失败，请重试'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  LOGOUT_SUCCESS: '退出成功',
  SAVE_SUCCESS: '保存成功',
  DELETE_SUCCESS: '删除成功',
  IMPORT_SUCCESS: '导入成功',
  EXPORT_SUCCESS: '导出成功',
  UPLOAD_SUCCESS: '上传成功',
  AI_GENERATE_SUCCESS: 'AI生成成功'
};

// 验证规则
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 50
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  SENTENCE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000
  },
  BOOK_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  }
};

// 默认值
export const DEFAULT_VALUES = {
  USER: {
    NATIVE_LANGUAGE: 'zh-CN',
    TARGET_LANGUAGE: 'en-US',
    LEARNING_LANGUAGES: []
  },
  SENTENCE: {
    SOURCE_TYPE: 'manual',
    LANGUAGE_CODE: 'en-US'
  },
  BOOK: {
    FILE_TYPE: 'pdf',
    CURRENT_PAGE: 0,
    READING_PROGRESS: 0,
    TOTAL_READING_TIME: 0
  },
  LEARNING_RECORD: {
    FAMILIARITY_LEVEL: 'unfamiliar',
    REVIEW_COUNT: 0,
    EASE_FACTOR: 2.5,
    INTERVAL_DAYS: 1
  }
};
