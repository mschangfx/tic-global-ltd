'use client'

import { useEffect, useRef, useState } from 'react'
import { Box } from '@chakra-ui/react'
import NextImage from 'next/image'

interface RobustVideoBackgroundProps {
  src: string
  poster?: string
  fallbackBg?: string
  className?: string
}

export default function RobustVideoBackground({ 
  src, 
  poster, 
  fallbackBg,
  className 
}: RobustVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoState, setVideoState] = useState<'loading' | 'playing' | 'error' | 'fallback'>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    console.log(`RobustVideoBackground: Loading video ${src} (attempt ${retryCount + 1})`)

    const handleLoadStart = () => {
      console.log('RobustVideoBackground: Load started')
      setVideoState('loading')
    }

    const handleCanPlay = () => {
      console.log('RobustVideoBackground: Can play')
      video.play()
        .then(() => {
          console.log('RobustVideoBackground: Playing successfully')
          setVideoState('playing')
        })
        .catch((error) => {
          console.error('RobustVideoBackground: Play failed:', error)
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
            }, 1000)
          } else {
            setVideoState('fallback')
          }
        })
    }

    const handleError = (e: Event) => {
      console.error('RobustVideoBackground: Video error:', e)
      if (video.error) {
        console.error('RobustVideoBackground: Error details:', {
          code: video.error.code,
          message: video.error.message
        })
      }
      
      if (retryCount < maxRetries) {
        console.log(`RobustVideoBackground: Retrying... (${retryCount + 1}/${maxRetries})`)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 2000)
      } else {
        console.log('RobustVideoBackground: Max retries reached, using fallback')
        setVideoState('fallback')
      }
    }

    const handlePlaying = () => {
      console.log('RobustVideoBackground: Video is playing')
      setVideoState('playing')
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('playing', handlePlaying)

    // Force reload if retrying
    if (retryCount > 0) {
      video.load()
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('playing', handlePlaying)
    }
  }, [src, retryCount, maxRetries])

  const handleContainerClick = () => {
    const video = videoRef.current
    if (video && videoState === 'loading') {
      video.play().catch(console.error)
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

      {/* Poster Image Fallback */}
      {(videoState === 'fallback' || videoState === 'error') && poster && (
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          zIndex={1}
        >
          <NextImage
            src={poster}
            alt="Background"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </Box>
      )}

      {/* Loading State */}
      {videoState === 'loading' && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          color="white"
          fontSize="sm"
          opacity={0.7}
          zIndex={2}
        >
          Loading video...
        </Box>
      )}
    </Box>
  )
}
