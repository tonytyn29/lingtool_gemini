#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 LingTool 项目设置脚本');
console.log('========================');

// 检查Node.js版本
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ 错误: 需要 Node.js 16.0.0 或更高版本');
  console.error(`   当前版本: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js 版本检查通过: ${nodeVersion}`);

// 检查npm版本
const { execSync } = require('child_process');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm 版本: ${npmVersion}`);
} catch (error) {
  console.error('❌ 无法获取npm版本');
  process.exit(1);
}

// 创建环境配置文件
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ 已创建 .env 配置文件');
  } catch (error) {
    console.log('⚠️  无法创建 .env 文件，请手动复制 .env.example 为 .env');
  }
}

// 检查依赖是否已安装
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 正在安装依赖...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ 依赖安装完成');
  } catch (error) {
    console.error('❌ 依赖安装失败');
    process.exit(1);
  }
} else {
  console.log('✅ 依赖已安装');
}

// 创建必要的目录
const directories = [
  'src/data',
  'src/config',
  'src/types',
  'public/images',
  'build'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 已创建目录: ${dir}`);
  }
});

console.log('\n🎉 设置完成！');
console.log('\n📋 下一步:');
console.log('1. 运行 npm start 启动开发服务器');
console.log('2. 在浏览器中打开 http://localhost:3000');
console.log('3. 使用任意用户名密码登录（演示版本）');
console.log('4. 设置您的语言偏好');
console.log('5. 开始使用 LingTool！');
console.log('\n📚 更多信息请查看 README.md');
