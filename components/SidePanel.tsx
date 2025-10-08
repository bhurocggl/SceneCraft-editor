import React, { ChangeEvent } from 'react';
import { CameraIntrinsics } from '../types';

interface SidePanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  serverEndpoint: string;
  setServerEndpoint: (endpoint: string) => void;
  intrinsics: CameraIntrinsics;
  setIntrinsics: (intrinsics: CameraIntrinsics) => void;
  onStart: () => void;
  isLoading: boolean;
  onFileUpload: (files: File[]) => void;
}

const IntrinsicsInput = ({ label, id, value, onChange }: { label: string; id: keyof CameraIntrinsics; value: number; onChange: (id: keyof CameraIntrinsics, value: number) => void; }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-300">{label}</label>
    <input
      type="number"
      id={id}
      name={id}
      value={value}
      onChange={(e) => onChange(id, parseFloat(e.target.value) || 0)}
      className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    />
  </div>
);


const SidePanel: React.FC<SidePanelProps> = ({ prompt, setPrompt, serverEndpoint, setServerEndpoint, intrinsics, setIntrinsics, onStart, isLoading, onFileUpload }) => {
  
  const handleIntrinsicsChange = (id: keyof CameraIntrinsics, value: number) => {
    setIntrinsics({ ...intrinsics, [id]: value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(Array.from(e.target.files));
    }
  };

  return (
    <div className="w-96 bg-gray-800 p-6 flex flex-col space-y-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-white">SceneCraft Editor</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">Prompt</label>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., 'Create a simple cube'"
          />
        </div>
        <div>
          <label htmlFor="serverEndpoint" className="block text-sm font-medium text-gray-300">Server Endpoint</label>
          <input
            type="text"
            id="serverEndpoint"
            value={serverEndpoint}
            onChange={(e) => setServerEndpoint(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={onStart}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Start'}
        </button>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Camera Intrinsics</h2>
        <div className="grid grid-cols-2 gap-4">
          <IntrinsicsInput label="Image Width" id="image_width" value={intrinsics.image_width} onChange={handleIntrinsicsChange} />
          <IntrinsicsInput label="Image Height" id="image_height" value={intrinsics.image_height} onChange={handleIntrinsicsChange} />
          <IntrinsicsInput label="CX" id="cx" value={intrinsics.cx} onChange={handleIntrinsicsChange} />
          <IntrinsicsInput label="CY" id="cy" value={intrinsics.cy} onChange={handleIntrinsicsChange} />
          <IntrinsicsInput label="FX" id="fx" value={intrinsics.fx} onChange={handleIntrinsicsChange} />
          <IntrinsicsInput label="FY" id="fy" value={intrinsics.fy} onChange={handleIntrinsicsChange} />
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Upload 3D File</h2>
         <input 
            type="file"
            multiple
            accept=".ply,.glb,.gltf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
         />
      </div>
    </div>
  );
};

export default SidePanel;