'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  isFolded: boolean;
  toggleFold: () => void;
  setFolded: (folded: boolean) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isFolded, setFoldedState] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-folded');
    if (saved !== null) {
      setFoldedState(saved === 'true');
    }
  }, []);

  const setFolded = (folded: boolean) => {
    setFoldedState(folded);
    localStorage.setItem('sidebar-folded', String(folded));
  };

  const toggleFold = () => {
    setFolded(!isFolded);
  };

  const toggleOpen = () => {
    setOpen(!isOpen);
  };

  return (
    <SidebarContext.Provider 
      value={{ 
        isFolded, 
        toggleFold, 
        setFolded, 
        isOpen, 
        setOpen, 
        toggleOpen 
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
