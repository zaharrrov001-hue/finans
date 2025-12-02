import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Оптимизация для production
  output: 'standalone',
  
  // Оптимизация изображений
  images: {
    unoptimized: true,
  },
  
  // Отключаем строгий режим в production для стабильности
  reactStrictMode: false,
  
  // Настройки для Vercel/другого хостинга
  experimental: {
    // Оптимизация бандла
  },
};

export default nextConfig;
