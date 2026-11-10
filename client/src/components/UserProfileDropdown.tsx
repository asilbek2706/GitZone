'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiBookOpen, FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi';

import { authService } from '@/services/auth.service';
import type { AuthUser } from '@/types/api';

interface UserProfileDropdownProps {
  user: AuthUser | null;
}

export default function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API xatosi:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      setIsOpen(false);
      router.replace('/login');
      router.refresh();
    }
  };

  const username = user?.username ?? 'user';
  const displayName = user?.name || username;
  const bio = user?.bio || 'No bio available';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className="flex items-center gap-2 rounded-full p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#484f58] bg-amber-500 text-xs font-bold text-[#161b22]">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={`${displayName} avatar`}
              fill
              sizes="32px"
              className="object-cover"
              unoptimized
            />
          ) : (
            initials || 'U'
          )}
        </div>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-100 mt-3 w-72 overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] py-2 shadow-2xl shadow-black/40"
        >
          <div className="border-b border-[#30363d] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#484f58] bg-amber-500 text-sm font-bold text-[#161b22]">
                {user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={`${displayName} avatar`}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  initials || 'U'
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-gray-400">@{username}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2">
              <p className="mt-0.5 truncate text-xs font-medium text-gray-300">{bio}</p>
            </div>
          </div>

          <div className="border-b border-[#30363d] p-2">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition hover:bg-[#21262d] hover:text-white"
            >
              <FiUser size={17} className="text-gray-400" />
              <span>Your profile</span>
            </Link>

            <Link
              href="/dashboard/repositories"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition hover:bg-[#21262d] hover:text-white"
            >
              <FiBookOpen size={17} className="text-gray-400" />
              <span>Your repositories</span>
            </Link>
          </div>

          <div className="p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiLogOut size={17} />
              <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
