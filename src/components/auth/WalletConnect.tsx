'use client'

import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Image,
  useDisclosure,
  useToast,
  Box,
  Spinner,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FaWallet } from 'react-icons/fa'

interface WalletOption {
  name: string
  icon: string
  id: string
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    name: 'MetaMask',
    icon: '/wallets/metamask.svg',
    id: 'metamask',
  },
  {
    name: 'WalletConnect',
    icon: '/wallets/walletconnect.svg',
    id: 'walletconnect',
  },
  {
    name: 'Coinbase Wallet',
    icon: '/wallets/coinbase.svg',
    id: 'coinbase',
  },
]

interface WalletConnectProps {
  onConnect?: (address: string) => void
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isConnecting, setIsConnecting] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const toast = useToast()

  const handleWalletConnect = async (walletId: string) => {
    setIsConnecting(true)
    setSelectedWallet(walletId)

    try {
      // Simulate wallet connection - replace with actual wallet integration
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock wallet address - replace with actual wallet connection
      const mockAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45'
      
      toast({
        title: 'Wallet Connected',
        description: `Successfully connected to ${walletId}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      onConnect?.(mockAddress)
      onClose()
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect wallet. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsConnecting(false)
      setSelectedWallet(null)
    }
  }

  return (
    <>
      <Button
        leftIcon={<FaWallet />}
        colorScheme="blue"
        size="lg"
        onClick={onOpen}
        bgGradient="linear(to-r, blue.400, purple.500)"
        _hover={{
          bgGradient: 'linear(to-r, blue.500, purple.600)',
          transform: 'translateY(-2px)',
        }}
        transition="all 0.2s"
      >
        Connect Wallet
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Connect Your Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text mb={6} color="gray.600">
              Choose your preferred wallet to connect to TIC GLOBAL
            </Text>
            <VStack spacing={4}>
              {WALLET_OPTIONS.map((wallet) => (
                <Button
                  key={wallet.id}
                  w="full"
                  h="60px"
                  variant="outline"
                  justifyContent="flex-start"
                  onClick={() => handleWalletConnect(wallet.id)}
                  isLoading={isConnecting && selectedWallet === wallet.id}
                  loadingText="Connecting..."
                  isDisabled={isConnecting}
                  _hover={{
                    bg: 'gray.50',
                    borderColor: 'blue.300',
                  }}
                >
                  <HStack spacing={4} w="full">
                    <Box
                      w="40px"
                      h="40px"
                      bg="gray.100"
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isConnecting && selectedWallet === wallet.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Text fontSize="lg">🔗</Text>
                      )}
                    </Box>
                    <Text fontWeight="medium">{wallet.name}</Text>
                  </HStack>
                </Button>
              ))}
            </VStack>
            <Text mt={6} fontSize="sm" color="gray.500" textAlign="center">
              By connecting your wallet, you agree to our Terms of Service and Privacy Policy
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}