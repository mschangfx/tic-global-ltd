'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Supported languages
export type Language = 'en' | 'vi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation type
export interface Translations {
  [key: string]: string | Translations;
}

// Default English translations (fallback)
const defaultTranslations: Translations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
  },
  navbar: {
    overview: 'Overview',
    myAccounts: 'My Accounts',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transactionHistory: 'Transaction History',
    becomeTrader: 'Become a Trader',
    games: 'TIC Global Games',
    partnership: 'Partnership',
    supportHub: 'Support Hub',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    language: 'Language',
  },
  dashboard: {
    welcome: 'Welcome to TIC Global',
    totalBalance: 'Total Balance',
    ticBalance: 'TIC Balance',
    gicBalance: 'GIC Balance',
    stakingBalance: 'Staking Balance',
    partnerWallet: 'Partner Wallet',
    emailVerification: 'Email Verification',
    phoneVerification: 'Phone Verification',
    profileCompletion: 'Profile Completion',
    identityVerification: 'Identity Verification',
    verifyEmail: 'Verify Email',
    verifyPhone: 'Verify Phone',
    completeProfile: 'Complete Profile',
    verifyIdentity: 'Verify Identity',
    verified: 'Verified',
    pending: 'Pending',
    notStarted: 'Not Started',
    enterCode: 'Enter verification code',
    sendCode: 'Send Code',
    resendCode: 'Resend Code',
    firstName: 'First Name',
    lastName: 'Last Name',
    dateOfBirth: 'Date of Birth',
    phoneNumber: 'Phone Number',
    country: 'Country',
    enterFirstName: 'Enter your first name',
    enterLastName: 'Enter your last name',
    day: 'Day',
    month: 'Month',
    year: 'Year',
  },
  plans: {
    starter: 'Starter Plan',
    premium: 'Premium Plan',
    monthly: 'Monthly',
    features: 'Features',
    getStarted: 'Get Started',
    upgrade: 'Upgrade',
  },
  currency: {
    usd: 'USD',
    vnd: 'VND',
  }
};

// Language provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>(defaultTranslations);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        if (language === 'en') {
          setTranslations(defaultTranslations);
        } else {
          // Fetch translation file from public folder
          const response = await fetch(`/translations/${language}.json`);
          if (response.ok) {
            const translationData = await response.json();
            setTranslations(translationData);
          } else {
            throw new Error(`Failed to fetch translations for ${language}`);
          }
        }
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        setTranslations(defaultTranslations);
      }
    };

    loadTranslations();
  }, [language]);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('tic-global-language') as Language;
    if (savedLanguage && ['en', 'vi'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Set language and save to localStorage
  const setLanguage = (lang: Language) => {
    console.log(`Changing language from ${language} to ${lang}`);
    setLanguageState(lang);
    localStorage.setItem('tic-global-language', lang);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;

    // Navigate through nested keys
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = defaultTranslations;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            console.warn(`Translation key not found: ${key} for language: ${language}`);
            return key; // Return key if not found in fallback
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string for key: ${key}, got:`, typeof value);
      return key;
    }

    // Replace parameters in translation
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, value);
    }

    return value;
  };

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Helper function to get language display name
export function getLanguageDisplayName(lang: Language): string {
  const displayNames: Record<Language, string> = {
    en: 'English',
    vi: 'Tiếng Việt (Vietnamese)',
  };
  return displayNames[lang] || lang;
}

// Helper function to format currency based on language
export function formatCurrency(amount: number, language: Language): string {
  if (language === 'vi') {
    // Vietnamese formatting - VND
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount * 25000); // Approximate USD to VND conversion
  } else {
    // English formatting - USD
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }
}
