'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Tree,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Tooltip,
  Checkbox,
  Alert,
  Select,
  Upload,
  Progress,
  Empty,
  Spin,
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TreeDataNode } from 'antd/es/tree';
import { cn, formatBytes } from '@/utils';

const { Text, Title } = Typography;
const { Search } = Input;

// 文件类型配置
const FILE_TYPE_CONFIG = {
  code: {
    name: '代码文件',
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala'],
    color: 'blue',
    icon: '📄',
  },
  config: {
    name: '配置文件',
    extensions: ['.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env'],
    color: 'orange',
    icon: '⚙️',
  },
  docs: {
    name: '文档文件',
    extensions: ['.md', '.txt', '.doc', '.docx', '.pdf'],
    color: 'green',
    icon: '📖',
  },
  web: {
    name: 'Web 文件',
    extensions: ['.html', '.css', '.scss', '.less', '.vue'],
    color: 'purple',
    icon: '🌐',
  },
  data: {
    name: '数据文件',
    extensions: ['.csv', '.sql', '.db', '.sqlite'],
    color: 'cyan',
    icon: '💾',
  },
};

// 预设路径模板
const PATH_TEMPLATES = {
  frontend: {
    name: '前端项目',
    description: '包含常见的前端项目结构',
    paths: ['./src', './components', './pages', './styles', './public'],
  },
  backend: {
    name: '后端项目',
    description: '包含常见的后端项目结构',
    paths: ['./src', './api', './controllers', './models', './utils', './config'],
  },
  fullstack: {
    name: '全栈项目',
    description: '包含前后端完整项目结构',
    paths: ['./src', './client', './server', './shared', './docs', './tests'],
  },
  library: {
    name: '库/包项目',
    description: '适用于开源库或工具包项目',
    paths: ['./src', './lib', './docs', './examples', './tests'],
  },
};

interface FileNode {
  key: string;
  title: string;
  path: string;
  isLeaf: boolean;
  size?: number;
  type?: string;
  lastModified?: Date;
  children?: FileNode[];
}

interface KnowledgeBasePathSelectorProps {
  value?: string[];
  onChange?: (paths: string[]) => void;
  maxPaths?: number;
  allowedExtensions?: string[];
  excludePatterns?: string[];
  maxFileSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
  showFileTree?: boolean;
  showTemplates?: boolean;
  showAdvancedOptions?: boolean;
}

