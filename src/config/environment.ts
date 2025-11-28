// 环境配置

export const ENV_CONFIG = {
  // API配置
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
  AI_ENDPOINT: process.env.REACT_APP_AI_ENDPOINT || 'laozhang',
  
  // AI服务配置
  AI_TIMEOUT: parseInt(process.env.REACT_APP_AI_TIMEOUT || '30000'),
  AI_MAX_RETRIES: parseInt(process.env.REACT_APP_AI_MAX_RETRIES || '3'),
  
  // 应用配置
  APP_NAME: process.env.REACT_APP_NAME || 'LingTool',
  APP_VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
  
  // 存储配置
  STORAGE_PREFIX: process.env.REACT_APP_STORAGE_PREFIX || 'lingtool_',
  CACHE_TTL: parseInt(process.env.REACT_APP_CACHE_TTL || '86400000'),
  
  // 功能开关
  ENABLE_AI: process.env.REACT_APP_ENABLE_AI !== 'false',
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  ENABLE_OFFLINE_MODE: process.env.REACT_APP_ENABLE_OFFLINE_MODE !== 'false'
};

// 开发环境检查
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// 功能检查
export const isFeatureEnabled = (feature: keyof typeof ENV_CONFIG): boolean => {
  return ENV_CONFIG[feature] === true;
};

// 获取配置值
export const getConfig = (key: keyof typeof ENV_CONFIG): any => {
  return ENV_CONFIG[key];
};
