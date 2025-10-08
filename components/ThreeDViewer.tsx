import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraIntrinsics, ThreeDAsset, AssetTransform, ThreeDViewerRef } from '../types';

interface ThreeDViewerProps {
  assets: ThreeDAsset[];
  intrinsics: CameraIntrinsics;
  activeAssetId: string | null;
  activeAssetTransform: AssetTransform | null;
  onTransformChange: (transform: AssetTransform) => void;
}

const ThreeDViewer: React.ForwardRefRenderFunction<ThreeDViewerRef, ThreeDViewerProps> = ({ assets, intrinsics, activeAssetId, activeAssetTransform, onTransformChange }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const boundingBoxRef = useRef<THREE.Box3Helper | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const [loadedModelIds, setLoadedModelIds] = useState<Set<string>>(new Set());
  const isUsingIntrinsicsRef = useRef(false);
  const isUpdatingProgrammatically = useRef(false);

  useImperativeHandle(ref, () => ({
    getSceneData: () => {
      const sceneData: { id: string; transform: AssetTransform }[] = [];
      modelsRef.current.forEach((model, id) => {
        sceneData.push({
          id,
          transform: {
            position: { x: model.position.x, y: model.position.y, z: model.position.z },
            rotation: {
              x: THREE.MathUtils.radToDeg(model.rotation.x),
              y: THREE.MathUtils.radToDeg(model.rotation.y),
              z: THREE.MathUtils.radToDeg(model.rotation.z),
            },
            scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z },
          },
        });
      });
      return sceneData;
    },
  }));

  // Initialization
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;

    // --- Environment and Lighting Setup (based on user's suggestion) ---
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Use a PMREMGenerator to process the environment map for realistic lighting.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // A robust lighting setup with strong key and back lights.
    // The Y positions are inverted from the user's example to match our Y-down coordinate system.
    const mainLight = new THREE.DirectionalLight(0xffffff, 4.0);
    mainLight.position.set(5, -10, 7.5); // Y=-10 is "above" in a Y-down system
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 4.0);
    backLight.position.set(-5, 10, -5); // Y=10 is "below" in a Y-down system
    scene.add(backLight);
    
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 0); // Set camera at (0, 0, 0)
    camera.lookAt(0, 0, 1)
    cameraRef.current = camera;
    scene.add(camera);

    // Configure renderer for a brighter, more physically correct output
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    const transformControls = new TransformControls(camera, renderer.domElement);
    
    const handleTransformChange = () => {
        if (isUpdatingProgrammatically.current) return;
        if (boundingBoxRef.current && boundingBoxRef.current.box && transformControls.object) {
            boundingBoxRef.current.box.setFromObject(transformControls.object);
        }
        if(transformControls.object){
            const object = transformControls.object;
            onTransformChange({
                position: { x: object.position.x, y: object.position.y, z: object.position.z },
                rotation: { 
                    x: THREE.MathUtils.radToDeg(object.rotation.x),
                    y: THREE.MathUtils.radToDeg(object.rotation.y),
                    z: THREE.MathUtils.radToDeg(object.rotation.z) 
                },
                scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z }
            });
        }
    };
    
    transformControls.addEventListener('objectChange', handleTransformChange);
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleKeyDown = (event: KeyboardEvent) => {
        if (transformControlsRef.current) {
            const controls = transformControlsRef.current;
            switch (event.key.toLowerCase()) {
                case 'w':
                    controls.setMode('translate');
                    controls.setSpace('world');
                    break;
                case 'e':
                    controls.setMode('rotate');
                    controls.setSpace('local');
                    break;
                case 'r':
                    controls.setMode('scale');
                    controls.setSpace('local');
                    break;
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleResize = () => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
        if (!isUsingIntrinsicsRef.current) {
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      transformControls.removeEventListener('objectChange', handleTransformChange);
      transformControls.dispose();
      pmremGenerator.dispose();
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onTransformChange]);

  // Update camera intrinsics
  useEffect(() => {
    if (!cameraRef.current) return;
    const { image_width: width, image_height: height, fx, fy, cx, cy } = intrinsics;
    const camera = cameraRef.current;

    if (fx > 0 && fy > 0 && width > 0 && height > 0) {
        const near = 0.1;
        const far = 1000;

        const matrix = new THREE.Matrix4();
        
        matrix.set(
            -2*fx / width, 0,                1-2*cx / width,     0,
            0,            -2*fy / height,    2*cy / height-1,   0,
            0,            0,                  -(far + near) / (far - near), -2 * far * near / (far - near),
            0,            0,                  -1,                           0
        )

        camera.projectionMatrix.copy(matrix);
        camera.projectionMatrixInverse.copy(matrix).invert();
        isUsingIntrinsicsRef.current = true;
    } else {
        isUsingIntrinsicsRef.current = false;
        if (mountRef.current) {
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
        }
    }
  }, [intrinsics]);

  // Load, add, and remove assets from the scene
  useEffect(() => {
    const assetIds = new Set(assets.map(a => a.id));
    const scene = sceneRef.current;
    if (!scene) return;
    
    for (const [id, model] of modelsRef.current.entries()) {
      if (!assetIds.has(id)) {
        if (transformControlsRef.current?.object === model) {
            transformControlsRef.current.detach();
        }
        scene.remove(model);
        modelsRef.current.delete(id);
        setLoadedModelIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
      }
    }

    assets.forEach(asset => {
      if (!modelsRef.current.has(asset.id)) {
        const url = URL.createObjectURL(asset.data);
        const onError = (error: ErrorEvent) => console.error('Error loading model:', error);
        
        const onLoad = (object: THREE.Object3D) => {
            const wrapper = new THREE.Group();
            
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
  
            object.position.sub(center); // Center the geometry inside the wrapper
            wrapper.add(object);
  
            // Apply initial transform if it exists
            if (asset.initialTransform) {
                const { position, rotation, scale } = asset.initialTransform;
                wrapper.position.set(position.x, position.y, position.z);
                wrapper.rotation.set(
                    THREE.MathUtils.degToRad(rotation.x),
                    THREE.MathUtils.degToRad(rotation.y),
                    THREE.MathUtils.degToRad(rotation.z)
                );
                wrapper.scale.set(scale.x, scale.y, scale.z);
            } else {
                // If no transform, move the wrapper to the object's original center
                wrapper.position.copy(center);
            }
            
            modelsRef.current.set(asset.id, wrapper);
            scene.add(wrapper);
            URL.revokeObjectURL(url);
            setLoadedModelIds(prev => new Set(prev).add(asset.id));
          };

        if (asset.fileType === 'ply') {
          new PLYLoader().load(url, (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ vertexColors: true });
            const mesh = new THREE.Mesh(geometry, material);
            onLoad(mesh);
          }, undefined, onError);
        } else if (asset.fileType === 'glb') {
          new GLTFLoader().load(url, (gltf) => {
            onLoad(gltf.scene);
          }, undefined, onError);
        }
      }
    });
  }, [assets]);

  // Add/Update bounding box and gizmo for active asset
  useEffect(() => {
    const scene = sceneRef.current;
    const controls = transformControlsRef.current;
    if (!scene || !controls) return;
    
    if (boundingBoxRef.current) {
        scene.remove(boundingBoxRef.current);
        boundingBoxRef.current = null;
    }
    controls.detach();
    
    if (activeAssetId && modelsRef.current.has(activeAssetId)) {
        const model = modelsRef.current.get(activeAssetId);
        if (model) {
            controls.attach(model);
            const box = new THREE.Box3().setFromObject(model);
            if (!box.isEmpty()){
                const boxHelper = new THREE.Box3Helper(box, 0xffff00); // Yellow
                scene.add(boxHelper);
                boundingBoxRef.current = boxHelper;
            }
            // Report initial transform when asset is selected
             onTransformChange({
                position: { x: model.position.x, y: model.position.y, z: model.position.z },
                rotation: { 
                    x: THREE.MathUtils.radToDeg(model.rotation.x),
                    y: THREE.MathUtils.radToDeg(model.rotation.y),
                    z: THREE.MathUtils.radToDeg(model.rotation.z) 
                },
                scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
            });
        }
    }
  }, [activeAssetId, loadedModelIds, onTransformChange]);


  // Apply transform from external state (e.g., input boxes)
  useEffect(() => {
      const model = activeAssetId ? modelsRef.current.get(activeAssetId) : null;
      if (model && activeAssetTransform) {
          isUpdatingProgrammatically.current = true;
          
          model.position.set(activeAssetTransform.position.x, activeAssetTransform.position.y, activeAssetTransform.position.z);
          model.rotation.set(
              THREE.MathUtils.degToRad(activeAssetTransform.rotation.x),
              THREE.MathUtils.degToRad(activeAssetTransform.rotation.y),
              THREE.MathUtils.degToRad(activeAssetTransform.rotation.z)
          );
          model.scale.set(activeAssetTransform.scale.x, activeAssetTransform.scale.y, activeAssetTransform.scale.z);
          
          if (boundingBoxRef.current) {
              boundingBoxRef.current.box.setFromObject(model);
          }

          // A brief timeout helps prevent race conditions with the event listener
          setTimeout(() => {
            isUpdatingProgrammatically.current = false;
          }, 0);
      }
  }, [activeAssetTransform, activeAssetId]);


  return (
    <div ref={mountRef} className="w-full h-full relative">
      {/* Renderer canvas is attached here */}
      <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-70 text-gray-200 text-xs p-2 rounded-md font-mono select-none">
        <div><strong>W</strong>: Translate (World)</div>
        <div><strong>E</strong>: Rotate (Local)</div>
        <div><strong>R</strong>: Scale (Local)</div>
      </div>
    </div>
  );
};

export default forwardRef(ThreeDViewer);