export const KnowledgeBasePathSelector: React.FC<KnowledgeBasePathSelectorProps> = ({
  value = [],
  onChange,
  maxPaths = 10,
  allowedExtensions,
  excludePatterns = ['node_modules', '.git', 'dist', 'build'],
  maxFileSize = 1024 * 1024, // 1MB
  className,
  disabled = false,
  showFileTree = true,
  showTemplates = true,
  showAdvancedOptions = true,
}) => {
  const [selectedPaths, setSelectedPaths] = useState<string[]>(value);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [fileTreeData, setFileTreeData] = useState<TreeDataNode[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [isAdvancedModalVisible, setIsAdvancedModalVisible] = useState(false);
  const [pathStats, setPathStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    fileTypes: {},
  });

  // 文件类型过滤配置
  const [fileTypeFilters, setFileTypeFilters] = useState<{[key: string]: boolean}>({
    code: true,
    config: true,
    docs: true,
    web: true,
    data: false,
  });

  // 处理值变化
  useEffect(() => {
    setSelectedPaths(value);
  }, [value]);

  // 计算路径统计
  useEffect(() => {
    calculatePathStats();
  }, [selectedPaths]);

  const handlePathsChange = (newPaths: string[]) => {
    setSelectedPaths(newPaths);
    onChange?.(newPaths);
  };

  const addPath = (newPath: string) => {
    if (!newPath.trim()) {
      message.warning('请输入有效的路径');
      return;
    }

    if (selectedPaths.includes(newPath)) {
      message.warning('路径已存在');
      return;
    }

    if (selectedPaths.length >= maxPaths) {
      message.warning(`最多只能添加 ${maxPaths} 个路径`);
      return;
    }

    const updatedPaths = [...selectedPaths, newPath];
    handlePathsChange(updatedPaths);
    message.success('路径添加成功');
  };

  const removePath = (pathToRemove: string) => {
    const updatedPaths = selectedPaths.filter(path => path !== pathToRemove);
    handlePathsChange(updatedPaths);
    message.success('路径删除成功');
  };

  const applyTemplate = (templateKey: string) => {
    const template = PATH_TEMPLATES[templateKey];
    if (template) {
      handlePathsChange(template.paths);
      setIsTemplateModalVisible(false);
      message.success(`已应用模板：${template.name}`);
    }
  };

  const loadFileTree = async (path?: string) => {
    setIsTreeLoading(true);
    try {
      // 这里应该调用实际的文件系统 API
      // 现在先用模拟数据
      const mockTreeData: TreeDataNode[] = [
        {
          title: 'src',
          key: './src',
          icon: <FolderOutlined />,
          children: [
            {
              title: 'components',
              key: './src/components',
              icon: <FolderOutlined />,
              children: [
                { title: 'Button.tsx', key: './src/components/Button.tsx', icon: <FileOutlined />, isLeaf: true },
                { title: 'Input.tsx', key: './src/components/Input.tsx', icon: <FileOutlined />, isLeaf: true },
              ],
            },
            {
              title: 'utils',
              key: './src/utils',
              icon: <FolderOutlined />,
              children: [
                { title: 'index.ts', key: './src/utils/index.ts', icon: <FileOutlined />, isLeaf: true },
                { title: 'helpers.ts', key: './src/utils/helpers.ts', icon: <FileOutlined />, isLeaf: true },
              ],
            },
          ],
        },
        {
          title: 'docs',
          key: './docs',
          icon: <FolderOutlined />,
          children: [
            { title: 'README.md', key: './docs/README.md', icon: <FileOutlined />, isLeaf: true },
            { title: 'API.md', key: './docs/API.md', icon: <FileOutlined />, isLeaf: true },
          ],
        },
      ];

      setFileTreeData(mockTreeData);
    } catch (error) {
      message.error('加载文件树失败');
      console.error('Load file tree error:', error);
    } finally {
      setIsTreeLoading(false);
    }
  };

  const calculatePathStats = () => {
    // 模拟计算路径统计信息
    const stats = {
      totalFiles: selectedPaths.length * 15, // 模拟每个路径包含15个文件
      totalSize: selectedPaths.length * 512 * 1024, // 模拟每个路径 512KB
      fileTypes: {
        code: selectedPaths.length * 8,
        config: selectedPaths.length * 2,
        docs: selectedPaths.length * 3,
        web: selectedPaths.length * 2,
      },
    };
    setPathStats(stats);
  };

  const validatePath = (path: string): { valid: boolean; message?: string } => {
    if (!path.trim()) {
      return { valid: false, message: '路径不能为空' };
    }

    if (excludePatterns.some(pattern => path.includes(pattern))) {
      return { valid: false, message: '路径包含被排除的模式' };
    }

    return { valid: true };
  };

  const getFileTypeIcon = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
      if (config.extensions.includes(ext)) {
        return config.icon;
      }
    }
    return '📄';
  };

  const getFileTypeTag = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
      if (config.extensions.includes(ext)) {
        return <Tag color={config.color} size="small">{config.name}</Tag>;
      }
    }
    return null;
  };

  const filteredTreeData = fileTreeData.filter((node: any) => {
    if (!searchValue) return true;
    return node.title.toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
    <div className={cn('knowledge-base-path-selector', className)}>
      <Card>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Title level={4} className="mb-0">
              <FolderOutlined className="mr-2" />
              知识库路径配置
            </Title>
            <Space>
              {showTemplates && (
                <Button 
                  icon={<SettingOutlined />}
                  onClick={() => setIsTemplateModalVisible(true)}
                >
                  选择模板
                </Button>
              )}
              {showAdvancedOptions && (
                <Button 
                  icon={<SettingOutlined />}
                  onClick={() => setIsAdvancedModalVisible(true)}
                >
                  高级选项
                </Button>
              )}
            </Space>
          </div>

          <Alert
            message="知识库配置说明"
            description="选择的路径将作为 Agent 的知识来源，Agent 可以访问和分析这些路径下的文件内容。"
            type="info"
            showIcon
            className="mb-4"
          />
        </div>

        {/* 路径添加 */}
        <div className="mb-4">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入文件或目录路径，如 ./src 或 ./docs/README.md"
              onPressEnter={(e) => {
                const input = e.target as HTMLInputElement;
                addPath(input.value);
                input.value = '';
              }}
              disabled={disabled}
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={(e) => {
                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                if (input) {
                  addPath(input.value);
                  input.value = '';
                }
              }}
              disabled={disabled}
            >
              添加
            </Button>
          </Space.Compact>
        </div>

        {/* 已选路径列表 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Text strong>已选择的路径 ({selectedPaths.length}/{maxPaths})</Text>
            {selectedPaths.length > 0 && (
              <Button 
                size="small" 
                danger 
                onClick={() => {
                  Modal.confirm({
                    title: '确认清空',
                    content: '确定要清空所有已选择的路径吗？',
                    onOk: () => handlePathsChange([]),
                  });
                }}
              >
                清空全部
              </Button>
            )}
          </div>

          {selectedPaths.length === 0 ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂未选择任何路径"
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {selectedPaths.map((path, index) => {
                const validation = validatePath(path);
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between p-3 border rounded-lg',
                      validation.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    )}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      {validation.valid ? (
                        <CheckCircleOutlined className="text-green-500" />
                      ) : (
                        <ExclamationCircleOutlined className="text-red-500" />
                      )}
                      <Text 
                        code 
                        className={validation.valid ? 'text-green-700' : 'text-red-700'}
                      >
                        {path}
                      </Text>
                      {!validation.valid && (
                        <Tooltip title={validation.message}>
                          <InfoCircleOutlined className="text-red-500" />
                        </Tooltip>
                      )}
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removePath(path)}
                      disabled={disabled}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 路径统计 */}
        {selectedPaths.length > 0 && (
          <Card size="small" className="mb-4">
            <Title level={5} className="mb-3">路径统计</Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{pathStats.totalFiles}</div>
                <div className="text-sm text-gray-500">预估文件数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatBytes(pathStats.totalSize)}</div>
                <div className="text-sm text-gray-500">预估大小</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{selectedPaths.length}</div>
                <div className="text-sm text-gray-500">路径数量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(fileTypeFilters).filter(key => fileTypeFilters[key]).length}
                </div>
                <div className="text-sm text-gray-500">文件类型</div>
              </div>
            </div>
          </Card>
        )}

        {/* 文件树浏览 */}
        {showFileTree && (
          <Card size="small">
            <div className="flex items-center justify-between mb-3">
              <Title level={5} className="mb-0">文件树浏览</Title>
              <Button 
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => loadFileTree()}
                loading={isTreeLoading}
              >
                刷新
              </Button>
            </div>

            <Search
              placeholder="搜索文件或目录"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="mb-3"
              allowClear
            />

            {isTreeLoading ? (
              <div className="text-center py-8">
                <Spin size="large" />
                <div className="mt-2">加载文件树中...</div>
              </div>
            ) : (
              <Tree
                treeData={filteredTreeData}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                showIcon
                height={300}
                onSelect={(selectedKeys) => {
                  if (selectedKeys.length > 0) {
                    const path = selectedKeys[0] as string;
                    addPath(path);
                  }
                }}
              />
            )}
          </Card>
        )}
      </Card>

      {/* 模板选择弹窗 */}
      <Modal
        title="选择路径模板"
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-4">
          {Object.entries(PATH_TEMPLATES).map(([key, template]) => (
            <Card
              key={key}
              hoverable
              className="cursor-pointer"
              onClick={() => applyTemplate(key)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Title level={5} className="mb-1">
                    {template.name}
                  </Title>
                  <Text type="secondary" className="text-sm">
                    {template.description}
                  </Text>
                  <div className="mt-2">
                    <Text strong className="text-xs">包含路径:</Text>
                    <div className="mt-1">
                      {template.paths.map((path, index) => (
                        <Tag key={index} className="mb-1">{path}</Tag>
                      ))}
                    </div>
                  </div>
                </div>
                <Button 
                  type="primary" 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyTemplate(key);
                  }}
                >
                  应用
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* 高级选项弹窗 */}
      <Modal
        title="高级选项"
        open={isAdvancedModalVisible}
        onCancel={() => setIsAdvancedModalVisible(false)}
        onOk={() => setIsAdvancedModalVisible(false)}
        width={500}
      >
        <div className="space-y-6">
          <div>
            <Title level={5}>文件类型过滤</Title>
            <Text type="secondary" className="text-sm">
              选择要包含在知识库中的文件类型
            </Text>
            <div className="mt-3 space-y-2">
              {Object.entries(FILE_TYPE_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                    <Tag color={config.color} size="small">
                      {config.extensions.slice(0, 3).join(', ')}
                      {config.extensions.length > 3 && '...'}
                    </Tag>
                  </div>
                  <Checkbox
                    checked={fileTypeFilters[key]}
                    onChange={(e) => {
                      setFileTypeFilters(prev => ({
                        ...prev,
                        [key]: e.target.checked,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Title level={5}>排除模式</Title>
            <Text type="secondary" className="text-sm">
              当前排除的文件夹和文件模式
            </Text>
            <div className="mt-3">
              {excludePatterns.map((pattern, index) => (
                <Tag key={index} className="mb-1">{pattern}</Tag>
              ))}
            </div>
          </div>

          <div>
            <Title level={5}>文件大小限制</Title>
            <Text type="secondary" className="text-sm">
              单个文件的最大大小限制: {formatBytes(maxFileSize)}
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};
