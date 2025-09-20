import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircleOutlined } from '@ant-design/icons';

interface EndNodeData {
  label: string;
}

export const EndNode = memo(({ data, selected }: NodeProps<EndNodeData>) => {
  return (
    <div className="end-node">
      <Handle type="target" position={Position.Top} />
      
      <div
        className={`
          flex items-center justify-center w-16 h-16 rounded-full 
          bg-gradient-to-br from-green-500 to-green-600 
          text-white shadow-lg transition-all duration-200
          ${selected ? 'ring-4 ring-green-300 scale-105' : ''}
        `}
      >
        <CheckCircleOutlined className="text-xl" />
      </div>
      
      <div className="text-center mt-2">
        <span className="text-sm font-medium text-gray-700">
          {data.label}
        </span>
      </div>
    </div>
  );
});
