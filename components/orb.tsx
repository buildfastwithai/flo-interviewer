"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import useVapi from "@/hooks/use-vapi";

interface OrbProps {
  volumeLevel: number;
  isSessionActive: boolean;
  toggleCall: () => void;
  conversation: any[];
}

const Orb: React.FC<OrbProps> = ({
  volumeLevel,
  isSessionActive,
  toggleCall,
  conversation
}) => {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const originalPositionsRef = useRef<any | null>(null);
  const noise = createNoise3D();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // console.log("Initializing visualization...");
    initViz();
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  useEffect(() => {
    if (isSessionActive && ballRef.current) {
      // console.log("Session is active, morphing the ball");
      updateBallMorph(ballRef.current, volumeLevel);
      
      // Change orb color during active session
      if (ballRef.current && ballRef.current.material instanceof THREE.MeshLambertMaterial) {
        ballRef.current.material.color.set(0x3b82f6); // Blue color
        ballRef.current.material.emissive = new THREE.Color(0x1e40af);
        ballRef.current.material.emissiveIntensity = 0.2 + volumeLevel * 0.3;
      }
    } else if (
      !isSessionActive &&
      ballRef.current &&
      originalPositionsRef.current
    ) {
      // console.log("Session ended, resetting the ball");
      resetBallMorph(ballRef.current, originalPositionsRef.current);
      
      // Reset color when inactive
      if (ballRef.current && ballRef.current.material instanceof THREE.MeshLambertMaterial) {
        ballRef.current.material.color.set(isHovering ? 0x4f46e5 : 0xffffff);
        ballRef.current.material.emissive = new THREE.Color(0x000000);
        ballRef.current.material.emissiveIntensity = 0;
      }
    }
  }, [volumeLevel, isSessionActive]);

  // Handle hover effects
  useEffect(() => {
    if (ballRef.current && !isSessionActive && ballRef.current.material instanceof THREE.MeshLambertMaterial) {
      if (isHovering) {
        ballRef.current.material.color.set(0x4f46e5); // Indigo on hover
        ballRef.current.material.emissive = new THREE.Color(0x3730a3);
        ballRef.current.material.emissiveIntensity = 0.2;
      } else {
        ballRef.current.material.color.set(0xffffff); // White when not hovering
        ballRef.current.material.emissive = new THREE.Color(0x000000);
        ballRef.current.material.emissiveIntensity = 0;
      }
    }
  }, [isHovering, isSessionActive]);

  const initViz = () => {
    // console.log("Initializing Three.js visualization...");
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      100,
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(scene.position);

    scene.add(camera);
    sceneRef.current = scene;
    groupRef.current = group;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 8);
    const lambertMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ballRef.current = ball;

    // Store the original positions of the vertices
    originalPositionsRef.current =
      ball.geometry.attributes.position.array.slice();

    // Add a glow effect
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        "c": { value: 0.2 },
        "p": { value: 4.0 },
        glowColor: { value: new THREE.Color(0x3b82f6) },
        viewVector: { value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.9 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const glowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(12, 32, 32),
      glowMaterial
    );
    
    group.add(ball);
    group.add(glowSphere);

    // Add more ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional lighting for better definition
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 1, 1);
    scene.add(dirLight);

    // Soft blue spot light from above
    const spotLight = new THREE.SpotLight(0x4f46e5, 0.8);
    spotLight.position.set(0, 40, 20);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.3;
    spotLight.lookAt(ball.position);
    spotLight.castShadow = true;
    scene.add(spotLight);

    scene.add(group);

    const outElement = document.getElementById("out");
    if (outElement) {
      outElement.innerHTML = ""; // Clear any existing renderer
      outElement.appendChild(renderer.domElement);
      renderer.setSize(outElement.clientWidth, outElement.clientHeight);
    }

    render();
  };

  const render = () => {
    if (
      !groupRef.current ||
      !ballRef.current ||
      !cameraRef.current ||
      !rendererRef.current ||
      !sceneRef.current
    ) {
      return;
    }

    groupRef.current.rotation.y += 0.005;
    groupRef.current.rotation.x += 0.001;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestAnimationFrame(render);
  };

  const onWindowResize = () => {
    if (!cameraRef.current || !rendererRef.current) return;

    const outElement = document.getElementById("out");
    if (outElement) {
      cameraRef.current.aspect =
        outElement.clientWidth / outElement.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        outElement.clientWidth,
        outElement.clientHeight,
      );
    }
  };

  const updateBallMorph = (mesh: THREE.Mesh, volume: number) => {
    // console.log("Morphing the ball with volume:", volume);
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");

    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i),
      );

      const offset = 10; // Radius of the icosahedron
      const amp = 3.0; // Increased amplitude for more dramatic effect
      const time = window.performance.now();
      vertex.normalize();
      const rf = 0.00001;
      const distance =
        offset +
        volume * 5 + // Amplify volume effect
        noise(
          vertex.x + time * rf * 7,
          vertex.y + time * rf * 8,
          vertex.z + time * rf * 9,
        ) *
          amp *
          volume;
      vertex.multiplyScalar(distance);

      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  const resetBallMorph = (
    mesh: THREE.Mesh,
    originalPositions: Float32Array,
  ) => {
    // console.log("Resetting the ball to its original shape");
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");

    for (let i = 0; i < positionAttribute.count; i++) {
      positionAttribute.setXYZ(
        i,
        originalPositions[i * 3],
        originalPositions[i * 3 + 1],
        originalPositions[i * 3 + 2],
      );
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        id="out"
        className="hover:cursor-pointer w-full h-full"
        onClick={toggleCall}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        ref={containerRef}
      ></div>
      {isSessionActive && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-1.5 items-center">
            {/* <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> */}
            {/* <span className="text-sm text-white/70">Recording in progress</span> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orb;
