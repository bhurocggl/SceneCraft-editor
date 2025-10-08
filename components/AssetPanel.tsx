import React from 'react';
import { ThreeDAsset, AssetTransform, Vector3 } from '../types';

interface AssetPanelProps {
  assets: ThreeDAsset[];
  activeAssetId: string | null;
  onSelectAsset: (id: string | null) => void;
  activeAssetTransform: AssetTransform | null;
  onTransformChange: (transform: AssetTransform) => void;
}

const TransformInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; }> = ({ label, value, onChange }) => (
  <div className="relative">
    <label htmlFor={`${label}-input`} className="absolute -top-2 left-2 inline-block bg-gray-700 px-1 text-xs font-medium text-gray-400">{label}</label>
    <input
      type="number"
      id={`${label}-input`}
      value={value.toFixed(3)}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      step={0.1}
    />
  </div>
);


const TransformInputGroup: React.FC<{
    label: string;
    values: Vector3;
    onChange: (axis: keyof Vector3, value: number) => void;
}> = ({ label, values, onChange }) => (
    <div className="space-y-2">
        <p className="block text-sm font-medium text-gray-300">{label}</p>
        <div className="grid grid-cols-3 gap-2">
            <TransformInput label="X" value={values.x} onChange={(v) => onChange('x', v)} />
            <TransformInput label="Y" value={values.y} onChange={(v) => onChange('y', v)} />
            <TransformInput label="Z" value={values.z} onChange={(v) => onChange('z', v)} />
        </div>
    </div>
);


const AssetPanel: React.FC<AssetPanelProps> = ({ assets, activeAssetId, onSelectAsset, activeAssetTransform, onTransformChange }) => {

  const handleTransformValueChange = (
    type: keyof AssetTransform,
    axis: keyof Vector3,
    value: number
  ) => {
    if (!activeAssetTransform) return;
    
    const newTransform = { ...activeAssetTransform };
    (newTransform[type] as Vector3)[axis] = value;
    
    onTransformChange(newTransform);
  };


  return (
    <div className="w-72 bg-gray-800 p-4 flex flex-col h-full overflow-y-auto border-l border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4">3D Assets</h2>
      {assets.length === 0 ? (
        <p className="text-gray-400 text-sm">No assets loaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {assets.map((asset) => (
            <li key={asset.id}>
              <button
                onClick={() => onSelectAsset(asset.id === activeAssetId ? null : asset.id)}
                className={`w-full text-left p-3 rounded-md transition-colors duration-150 ${
                  asset.id === activeAssetId
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                <p className="font-semibold truncate">{asset.label}</p>
                <p className="text-xs text-gray-400">
                  Source: {asset.source} | Type: {asset.fileType.toUpperCase()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeAssetId && activeAssetTransform && (
        <div className="border-t border-gray-700 pt-4 mt-4 space-y-4">
            <h3 className="text-lg font-semibold text-white">Transform</h3>
            <TransformInputGroup 
                label="Position"
                values={activeAssetTransform.position}
                onChange={(axis, value) => handleTransformValueChange('position', axis, value)}
            />
             <TransformInputGroup 
                label="Rotation (°)"
                values={activeAssetTransform.rotation}
                onChange={(axis, value) => handleTransformValueChange('rotation', axis, value)}
            />
             <TransformInputGroup 
                label="Scale"
                values={activeAssetTransform.scale}
                onChange={(axis, value) => handleTransformValueChange('scale', axis, value)}
            />
        </div>
      )}
    </div>
  );
};

export default AssetPanel;