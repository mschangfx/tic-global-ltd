'use client'

import { Box } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

interface DebugVideoBackgroundProps {
  src: string
  poster?: string
  fallbackBg?: string
  className?: string
}

export default function DebugVideoBackground({ 
  src, 
  poster, 
  fallbackBg,
  className 
}: DebugVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoState, setVideoState] = useState<'loading' | 'playing' | 'error' | 'fallback'>('loading')
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    console.log(`DebugVideoBackground: ${message}`)
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    addDebugInfo(`Initializing video with src: ${src}`)

    const handleLoadStart = () => {
      addDebugInfo('Load started')
      setVideoState('loading')
    }

    const handleLoadedData = () => {
      addDebugInfo('Data loaded')
    }

    const handleLoadedMetadata = () => {
      addDebugInfo('Metadata loaded')
    }

    const handleCanPlay = () => {
      addDebugInfo('Can play - attempting to play')
      video.play()
        .then(() => {
          addDebugInfo('Playing successfully')
          setVideoState('playing')
        })
        .catch((error) => {
          addDebugInfo(`Play failed: ${error.message}`)
          setVideoState('error')
        })
    }

    const handleError = (e: Event) => {
      const errorDetails = video.error ? 
        `Code: ${video.error.code}, Message: ${video.error.message}` : 
        'Unknown error'
      addDebugInfo(`Video error: ${errorDetails}`)
      setVideoState('error')
    }

    const handlePlaying = () => {
      addDebugInfo('Video is playing')
      setVideoState('playing')
    }

    const handleStalled = () => {
      addDebugInfo('Video stalled')
    }

    const handleWaiting = () => {
      addDebugInfo('Video waiting for data')
    }

    // Add all event listeners
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('stalled', handleStalled)
    video.addEventListener('waiting', handleWaiting)

    // Check if video is already ready
    if (video.readyState >= 3) {
      addDebugInfo('Video already ready, attempting to play')
      handleCanPlay()
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('stalled', handleStalled)
      video.removeEventListener('waiting', handleWaiting)
    }
  }, [src])

  const handleContainerClick = () => {
    const video = videoRef.current
    if (video && videoState !== 'playing') {
      addDebugInfo('Container clicked - attempting to play')
      video.play().catch((error) => {
        addDebugInfo(`Manual play failed: ${error.message}`)
      })
    }
  }

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
      onClick={handleContainerClick}
      cursor={videoState !== 'playing' ? 'pointer' : 'default'}
      className={className}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
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
          opacity: videoState === 'playing' ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Debug Info Overlay */}
      <Box
        position="absolute"
        top="20px"
        left="20px"
        bg="blackAlpha.800"
        color="white"
        p={3}
        borderRadius="md"
        fontSize="sm"
        fontFamily="monospace"
        zIndex={10}
        maxW="400px"
      >
        <Box fontWeight="bold" mb={2}>Video Debug Info:</Box>
        <Box>State: {videoState}</Box>
        <Box>Source: {src}</Box>
        <Box mt={2}>
          {debugInfo.map((info, index) => (
            <Box key={index} fontSize="xs" opacity={0.8}>
              {info}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Loading State */}
      {videoState === 'loading' && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          color="white"
          fontSize="lg"
          fontWeight="bold"
          zIndex={2}
        >
          Loading video... (Click to try manual play)
        </Box>
      )}

      {/* Error State */}
      {videoState === 'error' && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          color="red.300"
          fontSize="lg"
          fontWeight="bold"
          zIndex={2}
          textAlign="center"
        >
          Video failed to load
          <Box fontSize="sm" mt={2}>
            Click to retry
          </Box>
        </Box>
      )}
    </Box>
  )
}
