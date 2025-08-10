'use client';

import {
  Box,
  IconButton,
  Badge,
  useColorModeValue,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  VStack,
  HStack,
  Spinner,
  Button,
  Tooltip,
  Divider,
} from '@chakra-ui/react';
import {
  FaBell,
  FaCheck,
  FaTrash,
  FaEye,
  FaCoins,
  FaUsers,
  FaTrophy,
  FaShieldAlt,
  FaCog,
  FaCheckCircle,
  FaInfoCircle,
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useSafeToast } from '@/hooks/useSafeToast';
import { createClient } from '@/lib/supabase/client';

// Simple date formatting function
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'transaction' | 'deposit' | 'withdrawal' | 'payment' | 'reward' | 'referral' | 'rank_change' | 'verification' | 'security' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

interface NotificationDropdownProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function NotificationDropdown({ size = 'sm' }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const toast = useSafeToast();
  const supabase = createClient();

  // Ensure component only renders on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const iconButtonBg = useColorModeValue('gray.100', 'gray.700');
  const iconButtonHoverBg = useColorModeValue('gray.200', 'gray.600');

  // Load real notifications on component mount and set up auto-refresh
  useEffect(() => {
    // Check if user is authenticated before making API calls
    const checkAuthAndLoad = async () => {
      try {
        // Only run in browser environment
        if (typeof window === 'undefined') return;

        // Check authentication status using Supabase with error handling
        try {
          const { data: { user }, error } = await supabase.auth.getUser();

          if (error || !user?.email) {
            // Silently handle unauthenticated state
            setIsAuthenticated(false);
            setNotifications([]);
            setUnreadCount(0);
            return;
          }
        } catch (authError) {
          console.warn('Notification auth check failed:', authError);
          setIsAuthenticated(false);
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        // User is authenticated, proceed with loading notifications
        setIsAuthenticated(true);
        loadNotifications();
        loadUnreadCount();
      } catch (error) {
        // Silently handle auth check failures
        setIsAuthenticated(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    // Add a small delay to ensure providers are fully initialized
    const timer = setTimeout(checkAuthAndLoad, 500);

    // Auto-refresh notifications every 30 seconds, but only if authenticated
    const interval = setInterval(async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user?.email) {
          loadNotifications();
          loadUnreadCount();
        }
      } catch (error) {
        // Silently handle auth check failures during refresh
      }
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const loadNotifications = async () => {
    // Only run in browser environment and when authenticated
    if (typeof window === 'undefined' || !isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const result = await response.json();
        const notifications = result.notifications || [];
        setNotifications(notifications);
      } else if (response.status === 401) {
        // User not authenticated, update state and silently fail
        console.log('User not authenticated for notifications');
        setIsAuthenticated(false);
        setNotifications([]);
      } else {
        console.error('Failed to fetch notifications:', response.statusText);
        setNotifications([]);
      }
    } catch (error) {
      console.log('Notifications not available:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    // Only run in browser environment and when authenticated
    if (typeof window === 'undefined' || !isAuthenticated) return;

    try {
      const response = await fetch('/api/notifications?count_only=true&unread_only=true');
      if (response.ok) {
        const result = await response.json();
        setUnreadCount(result.count || 0);
      } else if (response.status === 401) {
        // User not authenticated, update state
        setIsAuthenticated(false);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleMarkAsRead = async (notificationId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_read: true }),
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        toast({
          title: 'Marked as read',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to mark as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error marking as read',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        toast({
          title: 'All notifications marked as read',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to mark all as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error marking all as read',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => {
          return notification && !notification.is_read ? prev - 1 : prev;
        });

        toast({
          title: 'Notification deleted',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error deleting notification',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconProps = {
      boxSize: 4,
      color: priority === 'urgent' ? 'red.500' :
             priority === 'high' ? 'orange.500' :
             priority === 'medium' ? 'blue.500' : 'gray.500'
    };

    switch (type) {
      case 'deposit':
        return <Icon as={FaCoins} {...iconProps} color="green.500" />;
      case 'withdrawal':
        return <Icon as={FaCoins} {...iconProps} color="orange.500" />;
      case 'payment':
        return <Icon as={FaCoins} {...iconProps} color="blue.500" />;
      case 'transaction':
        return <Icon as={FaCoins} {...iconProps} />;
      case 'referral':
        return <Icon as={FaUsers} {...iconProps} />;
      case 'rank_change':
        return <Icon as={FaTrophy} {...iconProps} />;
      case 'security':
        return <Icon as={FaShieldAlt} {...iconProps} />;
      case 'system':
        return <Icon as={FaCog} {...iconProps} />;
      case 'verification':
        return <Icon as={FaCheckCircle} {...iconProps} />;
      default:
        return <Icon as={FaInfoCircle} {...iconProps} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'gray';
      default: return 'blue';
    }
  };

  // Don't render if not mounted (SSR) or not authenticated to prevent API calls
  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        size={size}
        variant="ghost"
        aria-label="Notifications"
        icon={
          <Box position="relative">
            <Icon as={FaBell} boxSize={5} color={useColorModeValue('white', 'gray.200')} />
            {unreadCount > 0 && (
              <Badge
                position="absolute"
                top="-8px"
                right="-8px"
                colorScheme="red"
                borderRadius="full"
                boxSize="18px"
                fontSize="10px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Box>
        }
        bg="transparent"
        _hover={{ bg: "transparent" }}
        _active={{ bg: "transparent" }}
        _focus={{ boxShadow: "none" }}
      />

      <MenuList
        bg={bgColor}
        borderColor={borderColor}
        minW="380px"
        maxW="400px"
        maxH="500px"
        overflowY="auto"
        p={0}
      >
        <Box px={4} py={3} borderBottom="1px" borderColor={borderColor}>
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold" color={textColor}>
              Notifications
            </Text>
            <HStack spacing={2}>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  loadNotifications();
                  loadUnreadCount();
                }}
                leftIcon={<Icon as={FaBell} />}
              >
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleMarkAllAsRead}
                  leftIcon={<Icon as={FaCheck} />}
                >
                  Mark all read
                </Button>
              )}
            </HStack>
          </HStack>
        </Box>

        {isLoading ? (
          <Box p={4} textAlign="center">
            <Spinner size="md" color="cyan.500" />
            <Text mt={2} color={mutedTextColor}>Loading notifications...</Text>
          </Box>
        ) : notifications.length === 0 ? (
          <Box p={6} textAlign="center">
            <Icon as={FaBell} boxSize={8} color={mutedTextColor} mb={2} />
            <Text color={mutedTextColor}>No notifications yet</Text>
            <Text fontSize="sm" color={mutedTextColor}>
              You'll see important updates here
            </Text>
          </Box>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <MenuItem
              key={notification.id}
              p={0}
              _hover={{ bg: hoverBg }}
            >
              <VStack
                w="full"
                p={3}
                spacing={2}
                align="start"
                opacity={notification.is_read ? 0.7 : 1}
              >
                <HStack w="full" justify="space-between" align="start">
                  <HStack spacing={2} flex={1}>
                    <Box mt={1}>
                      {getNotificationIcon(notification.type, notification.priority)}
                    </Box>
                    <VStack align="start" spacing={1} flex={1}>
                      <Text
                        fontSize="sm"
                        fontWeight={notification.is_read ? 'normal' : 'semibold'}
                        color={textColor}
                        noOfLines={1}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        fontSize="xs"
                        color={mutedTextColor}
                        noOfLines={2}
                      >
                        {notification.message}
                      </Text>
                      <Text fontSize="xs" color={mutedTextColor}>
                        {formatDistanceToNow(new Date(notification.created_at))}
                      </Text>
                    </VStack>
                  </HStack>

                  <VStack spacing={1}>
                    <Badge
                      size="sm"
                      colorScheme={getPriorityColor(notification.priority)}
                      variant={notification.is_read ? 'outline' : 'solid'}
                    >
                      {notification.priority}
                    </Badge>

                    <HStack spacing={1}>
                      {!notification.is_read && (
                        <Tooltip label="Mark as read">
                          <IconButton
                            size="xs"
                            variant="ghost"
                            aria-label="Mark as read"
                            icon={<Icon as={FaCheck} />}
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                          />
                        </Tooltip>
                      )}
                      <Tooltip label="Delete">
                        <IconButton
                          size="xs"
                          variant="ghost"
                          aria-label="Delete notification"
                          icon={<Icon as={FaTrash} />}
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                        />
                      </Tooltip>
                    </HStack>
                  </VStack>
                </HStack>
              </VStack>
            </MenuItem>
          ))
        )}

        {notifications.length > 5 && (
          <>
            <MenuDivider />
            <MenuItem justifyContent="center" py={3}>
              <HStack>
                <Text fontSize="sm" color="cyan.500">
                  View all {notifications.length} notifications
                </Text>
                <Icon as={FaEye} boxSize={3} color="cyan.500" />
              </HStack>
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  );
}
