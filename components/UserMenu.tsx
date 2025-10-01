"use client";

import { useState, useRef, useEffect } from 'react';
import { useSession } from './SessionProvider';
import { AuthModal } from './AuthModal';

interface UserMenuProps {
  onOpenStats?: () => void;
}

export function UserMenu({ onOpenStats }: UserMenuProps) {
  const { user, loading, signOut } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleOpenStats = () => {
    setShowMenu(false);
    onOpenStats?.();
  };

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 h-8 w-8 rounded-full bg-white/5 border border-white/10 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="fixed top-4 right-4 z-50 h-8 px-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition text-sm"
        >
          Sign in
        </button>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const getDisplayName = (email: string | null | undefined) => {
    if (!email) return 'User';
    return email.split('@')[0];
  };

  return (
    <div className="fixed top-4 right-4 z-50" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="h-8 w-8 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 transition flex items-center justify-center text-sm font-medium"
        aria-label="User menu"
      >
        {getInitials(user.email)}
      </button>

      {showMenu && (
        <div className="absolute top-10 right-0 w-48 bg-slate-900/95 border border-white/10 rounded-lg shadow-lg backdrop-blur">
          <div className="p-3 border-b border-white/10">
            <div className="text-sm text-white/70">Signed in as</div>
            <div className="text-sm font-medium text-white truncate">
              {getDisplayName(user.email)}
            </div>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => setShowMenu(false)}
              className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 transition"
            >
              Profile (placeholder)
            </button>
            
            <button
              onClick={handleOpenStats}
              className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 transition"
            >
              Usage Stats
            </button>
            
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
