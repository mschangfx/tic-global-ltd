// src/utils/index.ts

// This file exports utility functions that can be used throughout the application.

// Removed formatCurrency - now using the one from LanguageContext for multi-language support

// Another example utility function
export const generateToken = (length: number): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};