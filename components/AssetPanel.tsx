import React from 'react';
import { ThreeDAsset, AssetTransform, Vector3 } from '../types';

interface AssetPanelProps {
  assets: ThreeDAsset[];
  activeAssetId: string | null;
  onSelectAsset: (id: string | null) => void;
  activeAssetTransform: AssetTransform | null;
  onTransformChange: (transform: AssetTransform) => void;
  onDeleteAsset: (id: string) => void;
  onToggleVisibility: (id: string) => void;
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


const AssetPanel: React.FC<AssetPanelProps> = ({ assets, activeAssetId, onSelectAsset, activeAssetTransform, onTransformChange, onDeleteAsset, onToggleVisibility }) => {

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
            <li
              key={asset.id}
              className={`flex items-center p-1.5 rounded-md transition-all duration-150 ${
                asset.id === activeAssetId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              } ${!asset.visible ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => onSelectAsset(asset.id === activeAssetId ? null : asset.id)}
                className="flex-grow text-left p-1"
                aria-label={`Select ${asset.label}`}
              >
                <p className="font-semibold truncate">{asset.label}</p>
                <p className={`text-xs ${asset.id === activeAssetId ? 'text-indigo-200' : 'text-gray-400'}`}>
                  Source: {asset.source} | Type: {asset.fileType.toUpperCase()}
                </p>
              </button>
              <div className="flex items-center space-x-1 pl-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(asset.id); }}
                  className={`p-1 rounded-md ${
                    asset.id === activeAssetId ? 'hover:bg-indigo-500' : 'hover:bg-gray-600'
                  }`}
                  aria-label={asset.visible ? `Hide ${asset.label}` : `Show ${asset.label}`}
                  title={asset.visible ? 'Hide asset' : 'Show asset'}
                >
                  {asset.visible ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C3.732 4.943 7.523 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-7.042 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 8.057 16.76 6.555 15.12 5.432l-1.457-1.457L3.707 2.293zm4.74.74a1 1 0 00-1.414-1.414L5.62 3.033a10.025 10.025 0 011.956-.442c3.273 0 7.042 1.943 9.542 7a10.014 10.014 0 01-4.328 5.408l-1.89-1.89A4 4 0 0010 6.93l-1.553-1.553zm-2.922 7.028a4 4 0 015.38-5.38l-5.38 5.38zm8.018 2.865A10.014 10.014 0 0110 17c-3.273 0-7.042-1.943-9.542-7a10.01 10.01 0 012.33-3.834l1.29 1.29a6 6 0 007.92 7.92l1.29 1.29z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.id); }}
                  className={`p-1 rounded-md ${
                    asset.id === activeAssetId ? 'hover:bg-indigo-500' : 'hover:bg-gray-600'
                  } text-gray-400 hover:text-red-400`}
                  aria-label={`Delete ${asset.label}`}
                  title="Delete asset"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>
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
