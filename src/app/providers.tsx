'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider, createStandaloneToast } from '@chakra-ui/react'

const { ToastContainer } = createStandaloneToast()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider resetCSS>
        {children}
        <ToastContainer />
      </ChakraProvider>
    </CacheProvider>
  )
}
