import { DashboardConfig, InfoCardData, TaskStatusData, BannerCarouselData } from '@/types/dashboard'; // Assuming types are in src/types

export const sourceDashboardConfig: DashboardConfig = {
  layoutType: 'flow', // We'll use Chakra's SimpleGrid
  widgets: [
    // Row 0: Banner
    {
      id: 'mainBanner',
      type: 'bannerCarousel',
      title: '', // Title for the widget itself, kept empty as text is on the banner image
      data: {
        items: [
          {
            // imageUrl: '/img/dashboard/main-banner-winwinpay.png', // Removing image
            bgGradient: 'linear(to-r, gray.700, gray.800)', // Dark gradient
            textColor: 'white',
            title: 'TIC GLOBAL Ltd.', // Updated title
            // subtitle: 'Transforming the Payment Industry', // Removed subtitle
            link: '/about', // Example link for "Learn More"
            linkText: 'Learn More', // Text for the button
          },
        ],
      } as BannerCarouselData,
      layout: { w: 12, h: 2 }, // Full width
    },
    // Row 1: Cards
    {
      id: 'becomeATrader', // New ID
      type: 'infoCard',
      title: 'Become a Trader', // New title
      data: {
        icon: 'FaChartLine', // New icon
        description: 'Learn to trade and manage your assets.', // New description
        link: '/dashboard/become-a-trader', // New link
      } as InfoCardData,
      layout: { w: 4, h: 2 },
    },
    {
      id: 'taskRateApp',
      type: 'taskStatusCard',
      title: 'Daily Task: Rate the App',
      data: {
        taskName: 'Rate the App',
        status: 'Not Completed',
        description: "You're almost there! Rate the app to complete today's task.",
        historyLink: '/dashboard/tasks/history',
        imageUrl: '/img/dashboard/task-phone-rating.png', // Image for the task card
      } as TaskStatusData,
      layout: { w: 4, h: 2 },
    },
    // Row 2: Cards
    {
      id: 'winwinGames',
      type: 'infoCard',
      title: 'TIC Global Games', // Renamed
      data: {
        icon: 'FaGamepad',
        description: 'Enter a world of online entertainment with our partners.',
        link: '/games',
      } as InfoCardData,
      layout: { w: 4, h: 2 },
    },
    {
      id: 'referralProgram',
      type: 'infoCard',
      title: 'Referral', // Updated title
      data: {
        icon: 'FaUserCheck',
        description: 'Refer new users to receive rewards. Your code: charlaine', // Updated description
        link: '/dashboard/referral',
      } as InfoCardData,
      layout: { w: 4, h: 2 },
    },
    // Row 3: Cards (New additions based on sidebar in image)
    {
      id: 'wwpStaking',
      type: 'infoCard',
      title: 'TIC Staking', // Renamed
      data: {
        icon: 'FaPiggyBank', // Icon from sidebar update
        description: 'Stake your TIC tokens for rewards.', // Updated description
        link: '/dashboard/wwp-staking', // Link can remain if page not renamed
      } as InfoCardData,
      layout: { w: 4, h: 2 },
    },
  ],
};