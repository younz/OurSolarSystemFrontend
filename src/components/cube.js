import * as THREE from 'three';
import { useEffect, useRef } from "react";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import spaceBackground from '../textures/space-background-one.jpg'; // Adjust the path as needed

function MyThree() {
  const refContainer = useRef(null);

  useEffect(() => {
    // === THREE.JS CODE START ===
    const scene = new THREE.Scene();

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5); // Set camera position

    // Create renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (refContainer.current) {
      refContainer.current.appendChild(renderer.domElement);
    }

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Enable smooth motion
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.7; // Adjust rotation speed
    controls.minDistance = 1; // Set min zoom distance
    controls.maxDistance = 500; // Set max zoom distance
    controls.enablePan = true; // Disable panning (optional)
    controls.enableRotate = true;
    controls.update(); // Ensure controls are updated

    // Load background texture
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      spaceBackground, // Texture path
      () => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        console.log("Texture loaded successfully!");
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + "% loaded");
      },
      (error) => {
        console.error("Error loading texture:", error);
      }
    );

    // Add a sphere to the scene for visual feedback
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Create an animation loop to render the scene continuously
    function animate() {
      requestAnimationFrame(animate);
      controls.update(); // Ensure controls are updated
      renderer.render(scene, camera);
    }
    animate();

    // Handle resizing of the window
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose(); // Dispose controls
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={refContainer}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    ></div>
  );
}

export default MyThree;






