import React, { useState } from 'react';
import SidePanel from './components/SidePanel';
import ThreeDViewer from './components/ThreeDViewer';
import AssetPanel from './components/AssetPanel';
import { queryModel } from './services/geminiService';
import { CameraIntrinsics, GeminiPart, ThreeDAsset, AssetTransform } from './types';

const defaultIntrinsics: CameraIntrinsics = {
  image_width: 800,
  image_height: 600,
  cx: 400,
  cy: 300,
  fx: 500,
  fy: 500,
};

// Base64 decode helper for text
const fromBase64 = (base64: string): string =>
  typeof window !== 'undefined'
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');

// Base64 decode helper for files
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = fromBase64(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};


/**
 * A minimal helper class to read protobuf messages field by field.
 */
class ProtoReader {
    private i = 0;
    private bytes: Uint8Array;
    private view: DataView;

    constructor(bytes: Uint8Array) {
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    public isAtEnd(): boolean {
        return this.i >= this.bytes.length;
    }

    public readTag(): { fieldNumber: number, wireType: number } {
        const tag = this.readVarint();
        return { fieldNumber: tag >> 3, wireType: tag & 7 };
    }

    public readVarint(): number {
        let result = 0;
        let shift = 0;
        let byte;
        do {
            if (this.i >= this.bytes.length) throw new Error("Buffer underflow while reading varint");
            byte = this.bytes[this.i++];
            result |= (byte & 0x7f) << shift;
            shift += 7;
        } while (byte & 0x80);
        return result;
    }

    public readBytes(): Uint8Array {
        const len = this.readVarint();
        const subArray = this.bytes.subarray(this.i, this.i + len);
        this.i += len;
        return subArray;
    }

    public readFloat(): number {
        if (this.i + 4 > this.bytes.length) throw new Error("Buffer underflow while reading float");
        const value = this.view.getFloat32(this.i, true); // true for little-endian
        this.i += 4;
        return value;
    }
    
    public skipField(wireType: number) {
        switch (wireType) {
            case 0: this.readVarint(); break; // Varint
            case 1: this.i += 8; break; // 64-bit
            case 2: { const len = this.readVarint(); this.i += len; break; } // Length-delimited
            case 5: this.i += 4; break; // 32-bit
            default: throw new Error(`Unknown wire type: ${wireType}`);
        }
    }
}

/**
 * Decodes a scenecraft.Structure3D protobuf message.
 * @param protoBytes The raw Uint8Array from the model.
 * @returns The decoded structure with file type, data, and label.
 */
const decodeStructure3D = (protoBytes: Uint8Array): { fileType: number, data: Uint8Array, label: string } => {
    const reader = new ProtoReader(protoBytes);
    let fileType = 0;
    let data = new Uint8Array();
    let label = '';

    while (!reader.isAtEnd()) {
        const { fieldNumber, wireType } = reader.readTag();
        switch (fieldNumber) {
            case 1: // file_type
                if (wireType === 0) fileType = reader.readVarint(); else reader.skipField(wireType);
                break;
            case 2: // data
                if (wireType === 2) data = reader.readBytes(); else reader.skipField(wireType);
                break;
            case 3: // label
                if (wireType === 2) label = new TextDecoder().decode(reader.readBytes()); else reader.skipField(wireType);
                break;
            default:
                reader.skipField(wireType);
                break;
        }
    }
    return { fileType, data, label };
};


/**
 * Decodes a scenecraft.CameraIntrinsics protobuf message.
 * @param protoBytes The raw Uint8Array from the model.
 * @returns The decoded CameraIntrinsics object.
 */
const decodeCameraIntrinsics = (protoBytes: Uint8Array): CameraIntrinsics => {
    const reader = new ProtoReader(protoBytes);
    const intrinsics: CameraIntrinsics = { ...defaultIntrinsics };

    while (!reader.isAtEnd()) {
        const { fieldNumber, wireType } = reader.readTag();
        switch (fieldNumber) {
            case 1: // image_width
                if (wireType === 0) intrinsics.image_width = reader.readVarint(); else reader.skipField(wireType);
                break;
            case 2: // image_height
                if (wireType === 0) intrinsics.image_height = reader.readVarint(); else reader.skipField(wireType);
                break;
            case 3: // cx
                if (wireType === 5) intrinsics.cx = reader.readFloat(); else reader.skipField(wireType);
                break;
            case 4: // cy
                if (wireType === 5) intrinsics.cy = reader.readFloat(); else reader.skipField(wireType);
                break;
            case 5: // fx
                if (wireType === 5) intrinsics.fx = reader.readFloat(); else reader.skipField(wireType);
                break;
            case 6: // fy
                if (wireType === 5) intrinsics.fy = reader.readFloat(); else reader.skipField(wireType);
                break;
            default:
                reader.skipField(wireType);
                break;
        }
    }
    return intrinsics;
}


function App() {
  const [prompt, setPrompt] = useState<string>('');
  const [serverEndpoint, setServerEndpoint] = useState<string>('dynamic/evergreen1:///mbns/el/home/courier/gdm/scenecraft-playback');
  const [intrinsics, setIntrinsics] = useState<CameraIntrinsics>(defaultIntrinsics);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseParts, setResponseParts] = useState<GeminiPart[]>([]);
  
