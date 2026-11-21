export interface NotificationPreferences {
  communityPosts: boolean;
  communityMessages: boolean;
  clinicMessages: boolean;
  queueArrivals: boolean;
  soundEnabled: boolean;
  readNotificationIds?: string[];
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  communityPosts: true,
  communityMessages: true,
  clinicMessages: true,
  queueArrivals: true,
  soundEnabled: true,
  readNotificationIds: [],
};

export interface AppNotification {
  id: string;
  type: "community_message" | "community_post" | "clinic_message" | "queue_arrival";
  title: string;
  content: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  category?: string;
  timestamp: string;
  isRead: boolean;
  href?: string;
  action?: "open_chat" | "open_interphone";
}
