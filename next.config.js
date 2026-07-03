/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel Serverless 优化
  output: 'standalone',
  // 环境变量白名单（仅暴露给前端的变量）
  env: {
    NEXT_PUBLIC_APP_NAME: '思政题库刷题',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
};

module.exports = nextConfig;
