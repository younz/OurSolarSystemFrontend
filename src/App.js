import { useGLTF, useTexture, useAnimations } from '@react-three/drei';
import React, { useEffect, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { PointLight, Box3, Vector3 } from 'three';
import * as THREE from 'three';


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


  const Model = ({ modelPath, scale = 0.01, speed = 1, horizonId = 399 }) => {
    const gltf = useLoader(GLTFLoader, modelPath);
    const sizeScalar = 1;
    const modelRef = useRef(); 
    const planetRef = useRef();
    const planetData = useRef();
    const ephemerisLength = useRef();
    const currentIndex = useRef(0);
    const nextIndex = useRef(1);
    let elapsedTime = 0;
  
    const [startPosition, setStartPosition] = useState(new THREE.Vector3(0, 0, 0)); // State for start position
  
    // Initialize position references
    const positionRef = useRef(new THREE.Vector3(0, 0, 0)); // Current position
    const targetRef = useRef(new THREE.Vector3(0, 0, 0)); // Target position
    const lerpVector = new THREE.Vector3(); // Helper vector for lerping
    const dataFetched = useRef(false)

    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`http://localhost:5259/api/mysql/get-planet-locations-by-horizon-id?horizonId=${horizonId}`);
          const json = await response.json();
          console.log(json)
      
          planetData.current = json;
          ephemerisLength.current = planetData.current.ephemeris.length
          console.log(ephemerisLength.current)
          const initialPosition = new THREE.Vector3(
            planetData.current.ephemeris[0].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[0].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[0].scaledPositionZ * sizeScalar
          );


          setStartPosition(initialPosition);
          modelRef.current.position.copy(startPosition);
          positionRef.current.set(
            planetData.current.ephemeris[0].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[0].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[0].scaledPositionZ * sizeScalar
          );
          targetRef.current.set(
            planetData.current.ephemeris[1].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[1].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[1].scaledPositionZ * sizeScalar
          );

          dataFetched.current = true

        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
  
      fetchData();
    },  []);
  
    // Use frame to update position
    useFrame((_, delta) => {
      if (!dataFetched.current) return;
      if (modelRef.current) {
        const distance = positionRef.current.distanceTo(targetRef.current);
        const threshold = 0.0001;
        if (distance < threshold) {
          currentIndex.current = currentIndex.current + 1;
          nextIndex.current = nextIndex.current + 1;

          if (ephemerisLength.current <= nextIndex.current) {
            currentIndex.current = 0;
            nextIndex.current = 1;
  
          }

          positionRef.current.set(
            planetData.current.ephemeris[currentIndex.current].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[currentIndex.current].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[currentIndex.current].scaledPositionZ * sizeScalar
          );
          console.log(positionRef.current)
          targetRef.current.set(
            planetData.current.ephemeris[nextIndex.current].scaledPositionX * sizeScalar,
            planetData.current.ephemeris[nextIndex.current].scaledPositionY * sizeScalar,
            planetData.current.ephemeris[nextIndex.current].scaledPositionZ * sizeScalar
          );
    
    
      
        } else {
          elapsedTime += delta;
          const alpha = Math.min(1, elapsedTime / 0.01); // desiredDuration in seconds
    
          // Interpolate between the current and target position
          lerpVector.copy(positionRef.current).lerp(targetRef.current, 0.1)
   
          // Update the positionRef
          positionRef.current.copy(lerpVector);
    
          // Apply the interpolated position to the model
          modelRef.current.position.lerp(positionRef.current, 0.1);
        }
      }
    });
  
    return (
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={scale}
        position={startPosition} // Initial position
      />
    );
  };
  

 
  
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
  const currentIndex = useRef(0);
  const nextIndex = useRef(1);

  const timeMultiplier = useRef(500);
  const dayInSeconds = 24 / 60 / 60;




  return (
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
        minDistance={1}
        maxDistance={500}
       
      />
   
      <Sun modelPath={"planets/sun1.glb"}/>
      <Model modelPath={"/planets/earth.glb"} scale={0.001}/>
      <Model modelPath={"/planets/mercury.glb"} horizonId={199} scale={0.001}/>
      <Model modelPath={"/planets/venus.glb"} horizonId={299} scale={0.001}/>
      <Model modelPath={"/planets/mars.glb"} horizonId={499} scale={0.001}/>
      <Model modelPath={"/planets/jupiter.glb"} horizonId={599} scale={0.01}/>
      <Model modelPath={"/planets/saturn.glb"} horizonId={699} scale={0.01}/>
      <Model modelPath={"/planets/uranus.glb"} horizonId={799} scale={0.01}/>
      <Model modelPath={"/planets/neptune.glb"} horizonId={899} scale={0.01}/>
      <Model modelPath={"/planets/pluto.glb"} horizonId={999} scale={0.05}/>
      



      {/* <OrbitingObject
        modelFilePath={"/planets/earth.glb"}
        horizonId={399}
        timeMultiplier={timeMultiplier}
      /> */}
      <SunLightSource position={[0, 0, 0]}/>

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </Canvas>
  );
}

export default App;