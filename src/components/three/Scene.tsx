'use client'

import { Canvas } from '@react-three/fiber'
import { MeshDistortMaterial, OrbitControls, PresentationControls, RoundedBox, Stage } from '@react-three/drei'
import { Suspense } from 'react'

export function Scene() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5}>
          <PresentationControls>
            <RoundedBox args={[1, 1, 1]} radius={0.1}>
              <MeshDistortMaterial color="#7c4dff" speed={2} distort={0.4} />
            </RoundedBox>
          </PresentationControls>
        </Stage>
      </Suspense>
      <OrbitControls autoRotate autoRotateSpeed={1} enableZoom={false} />
    </Canvas>
  )
}
