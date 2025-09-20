const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ant-design/x', '@ant-design/pro-components'],
  env: {
    CONFIG_ROOT: process.env.CONFIG_ROOT || './config',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  },
  webpack: (config, { isServer }) => {
    // 支持读取config目录下的JSON文件
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // 性能优化配置
    if (!isServer) {
      // 代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          antd: {
            test: /[\\/]node_modules[\\/](@ant-design|antd)[\\/]/,
            name: 'antd',
            priority: 20,
            chunks: 'all',
          },
          langchain: {
            test: /[\\/]node_modules[\\/](@langchain|langchain)[\\/]/,
            name: 'langchain',
            priority: 15,
            chunks: 'all',
          },
          reactflow: {
            test: /[\\/]node_modules[\\/](@xyflow|reactflow)[\\/]/,
            name: 'reactflow',
            priority: 10,
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
  // 性能优化选项
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // 图片优化
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
