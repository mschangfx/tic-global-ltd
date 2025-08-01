/// <reference types="@react-three/fiber" />
import { Vector3 } from 'three'
import { MeshPhysicalMaterial, Mesh } from 'three'
import { Object3DNode } from '@react-three/fiber'
import '@react-three/fiber'
import * as THREE from 'three'

declare module '@react-three/fiber' {
  interface ThreeElements {
    ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
    pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>
    directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
    spotLight: Object3DNode<THREE.SpotLight, typeof THREE.SpotLight>

    mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>
    boxGeometry: Object3DNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
    sphereGeometry: Object3DNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
    planeGeometry: Object3DNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
    coneGeometry: Object3DNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>
    cylinderGeometry: Object3DNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
    circleGeometry: Object3DNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>
    tubeGeometry: Object3DNode<THREE.TubeGeometry, typeof THREE.TubeGeometry>
    torusGeometry: Object3DNode<THREE.TorusGeometry, typeof THREE.TorusGeometry>
    torusKnotGeometry: Object3DNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>
    dodecahedronGeometry: Object3DNode<THREE.DodecahedronGeometry, typeof THREE.DodecahedronGeometry>
    icosahedronGeometry: Object3DNode<THREE.IcosahedronGeometry, typeof THREE.IcosahedronGeometry>
    octahedronGeometry: Object3DNode<THREE.OctahedronGeometry, typeof THREE.OctahedronGeometry>
    tetrahedronGeometry: Object3DNode<THREE.TetrahedronGeometry, typeof THREE.TetrahedronGeometry>
    latheGeometry: Object3DNode<THREE.LatheGeometry, typeof THREE.LatheGeometry>
    extrudeGeometry: Object3DNode<THREE.ExtrudeGeometry, typeof THREE.ExtrudeGeometry>
    shapeGeometry: Object3DNode<THREE.ShapeGeometry, typeof THREE.ShapeGeometry>

    meshStandardMaterial: Object3DNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
    meshPhysicalMaterial: Object3DNode<THREE.MeshPhysicalMaterial, typeof THREE.MeshPhysicalMaterial>
    meshBasicMaterial: Object3DNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>
    meshLambertMaterial: Object3DNode<THREE.MeshLambertMaterial, typeof THREE.MeshLambertMaterial>
    meshPhongMaterial: Object3DNode<THREE.MeshPhongMaterial, typeof THREE.MeshPhongMaterial>
    meshToonMaterial: Object3DNode<THREE.MeshToonMaterial, typeof THREE.MeshToonMaterial>
    meshMatcapMaterial: Object3DNode<THREE.MeshMatcapMaterial, typeof THREE.MeshMatcapMaterial>
    shaderMaterial: Object3DNode<THREE.ShaderMaterial, typeof THREE.ShaderMaterial>
    rawShaderMaterial: Object3DNode<THREE.RawShaderMaterial, typeof THREE.RawShaderMaterial>
    pointsMaterial: Object3DNode<THREE.PointsMaterial, typeof THREE.PointsMaterial>
    lineBasicMaterial: Object3DNode<THREE.LineBasicMaterial, typeof THREE.LineBasicMaterial>
    lineDashedMaterial: Object3DNode<THREE.LineDashedMaterial, typeof THREE.LineDashedMaterial>

    // Add any other specific Three.js elements you might use directly
  }
}
