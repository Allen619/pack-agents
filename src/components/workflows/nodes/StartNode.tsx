import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { PlayCircleOutlined } from '@ant-design/icons';

interface StartNodeData {
  label: string;
}

export const StartNode = memo(({ data, selected }: NodeProps<StartNodeData>) => {
  return (
    <div className="start-node">
      <div
        className={`
          flex items-center justify-center w-16 h-16 rounded-full 
          bg-gradient-to-br from-purple-500 to-purple-600 
          text-white shadow-lg transition-all duration-200
          ${selected ? 'ring-4 ring-purple-300 scale-105' : ''}
        `}
      >
        <PlayCircleOutlined className="text-xl" />
      </div>
      
      <div className="text-center mt-2">
        <span className="text-sm font-medium text-gray-700">
          {data.label}
        </span>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
