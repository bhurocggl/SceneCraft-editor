
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AssetTransform {
  position: Vector3;
  rotation: Vector3; // Euler angles in degrees
  scale: Vector3;
}

export interface CameraIntrinsics {
  image_width: number;
  image_height: number;
  cx: number;
  cy: number;
  fx: number;
  fy: number;
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

export interface ThreeDAsset {
  id: string;
  data: Blob;
  fileType: 'ply' | 'glb';
  label: string;
  source: 'model' | 'upload';
}