'use client';

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Box,
  useToast,
  Spinner,
  HStack,
  Text
} from '@chakra-ui/react';
import { createClient } from '@/lib/supabase/client';

interface BalanceRefreshNotificationProps {
  userEmail: string;
  onBalanceUpdate?: (newBalance: number) => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    depositId: string;
    amount: number;
    method: string;
    newBalance?: number;
  };
  read: boolean;
  created_at: string;
}

export default function BalanceRefreshNotification({ 
  userEmail, 
  onBalanceUpdate 
}: BalanceRefreshNotificationProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const toast = useToast();
  const supabase = createClient();

  // Check for new notifications
  const checkForNotifications = async () => {
    try {
      const response = await fetch(`/api/deposits/notify-completion?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      if (data.success && data.notifications) {
        const newNotifications = data.notifications.filter((notif: Notification) => 
          new Date(notif.created_at) > lastChecked && !notif.read
        );

        if (newNotifications.length > 0) {
          setNotifications(prev => [...newNotifications, ...prev]);
          setLastChecked(new Date());

          // Show toast for new deposits
          newNotifications.forEach((notif: Notification) => {
            toast({
              title: '💰 Deposit Completed!',
              description: `$${notif.data.amount} has been added to your wallet`,
              status: 'success',
              duration: 5000,
              isClosable: true,
            });
          });

          // Trigger balance update if callback provided
          if (onBalanceUpdate && newNotifications[0]?.data?.newBalance) {
            onBalanceUpdate(newNotifications[0].data.newBalance);
          }
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Refresh wallet balance
  const refreshBalance = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();

      if (data.wallet) {
        const newBalance = parseFloat(data.wallet.total_balance);
        
        if (onBalanceUpdate) {
          onBalanceUpdate(newBalance);
        }

        toast({
          title: '✅ Balance Updated',
          description: `Current balance: $${newBalance.toFixed(2)}`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
      toast({
        title: '❌ Refresh Failed',
        description: 'Unable to refresh balance. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // Auto-check for notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkForNotifications, 30000);
    
    // Initial check
    checkForNotifications();

    return () => clearInterval(interval);
  }, [userEmail, lastChecked]);

  // Show unread notifications
  const unreadNotifications = notifications.filter(notif => !notif.read);

  return (
    <Box>
      {/* Show unread deposit notifications */}
      {unreadNotifications.map((notification) => (
        <Alert
          key={notification.id}
          status="success"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="auto"
          mb={4}
          borderRadius="md"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            {notification.title}
          </AlertTitle>
          <AlertDescription maxWidth="sm" mb={4}>
            {notification.message}
          </AlertDescription>
          <HStack spacing={2}>
            <Button
              size="sm"
              colorScheme="green"
              onClick={refreshBalance}
              isLoading={isRefreshing}
              loadingText="Refreshing..."
            >
              🔄 Refresh Balance
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAsRead(notification.id)}
            >
              Dismiss
            </Button>
          </HStack>
        </Alert>
      ))}

      {/* Manual refresh button */}
      <Box textAlign="center" mt={4}>
        <Button
          size="sm"
          variant="ghost"
          onClick={refreshBalance}
          isLoading={isRefreshing}
          leftIcon={isRefreshing ? <Spinner size="sm" /> : undefined}
        >
          {isRefreshing ? 'Refreshing Balance...' : '🔄 Check for Balance Updates'}
        </Button>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
}
