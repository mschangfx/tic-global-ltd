'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Create context for admin panel state
const AdminPanelContext = createContext<{
  activeSection: string;
  setActiveSection: (section: string) => void;
}>({
  activeSection: 'dashboard',
  setActiveSection: () => {}
});

export const useAdminPanel = () => useContext(AdminPanelContext);

interface AdminPanelProviderProps {
  children: ReactNode;
}

export function AdminPanelProvider({ children }: AdminPanelProviderProps) {
  const [activeSection, setActiveSection] = useState('dashboard');

  const handleSetActiveSection = (section: string) => {
    console.log('AdminPanelProvider: Setting active section to:', section);
    setActiveSection(section);
  };

  console.log('AdminPanelProvider: Current active section:', activeSection);

  return (
    <AdminPanelContext.Provider value={{ activeSection, setActiveSection: handleSetActiveSection }}>
      {children}
    </AdminPanelContext.Provider>
  );
}
