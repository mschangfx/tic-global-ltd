export interface DashboardWidget {
  id: string;
  type: 'infoCard' | 'taskStatusCard' | 'bannerCarousel'; // Add more types as needed
  title?: string; // Title for the widget card/section itself
  data: any; // Widget-specific data, will be cast to specific types below
  layout?: { w: number; h: number; x?: number; y?: number }; // For grid layout (optional for now)
}

export interface InfoCardData {
  icon?: string; // react-icons name or path to custom icon
  description: string;
  link: string;
  bgColor?: string; // Optional background color for the card or icon container
}

export interface TaskStatusData {
  taskName: string;
  status: 'Completed' | 'Not Completed' | 'Pending';
  description: string;
  historyLink?: string;
}

export interface BannerCarouselItem {
  imageUrl?: string; // Make imageUrl optional
  bgColor?: string; // For solid background color
  bgGradient?: string; // For gradient background, e.g., 'linear(to-r, blue.500, purple.600)'
  textColor?: string; // Optional text color if background is dark
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  link?: string;
  linkText?: string; // Added for button text
}

export interface BannerCarouselData {
  items: BannerCarouselItem[];
}

// This will be the overall structure for a user's dashboard configuration
export interface UserDashboardConfig {
  userId: string; // Or some other user identifier
  version: number; // For managing updates to dashboard structures
  layoutType: 'grid' | 'flow';
  widgets: DashboardWidget[];
  // Add other user-specific dashboard settings if needed
}

// Simpler type for the source/template dashboard configuration
export interface DashboardConfig {
  version?: number; // Optional version for the template itself
  layoutType: 'grid' | 'flow';
  widgets: DashboardWidget[];
}