'use client'

import { useEffect, useRef, useState } from 'react'
import { Box } from '@chakra-ui/react'

interface VideoBackgroundProps {
  src: string
  poster?: string
  fallbackBg?: string
  className?: string
}

export default function VideoBackground({ src, poster, fallbackBg, className }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    console.log('VideoBackground: Initializing video with src:', src)

    const handleLoadStart = () => {
      console.log('VideoBackground: Video load started')
    }

    const handleLoadedData = () => {
      console.log('VideoBackground: Video data loaded')
    }

    const handleCanPlay = () => {
      console.log('VideoBackground: Video can play')
      if (!isLoaded) {
        video.play().catch((error) => {
          console.error('VideoBackground: Autoplay failed:', error)
          // Try to play on user interaction
          const playOnInteraction = () => {
            video.play().catch(console.error)
            document.removeEventListener('click', playOnInteraction)
            document.removeEventListener('touchstart', playOnInteraction)
            setUserInteracted(true)
          }

          if (!userInteracted) {
            document.addEventListener('click', playOnInteraction, { once: true })
            document.addEventListener('touchstart', playOnInteraction, { once: true })
          }
        });
      }
      setIsLoaded(true)
      setHasError(false)
    }

    const handleError = (e: Event) => {
      console.error('VideoBackground: Video failed to load:', e)
      console.error('VideoBackground: Video error details:', video.error)
      setHasError(true)
      setIsLoaded(false)
    }

    const handleLoadedMetadata = () => {
      console.log('VideoBackground: Video metadata loaded')
    }

    // Add multiple event listeners for better debugging
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    // If video has already loaded enough data by the time this effect runs
    if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        handleCanPlay();
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [src, isLoaded]) // Added src to dependency array

  const handleContainerClick = () => {
    const video = videoRef.current
    if (video && !userInteracted) {
      video.play().catch(console.error)
      setUserInteracted(true)
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
      cursor={!userInteracted && !isLoaded ? 'pointer' : 'default'}
      className={className}
    >
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
          opacity: isLoaded && !hasError ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Show poster image if video fails to load */}
      {hasError && poster && (
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          bgImage={`url(${poster})`}
          bgSize="cover"
          bgPosition="center"
          bgRepeat="no-repeat"
        />
      )}
    </Box>
  )
}