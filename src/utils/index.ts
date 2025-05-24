// src/utils/index.ts

// This file exports utility functions that can be used throughout the application.

// Example utility function
export const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};

// Another example utility function
export const generateToken = (length: number): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};