  const [assets, setAssets] = useState<ThreeDAsset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [activeAssetTransform, setActiveAssetTransform] = useState<AssetTransform | null>(null);

  const processResponse = (parts: GeminiPart[]) => {
    setResponseParts(parts);
    let newAssetCreated = false;

    parts.forEach(part => {
      if (part.inlineData) {
        try {
          const mimeType = part.inlineData.mimeType;
          
          if (mimeType.includes('scenecraft.Structure3D')) {
            const byteCharacters = fromBase64(part.inlineData.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const protoBytes = new Uint8Array(byteNumbers);

            const { fileType, data: modelDataBytes, label } = decodeStructure3D(protoBytes);

            let assetFileType: ThreeDAsset['fileType'] | null = null;
            let assetMimeType: string | null = null;

            switch (fileType) {
                case 1: // PLY
                    assetFileType = 'ply';
                    assetMimeType = 'application/x-ply';
                    break;
                case 3: // GLB
                    assetFileType = 'glb';
                    assetMimeType = 'model/gltf-binary';
                    break;
                case 2: // SPLAT
                    console.warn('SPLAT file type is not supported yet.');
                    break;
                default:
                    console.warn(`Unknown file type in Structure3D: ${fileType}`);
                    break;
            }

            if (assetFileType && assetMimeType && modelDataBytes.length > 0) {
                const modelBlob = new Blob([modelDataBytes], { type: assetMimeType });
                const newAsset: ThreeDAsset = {
                  id: crypto.randomUUID(),
                  data: modelBlob,
                  fileType: assetFileType,
                  label: label || 'Generated Model',
                  source: 'model',
                };
                setAssets(prevAssets => [...prevAssets, newAsset]);
                setActiveAssetId(newAsset.id);
                newAssetCreated = true;
            }
          }
          else if (mimeType.includes('scenecraft.CameraIntrinsics')) {
             const byteCharacters = fromBase64(part.inlineData.data);
             const byteNumbers = new Array(byteCharacters.length);
             for (let i = 0; i < byteCharacters.length; i++) {
                 byteNumbers[i] = byteCharacters.charCodeAt(i);
             }
             const protoBytes = new Uint8Array(byteNumbers);
             const newIntrinsics = decodeCameraIntrinsics(protoBytes);
             setIntrinsics(newIntrinsics);
          }
          // Handle 3D model files
          else if (mimeType === 'application/x-ply') {
            const modelBlob = base64ToBlob(part.inlineData.data, mimeType);
            const newAsset: ThreeDAsset = {
              id: crypto.randomUUID(),
              data: modelBlob,
              fileType: 'ply',
              label: 'Generated Model',
              source: 'model',
            };
            setAssets(prevAssets => [...prevAssets, newAsset]);
            setActiveAssetId(newAsset.id);
            newAssetCreated = true;
          } 
          // Handle camera intrinsics
          else if (mimeType === 'application/json') {
            const decodedString = fromBase64(part.inlineData.data);
            const jsonData = JSON.parse(decodedString);
            // Basic validation to ensure it's camera data
            if ('image_width' in jsonData && 'fx' in jsonData) {
              setIntrinsics(jsonData as CameraIntrinsics);
            }
          }
          // Other potential data types like images are handled in the render block
        } catch (error) {
          console.error("Failed to process inline data part:", error, part);
        }
      }
    });

    if (!newAssetCreated) {
        const textOnly = parts.every(p => p.text && !p.inlineData);
        if(!textOnly && parts.length > 0) {
            console.warn("Model response received, but no supported 3D asset part was found.");
        }
    }
  };

  const handleStart = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponseParts([]);
    const response = await queryModel(prompt, serverEndpoint);
    processResponse(response);
    setIsLoading(false);
  };

