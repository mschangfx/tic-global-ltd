'use client'

import { useEffect, useRef, useState } from 'react'

interface VideoBackgroundProps {
  src: string
  fallbackBg?: string
}

export default function VideoBackground({ src, fallbackBg }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set video to load immediately
    video.load()

    const handleCanPlay = () => {
      console.log('Video can play')
      setIsLoaded(true)
      // Try to play the video immediately
      video.play().catch((error) => {
        console.error('Autoplay failed:', error)
        // Autoplay failed, but video is still loaded
      })
    }

    const handleLoadStart = () => {
      console.log('Video loading started')
    }

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded')
      setIsLoaded(true)
    }

    const handleCanPlayThrough = () => {
      console.log('Video can play through')
      setIsLoaded(true)
    }

    const handleError = () => {
      console.error('Video failed to load')
      setIsLoaded(false)
    }

    // Use multiple events for faster loading detection
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('error', handleError)
    }
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        background: isLoaded ? 'transparent' : (fallbackBg || 'linear-gradient(135deg, #0c151e 0%, #14c3cb 50%, #ffd700 100%)'),
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  )
}