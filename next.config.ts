import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Для Vercel не нужен standalone output
  // output: 'standalone', // Только для собственных серверов
  
  // Оптимизация изображений
  images: {
    unoptimized: true,
  },
  
  // Отключаем строгий режим в production для стабильности
  reactStrictMode: false,
};

export default nextConfig;
