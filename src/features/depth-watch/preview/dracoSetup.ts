import { useGLTF } from '@react-three/drei';

/** All Depth Watch GLBs use KHR_draco_mesh_compression — decoder must be set before load. */
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

export const USE_DRACO = true as const;
