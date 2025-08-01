import NotificationService from '@/lib/services/notificationService';

/**
 * Helper functions to create notifications for common events
 */

export const createWelcomeNotification = async (userEmail: string) => {
  return NotificationService.createNotification({
    user_email: userEmail,
    title: 'Welcome to TIC Global!',
    message: 'Your account has been successfully created. Complete your verification to unlock all features.',
    type: 'system',
    priority: 'medium',
    action_url: '/dashboard/profile',
    metadata: { action: 'verify_account' }
  });
};

export const createDepositNotification = async (
  userEmail: string, 
  amount: number, 
  currency: string = 'USD',
  transactionId?: string
) => {
  return NotificationService.createTransactionNotification(
    userEmail,
    'deposit',
    amount,
    currency,
    transactionId
  );
};

export const createWithdrawalNotification = async (
  userEmail: string, 
  amount: number, 
  currency: string = 'USD',
  transactionId?: string
) => {
  return NotificationService.createTransactionNotification(
    userEmail,
    'withdrawal',
    amount,
    currency,
    transactionId
  );
};

export const createPaymentNotification = async (
  userEmail: string, 
  amount: number, 
  planName: string,
  currency: string = 'USD',
  transactionId?: string
) => {
  return NotificationService.createNotification({
    user_email: userEmail,
    title: 'Payment Successful',
    message: `Your payment of ${currency} ${amount.toFixed(2)} for ${planName} has been processed successfully.`,
    type: 'payment',
    priority: 'medium',
    action_url: '/dashboard/wallet/history',
    metadata: {
      amount,
      currency,
      plan_name: planName,
      transaction_id: transactionId
    }
  });
};

export const createReferralBonusNotification = async (
  userEmail: string,
  amount: number,
  referralEmail: string,
  currency: string = 'USD'
) => {
  return NotificationService.createReferralNotification(
    userEmail,
    amount,
    referralEmail,
    currency
  );
};

export const createRankUpgradeNotification = async (
  userEmail: string,
  oldRank: string,
  newRank: string
) => {
  return NotificationService.createRankChangeNotification(
    userEmail,
    oldRank,
    newRank
  );
};

export const createVerificationCompleteNotification = async (
  userEmail: string,
  verificationType: 'email' | 'phone' | 'identity'
) => {
  const titles = {
    email: 'Email Verified',
    phone: 'Phone Verified',
    identity: 'Identity Verified'
  };

  const messages = {
    email: 'Your email address has been successfully verified.',
    phone: 'Your phone number has been successfully verified.',
    identity: 'Your identity verification has been completed successfully.'
  };

  return NotificationService.createNotification({
    user_email: userEmail,
    title: titles[verificationType],
    message: messages[verificationType],
    type: 'verification',
    priority: 'medium',
    action_url: '/dashboard/profile',
    metadata: { verification_type: verificationType }
  });
};

export const createSecurityAlertNotification = async (
  userEmail: string,
  alertType: 'login' | 'password_change' | 'suspicious_activity',
  metadata?: any
) => {
  const titles = {
    login: 'New Login Detected',
    password_change: 'Password Changed',
    suspicious_activity: 'Suspicious Activity Detected'
  };

  const messages = {
    login: 'A new login was detected from a different device or location. If this was not you, please secure your account immediately.',
    password_change: 'Your account password has been successfully changed. If you did not make this change, please contact support.',
    suspicious_activity: 'We detected unusual activity on your account. Please review your recent transactions and secure your account.'
  };

  return NotificationService.createSecurityNotification(
    userEmail,
    messages[alertType],
    {
      alert_type: alertType,
      ...metadata
    }
  );
};

export const createPlanActivationNotification = async (
  userEmail: string,
  planName: string,
  planPrice: number,
  currency: string = 'USD'
) => {
  return NotificationService.createNotification({
    user_email: userEmail,
    title: 'Plan Activated',
    message: `Your ${planName} plan has been successfully activated. Start earning rewards now!`,
    type: 'system',
    priority: 'high',
    action_url: '/dashboard',
    metadata: {
      plan_name: planName,
      plan_price: planPrice,
      currency
    }
  });
};

export const createTraderStatusNotification = async (
  userEmail: string,
  accountsActivated: number
) => {
  return NotificationService.createNotification({
    user_email: userEmail,
    title: 'Trader Status Activated!',
    message: `Congratulations! You have successfully activated ${accountsActivated} accounts and unlocked Trader status with unlimited accounts and deeper community bonuses.`,
    type: 'system',
    priority: 'high',
    action_url: '/dashboard/become-a-trader',
    metadata: {
      accounts_activated: accountsActivated,
      trader_status: true
    }
  });
};

export const createSystemMaintenanceNotification = async (
  userEmail: string,
  maintenanceDate: string,
  duration: string
) => {
  return NotificationService.createNotification({
    user_email: userEmail,
    title: 'Scheduled Maintenance',
    message: `System maintenance is scheduled for ${maintenanceDate}. Expected duration: ${duration}. Services may be temporarily unavailable.`,
    type: 'system',
    priority: 'medium',
    metadata: {
      maintenance_date: maintenanceDate,
      duration
    }
  });
};

export const createRewardNotification = async (
  userEmail: string,
  rewardType: string,
  amount: number,
  currency: string = 'USD'
) => {
  return NotificationService.createNotification({
    user_email: userEmail,
    title: 'Reward Earned!',
    message: `You earned ${currency} ${amount.toFixed(2)} from ${rewardType}. Keep up the great work!`,
    type: 'reward',
    priority: 'medium',
    action_url: '/dashboard/wallet/history',
    metadata: {
      reward_type: rewardType,
      amount,
      currency
    }
  });
};
