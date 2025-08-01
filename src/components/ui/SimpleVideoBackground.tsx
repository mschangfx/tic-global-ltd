'use client'

import { Box } from '@chakra-ui/react'

interface SimpleVideoBackgroundProps {
  src: string
  poster?: string
  fallbackBg?: string
}

export default function SimpleVideoBackground({ src, poster, fallbackBg }: SimpleVideoBackgroundProps) {
  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      w="100%"
      h="100%"
      zIndex={0}
      overflow="hidden"
      bg={fallbackBg || 'linear-gradient(135deg, #0c151e 0%, #14c3cb 50%, #E0B528 100%)'}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={poster}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={(e) => {
          console.error('SimpleVideoBackground: Video error:', e)
        }}
        onLoadStart={() => {
          console.log('SimpleVideoBackground: Video load started')
        }}
        onCanPlay={() => {
          console.log('SimpleVideoBackground: Video can play')
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </Box>
  )
}
