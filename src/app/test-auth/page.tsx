'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Box, Button, Text, VStack } from '@chakra-ui/react'

export default function TestAuthPage() {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const { data: session, status } = useSession()

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  if (status === 'loading') return <Text>Loading...</Text>

  return (
    <Box p={8}>
      <VStack spacing={4}>
        <Text fontSize="xl">NextAuth Test Page</Text>
        
        {session ? (
          <>
            <Text>Signed in as {session.user?.email}</Text>
            <Button onClick={() => signOut()}>Sign out</Button>
          </>
        ) : (
          <>
            <Text>Not signed in</Text>
            <Button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>Sign in with Google</Button>
          </>
        )}
        
        <Box as="pre" fontSize="sm">
          {JSON.stringify(session, null, 2)}
        </Box>
      </VStack>
    </Box>
  )
}
