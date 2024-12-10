import { useGLTF, useTexture, useAnimations } from '@react-three/drei';
import React, { useEffect, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { useSpring, a } from '@react-spring/three';
import { PointLight, Box3, Vector3 } from 'three';
import * as THREE from 'three';

  function smoothDamp(current, target, velocity, smoothTime, deltaTime) {
    const omega = 2.0 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1.0 / (1.0 + x + 0.48 * x ** 2 + 0.235 * x ** 3);
    const change = current.clone().sub(target); // Vector3 difference
    const temp = velocity.clone().add(change.multiplyScalar(omega * deltaTime));
    const newVelocity = velocity.clone().sub(temp.multiplyScalar(omega * deltaTime)).multiplyScalar(exp);
    const newPosition = target.clone().add(change.add(temp).multiplyScalar(exp));
    
    return [newPosition, newVelocity];
  }

  function Skybox() {
    const { scene } = useThree();
    
    const texture = useLoader(EXRLoader, "space-bg.exr"); 
  
    useEffect(() => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
  
      return () => {
        scene.background = null; 
      };
    }, [scene, texture]);
  
    return null; 
  }

  const Sun = ({ modelPath, position = [0, 0, 0], scale = 5, rotationSpeed = 0.01 }) => {
    // Load the GLTF model using the useLoader hook
    const gltf = useLoader(GLTFLoader, modelPath);
    const modelRef = useRef();
  
    // Rotate the model on each frame
    useFrame(() => {
      if (modelRef.current) {
        modelRef.current.rotation.y += rotationSpeed;
      }
    });
  
    return (
      <>
        <primitive object={gltf.scene} position={position} scale={scale} ref={modelRef} />
        <OrbitControls />
      </>
    );
  };

  const Slider = ({ value, onChange }) => {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '10px', // Position at the bottom
          left: '50%', // Horizontally center the slider
          transform: 'translateX(-50%)', // Offset to truly center the element
          width: '300px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Translucent background
          padding: '10px',
          borderRadius: '8px',
          color: 'white',
          zIndex: 100, // Ensure it overlays the canvas
        }}
      >
        <label htmlFor="slider" style={{ display: 'block', marginBottom: '5px' }}>
          {value}
        </label>
        <input
          id="slider"
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={onChange}
          style={{ width: '100%' }}
        />
      </div>
    );
  };

  const Model = ({ modelPath, speed = 5, scale = 0.01, horizonId = 399, rotationSpeed = 0.01 }) => {
    const gltf = useLoader(GLTFLoader, modelPath);
    const sizeScalar = 1;
    const objectRef = useRef(); 
    const planetData = useRef();
    const dataLength = useRef();
    const currentIndex = useRef(0);
    const nextIndex = useRef(1);
    const [startPosition, setStartPosition] = useState(new THREE.Vector3(0, 0, 0));
  
    const currentPosition = useRef(new THREE.Vector3(0, 0, 0));
    const targetPosition = useRef(new THREE.Vector3(0, 0, 0));
    const dataIsFetched = useRef(false)

    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`http://localhost:5259/api/mysql/get-planet-locations-by-horizon-id?horizonId=${horizonId}`);
          const json = await response.json();
          console.log(json)
      
          planetData.current = json;
          dataLength.current = planetData.current.ephemeris.length
          objectRef.current.position.set(
            planetData.current.ephemeris[0].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[0].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[0].scaledPositionZ * sizeScalar
          );
          targetPosition.current.set(
            planetData.current.ephemeris[1].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[1].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[1].scaledPositionZ * sizeScalar
          );

          dataIsFetched.current = true

        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
  
      fetchData();
    },  []);
  
    // Use frame to update position
    useFrame((_, delta) => {
      if (!dataIsFetched.current) return;
  
      const currentPosition = objectRef.current.position.clone();
      const direction = new THREE.Vector3()
          .subVectors(targetPosition.current, currentPosition)
          .normalize();
  
      // Calculate the maximum allowable step distance
      const remainingDistance = currentPosition.distanceTo(targetPosition.current);
      const stepDistance = Math.min(speed * delta, remainingDistance);
  
      currentPosition.add(direction.multiplyScalar(stepDistance));
  
      if (remainingDistance <= stepDistance) {
          // If within step distance, snap to the target and set up the next target
          nextIndex.current = nextIndex.current + 1;

          if (nextIndex.current >= dataLength.current) 
            {
              nextIndex.current = 1;
              objectRef.current.position.set(
                planetData.current.ephemeris[0].scaledPositionX * sizeScalar,
                planetData.current.ephemeris[0].scaledPositionY * sizeScalar,
                planetData.current.ephemeris[0].scaledPositionZ * sizeScalar
              );

              targetPosition.current.set(
                planetData.current.ephemeris[nextIndex.current].scaledPositionX * sizeScalar,
                planetData.current.ephemeris[nextIndex.current].scaledPositionY * sizeScalar,
                planetData.current.ephemeris[nextIndex.current].scaledPositionZ * sizeScalar
            );

            }
          objectRef.current.position.copy(targetPosition.current);
  
          targetPosition.current.set(
              planetData.current.ephemeris[nextIndex.current].scaledPositionX * sizeScalar,
              planetData.current.ephemeris[nextIndex.current].scaledPositionY * sizeScalar,
              planetData.current.ephemeris[nextIndex.current].scaledPositionZ * sizeScalar
          );
  
      } else {
          // Otherwise, update the position and optionally apply rotation
          objectRef.current.position.copy(currentPosition);
          objectRef.current.rotation.y += rotationSpeed;
      }
  });
  
    return (
      <primitive
        ref={objectRef}
        object={gltf.scene}
        scale={scale}
      />
    );
  }
  
  const SunLightSource = ({ position = [0, 0, 0] }) => {
  
    return (
      <>
        {/* Simulate light emission with PointLight */}
        <pointLight
          position={position}
          intensity={5}
          color={new THREE.Color(0xFFFFFF)}
          distance={10000}
          decay={0}
        />
      </>
    );
  };



function App() {
  const [sliderValue, setSliderValue] = useState(5); // Default slider value

  const handleSliderChange = (event) => {
    setSliderValue(event.target.value);
    // Add logic to utilize sliderValue if needed
  };




  return (

    <div>
      <Slider onChange={handleSliderChange} value={sliderValue}/>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <perspectiveCamera makeDefault position={[200, 200, 200]} />
        <Skybox />

        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.7}
          minDistance={250}
          maxDistance={500}
        
        />
    
        <Sun modelPath={"planets/sun1.glb"}/>
        <Model modelPath={"/planets/mercury.glb"} horizonId={199} speed={sliderValue} scale={0.001}/>
        <Model modelPath={"/planets/venus.glb"} horizonId={299} speed={sliderValue} scale={0.001}/>
        <Model modelPath={"/planets/earth.glb"} horizonId={399} speed={sliderValue} scale={0.001}/>
        <Model modelPath={"/planets/mars.glb"} horizonId={499} speed={sliderValue} scale={0.001}/>
        <Model modelPath={"/planets/jupiter.glb"} horizonId={599} speed={sliderValue} scale={0.01}/>
        <Model modelPath={"/planets/saturn.glb"} horizonId={699} speed={sliderValue} scale={0.01}/>
        <Model modelPath={"/planets/uranus.glb"} horizonId={799} speed={sliderValue} scale={0.01}/>
        <Model modelPath={"/planets/neptune.glb"} horizonId={899} speed={sliderValue} scale={0.01}/>
    
        <SunLightSource position={[0, 0, 0]}/>

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
      </Canvas>
    </div>
  );
}

export default App;