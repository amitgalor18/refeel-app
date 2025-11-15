import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Helper type for point positions
type PointPosition = { x: number; y: number; z: number } | null;

interface ModelViewerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  modelFile: string;
  selectedPoints: PointPosition[];
  onPointSelect?: ((position: { x: number; y: number; z: number }) => void) | null;
  selectedPointIndex?: number | null; // NEW: which point is currently selected
  uncommittedPointIndex?: number | null; // NEW: which point is uncommitted (blue)
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  containerRef,
  modelFile,
  selectedPoints,
  onPointSelect,
  selectedPointIndex = null,
  uncommittedPointIndex = null,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouse = useRef<THREE.Vector2>(new THREE.Vector2());
  

  // Main initialization effect
  useEffect(() => {
    if (!containerRef.current || !modelFile) return;

    // Use mountRef to avoid re-mounting on containerRef changes
    if (!mountRef.current) {
      mountRef.current = containerRef.current;
    }

    // Basic Three.js setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    rendererRef.current = renderer;

    // Clear container and append renderer
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

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
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
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
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
      controlsRef.current?.dispose();
    };
  }, [containerRef, modelFile]);


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
    if (!sceneRef.current || !modelRef.current) {
      return;
    }

    // Clear old points from scene
    const oldPoints = sceneRef.current.children.filter(
      (child) => child.userData.isSelectionPoint
    );
    oldPoints.forEach((point) => sceneRef.current!.remove(point));

    // Add new points with different visual states
    selectedPoints.forEach((point, index) => {
      if (point) {
        console.log(`Adding visual marker for point ${index}:`, point);
        
        // Determine visual state
        const isUncommitted = index === uncommittedPointIndex;
        const isSelected = index === selectedPointIndex;
        
        // Size and color based on state
        let size = 0.08;
        let color = 0xff0000; // Default red for saved points
        let opacity = 0.8;
        
        if (isUncommitted) {
          color = 0x4169E1; // Royal blue for uncommitted
          size = 0.09;
          opacity = 0.9;
        } else if (isSelected) {
          color = 0xFFA500; // Orange for selected
          size = 0.12; // Larger for selected
          opacity = 1.0;
        }
        
        const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ 
          color: color,
          transparent: true,
          opacity: opacity
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        // Convert from local model coordinates to world coordinates
        const worldPosition = new THREE.Vector3(point.x, point.y, point.z);
        modelRef.current!.localToWorld(worldPosition);
        
        sphere.position.copy(worldPosition);
        sphere.userData.isSelectionPoint = true;
        
        // Add a small label number (skip for uncommitted to make it clearer)
        if (!isUncommitted) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = 64;
            canvas.height = 64;
            context.fillStyle = isSelected ? '#FFA500' : 'white';
            context.font = 'bold 48px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText((index + 1).toString(), 32, 32);
            
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
      }
    });
  }, [selectedPoints, modelRef.current, selectedPointIndex, uncommittedPointIndex]);

  return null;
};

export default ModelViewer;