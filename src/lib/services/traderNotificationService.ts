import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface TraderActivationNotification {
  user_email: string;
  packages_activated: number;
  total_cost: number;
  activation_timestamp: string;
}

export class TraderNotificationService {
  
  // Send trader activation notification
  static async sendTraderActivationNotification(data: TraderActivationNotification) {
    try {
      console.log('Sending trader activation notification for:', data.user_email);

      // Create notification record
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_email: data.user_email,
          type: 'trader_activation',
          title: 'Trader Status Activated!',
          message: `Congratulations! You have successfully become a trader. ${data.packages_activated} account packages activated for ₱${data.total_cost}.`,
          metadata: {
            packages_activated: data.packages_activated,
            total_cost: data.total_cost,
            activation_timestamp: data.activation_timestamp,
            benefits: [
              'Trade GIC tokens at exclusive rates (Buy: ₱63, Sell: ₱60)',
              'Unlock unlimited account creation',
              'Access to community bonuses and rank-up rewards'
            ]
          },
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // Log the successful activation
      console.log(`Trader activation notification sent successfully for ${data.user_email}`);

    } catch (error) {
      console.error('Error in sendTraderActivationNotification:', error);
    }
  }

  // Send real-time update notification
  static async sendRealTimeUpdate(userEmail: string, updateType: string, data: any) {
    try {
      console.log('Sending real-time update:', updateType, 'for:', userEmail);

      // Create real-time notification
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_email: userEmail,
          type: updateType,
          title: this.getUpdateTitle(updateType),
          message: this.getUpdateMessage(updateType, data),
          metadata: data,
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating real-time update:', error);
      }

    } catch (error) {
      console.error('Error in sendRealTimeUpdate:', error);
    }
  }

  private static getUpdateTitle(updateType: string): string {
    switch (updateType) {
      case 'wallet_balance_updated':
        return 'Wallet Balance Updated';
      case 'gic_trade_completed':
        return 'GIC Trade Completed';
      case 'trader_status_changed':
        return 'Trader Status Changed';
      default:
        return 'Account Update';
    }
  }

  private static getUpdateMessage(updateType: string, data: any): string {
    switch (updateType) {
      case 'wallet_balance_updated':
        return `Your wallet balance has been updated. New balance: ₱${data.new_balance}`;
      case 'gic_trade_completed':
        return `GIC trade completed: ${data.trade_type} ${data.gic_amount} GIC for ₱${data.peso_amount}`;
      case 'trader_status_changed':
        return `Your trader status has been ${data.is_trader ? 'activated' : 'deactivated'}`;
      default:
        return 'Your account has been updated';
    }
  }

  // Get user notifications
  static async getUserNotifications(userEmail: string, limit: number = 10) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }
}