  const handleFileUpload = (files: File[]) => {
    const newAssets: ThreeDAsset[] = [];
    let lastValidAssetId: string | null = null;
    
    files.forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'ply' || extension === 'glb' || extension === 'gltf') {
        const newAsset: ThreeDAsset = {
          id: crypto.randomUUID(),
          data: file,
          fileType: (extension === 'gltf' ? 'glb' : extension) as 'ply' | 'glb',
          label: file.name,
          source: 'upload',
        };
        newAssets.push(newAsset);
        lastValidAssetId = newAsset.id;
      } else {
        alert(`Unsupported file type: ${file.name}. Please upload a .ply, .glb, or .gltf file`);
      }
    });

    if (newAssets.length > 0) {
      setAssets(prevAssets => [...prevAssets, ...newAssets]);
      if (lastValidAssetId) {
        setActiveAssetId(lastValidAssetId);
      }
      setResponseParts([]);
    }
  };

  const handleSelectAsset = (id: string | null) => {
    setActiveAssetId(id);
    if (id === null) {
      setActiveAssetTransform(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white">
      <SidePanel
        prompt={prompt}
        setPrompt={setPrompt}
        serverEndpoint={serverEndpoint}
        setServerEndpoint={setServerEndpoint}
        intrinsics={intrinsics}
        setIntrinsics={setIntrinsics}
        onStart={handleStart}
        isLoading={isLoading}
        onFileUpload={handleFileUpload}
      />
      <main className="flex-1 flex flex-col p-4 space-y-4">
        <div className="flex-1 bg-gray-700 rounded-lg overflow-hidden flex justify-center items-center">
           <div
            style={{
              aspectRatio: `${intrinsics.image_width} / ${intrinsics.image_height}`,
              maxWidth: '100%',
              maxHeight: '100%',
              width: '100%'
            }}
            className="relative"
           >
            <ThreeDViewer 
              assets={assets}
              intrinsics={intrinsics}
              activeAssetId={activeAssetId}
              activeAssetTransform={activeAssetTransform}
              onTransformChange={setActiveAssetTransform}
             />
           </div>
        </div>
        <div className="h-48 bg-gray-800 rounded-lg p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2 text-gray-200">Model Response</h2>
          <div className="space-y-4 prose prose-invert max-w-none">
             {responseParts.length === 0 && (
                <p className="text-gray-400">{isLoading ? 'Generating...' : 'Model response will appear here...'}</p>
             )}
            {responseParts.map((part, index) => {
              if (part.text) {
                return <p key={`text-${index}`} className="text-gray-300">{part.text}</p>;
              }
              if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                return (
                  <img 
                    key={`img-${index}`} 
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                    alt="Model generated image"
                    className="max-w-xs max-h-32 rounded-md"
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      </main>
      <AssetPanel 
        assets={assets} 
        activeAssetId={activeAssetId} 
        onSelectAsset={handleSelectAsset}
        activeAssetTransform={activeAssetTransform}
        onTransformChange={setActiveAssetTransform}
      />
    </div>
  );
}

export default App;
