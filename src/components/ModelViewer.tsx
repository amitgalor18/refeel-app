import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Helper type for point positions
export interface VisualPoint {
  position: { x: number; y: number; z: number };
  label: string;
  color: number;
  size: number;
  opacity: number;
}

interface ModelViewerProps {
  modelFile: string;
  visualPoints: VisualPoint[];
  onPointSelect?: ((position: { x: number; y: number; z: number }) => void) | null;
  showResetControls?: boolean;
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelFile,
  visualPoints,
  onPointSelect,
  showResetControls = true,
}) => {
  // We use an internal ref for the canvas to avoid clearing the buttons
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouse = useRef<THREE.Vector2>(new THREE.Vector2());
  const [modelLoaded, setModelLoaded] = useState(false);


  // Main initialization effect
  useEffect(() => {
    // Use canvasContainerRef for Three.js
    if (!canvasContainerRef.current) return;

    const mountTarget = canvasContainerRef.current;

    // Basic Three.js setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountTarget.clientWidth / mountTarget.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountTarget.clientWidth, mountTarget.clientHeight);
    rendererRef.current = renderer;

    // Clear container and append renderer
    mountTarget.innerHTML = '';
    mountTarget.appendChild(renderer.domElement);

    // OrbitControls for mouse interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Load OBJ model
    console.log('Loading model:', `/models/${modelFile}`);
    const loader = new OBJLoader();
    loader.load(
      `/models/${modelFile}`,
      (object) => {
        console.log('Model loaded successfully:', modelFile);
        // Center and scale model
        object.rotation.x = -90 * (Math.PI / 180); // Rotate to stand upright
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.0 / maxDim;


        object.position.sub(center.multiplyScalar(scale));
        object.scale.set(scale, scale, scale);


        // Use a basic material
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({ color: 0xffdbac });
          }
        });

        modelRef.current = object;
        scene.add(object);

        setModelLoaded(true);
      },
      (xhr) => {
        console.log(`Model ${modelFile} loading: ${(xhr.loaded / xhr.total) * 100}%`);
      },
      (error) => {
        console.error(`Error loading OBJ model ${modelFile}`, error);
      }
    );

    // Animation loop
    const animate = () => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current || !controlsRef.current) return;
      requestAnimationFrame(animate);
      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (canvasContainerRef.current && rendererRef.current && cameraRef.current) {
        const width = canvasContainerRef.current.clientWidth;
        const height = canvasContainerRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = '';
      }
      controlsRef.current?.dispose();
    };
  }, [modelFile]); // Removed containerRef dependency


  // Click/Touch handling effect - Works for both mouse and touch
  useEffect(() => {
    if (!rendererRef.current || !onPointSelect) return;

    const canvas = rendererRef.current.domElement;

    // Unified pointer tracking (works for mouse and touch)
    let pointerDownPos: { x: number; y: number } | null = null;
    let isDragging = false;
    let pointerDownTime = 0;

    // Get position from mouse or touch event
    const getPointerPosition = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        return { x: touch.clientX, y: touch.clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const pos = getPointerPosition(e);
      pointerDownPos = pos;
      isDragging = false;
      pointerDownTime = Date.now();
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (pointerDownPos) {
        const pos = getPointerPosition(e);
        const dx = pos.x - pointerDownPos.x;
        const dy = pos.y - pointerDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved more than 5 pixels, it's a drag
        if (distance > 5) {
          isDragging = true;
        }
      }
    };

    const onPointerUp = (e: MouseEvent | TouchEvent) => {
      const timeDiff = Date.now() - pointerDownTime;

      // Only process as click/tap if:
      // 1. Not dragging
      // 2. Quick tap (< 300ms)
      if (!isDragging && timeDiff < 300 && pointerDownPos && modelRef.current && cameraRef.current) {
        const pos = getPointerPosition(e);
        const rect = canvas.getBoundingClientRect();
        mouse.current.x = ((pos.x - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((pos.y - rect.top) / rect.height) * 2 + 1;

        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        const intersects = raycaster.current.intersectObject(modelRef.current, true);

        if (intersects.length > 0) {
          const point = intersects[0].point;
          const localPoint = modelRef.current.worldToLocal(point.clone());
          console.log('Point selected (local coords):', localPoint);
          onPointSelect(localPoint);
        } else {
          console.log('No intersection found');
        }
      } else if (isDragging) {
        console.log('Was dragging, not selecting point');
      }

      // Reset
      pointerDownPos = null;
      isDragging = false;
    };

    // Add both mouse and touch event listeners
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    canvas.addEventListener('touchmove', onPointerMove, { passive: true });
    canvas.addEventListener('touchend', onPointerUp);

    return () => {
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mouseup', onPointerUp);

      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove', onPointerMove);
      canvas.removeEventListener('touchend', onPointerUp);
    };
  }, [onPointSelect]);

  // Effect for updating points (spheres) - NOW WITH VISUAL STATES
  useEffect(() => {
    if (!sceneRef.current || !modelLoaded) return;

    // Clear old points from scene
    const oldPoints = sceneRef.current.children.filter(
      (child) => child.userData.isSelectionPoint
    );
    oldPoints.forEach((point) => sceneRef.current!.remove(point));

    // Add new points with explicit visual properties
    visualPoints.forEach((point) => {
      const { position, label, color, size, opacity } = point;

      const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

      // Convert from local model coordinates to world coordinates
      const worldPosition = new THREE.Vector3(position.x, position.y, position.z);
      modelRef.current!.localToWorld(worldPosition);

      sphere.position.copy(worldPosition);
      sphere.userData.isSelectionPoint = true;

      // Add label if provided
      if (label) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = 64;
          canvas.height = 64;
          context.fillStyle = 'white';
          context.font = 'bold 48px Arial';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(label, 32, 32);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.copy(worldPosition);
          sprite.position.y += 0.15; // Offset above sphere
          sprite.scale.set(0.3, 0.3, 1);
          sprite.userData.isSelectionPoint = true;

          sceneRef.current!.add(sprite);
        }
      }

      sceneRef.current!.add(sphere);
    });
  }, [visualPoints, modelLoaded, modelRef.current]);

  const resetView = (view: 'front' | 'back') => {
    if (!cameraRef.current || !controlsRef.current) return;

    const distance = 3; // Standard distance
    const height = 1.5; // Standard height

    if (view === 'front') {
      cameraRef.current.position.set(0, height, distance);
    } else {
      cameraRef.current.position.set(0, height, -distance);
    }

    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={canvasContainerRef} className="w-full h-full" />
      {showResetControls && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); resetView('front'); }}
            className="bg-white/80 hover:bg-white text-gray-800 px-3 py-1 rounded shadow text-sm font-medium backdrop-blur-sm transition-colors"
          >
            חזית
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resetView('back'); }}
            className="bg-white/80 hover:bg-white text-gray-800 px-3 py-1 rounded shadow text-sm font-medium backdrop-blur-sm transition-colors"
          >
            אחור
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelViewer;