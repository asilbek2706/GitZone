// src/app/(dashboard)/dashboard/page.tsx
'export const instant = false;';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { userService, User, ContributionStats } from '@/services/user.service';

export default function DashboardProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [contributions, setContributions] = useState<ContributionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(storedUser);
        if (parsed.username) {
          const [profileRes, contribRes] = await Promise.all([
            userService.getProfile(parsed.username),
            userService.getContributions(parsed.username),
          ]);

          if (profileRes.success && profileRes.data.user) {
            setUser(profileRes.data.user);
          }
          if (contribRes.success && contribRes.data) {
            setContributions(contribRes.data);
          }
        }
      } catch (err) {
        console.error("Profil ma'lumotlarini yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-amber-500 font-mono">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Ma&lsquo;lumotlar yuklanmoqda...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GitHub uslubidagi Tab menyu */}
      <div className="border-b border-[#30363d] flex gap-6 text-sm font-medium text-gray-300 overflow-x-auto">
        <button className="pb-3 border-b-2 border-amber-500 text-white flex items-center gap-2 cursor-pointer">
          <span>Overview</span>
        </button>
        <button className="pb-3 hover:text-white transition flex items-center gap-2 cursor-pointer">
          <span>Repositories</span>
          <span className="bg-[#30363d] text-xs px-2 py-0.5 rounded-full text-gray-300">
            {contributions?.breakdown.repositories || 0}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* CHAP KOLONKA: Real Profil Ma'lumotlari */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <div className="w-48 h-48 lg:w-full lg:h-64 rounded-2xl cyber-card cyber-glow flex items-center justify-center overflow-hidden bg-[#161b22] relative group">
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1c2128] to-[#0d1117] flex flex-col items-center justify-center p-6">
                  <div className="relative w-20 h-20 mb-3 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    <Image
                      src="/brand/gitzone-mark.svg"
                      alt="GitZone Mark"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xs font-mono tracking-widest text-amber-400">
                    @{user?.username || 'user'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">{user?.name || user?.username}</h1>
            <p className="text-base text-gray-400 font-light font-mono">@{user?.username}</p>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed">
            {user?.bio || 'Hozircha bio kiritilmagan.'}
          </p>

          <button className="w-full bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white text-sm font-medium py-2 rounded-lg transition cursor-pointer">
            Edit profile
          </button>

          <div className="space-y-2.5 text-xs text-gray-400 pt-3 border-t border-[#30363d]">
            {user?.location && (
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{user.location}</span>
              </div>
            )}
            {user?.website && (
              <div className="flex items-center gap-2.5 truncate">
                <svg
                  className="w-4 h-4 text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <a
                  href={user.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline truncate"
                >
                  {user.website}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                Qo&apos;shilgan:{' '}
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Nomaʼlum'}
              </span>
            </div>
          </div>
        </div>

        {/* O'NG KOLONKA: Contributions statistikasi */}
        <div className="lg:col-span-3 space-y-6">
          <div className="cyber-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">
                {contributions?.total || 0} contributions in {new Date().getFullYear()}
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                Active Streak: {contributions?.currentStreak || 0} days
              </span>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[700px]">
                {contributions?.days && contributions.days.length > 0
                  ? contributions.days.map((day, i) => {
                      let levelClass = 'bg-[#21262d]';
                      if (day.count > 0 && day.count <= 2) levelClass = 'bg-amber-950';
                      else if (day.count > 2 && day.count <= 5) levelClass = 'bg-amber-700';
                      else if (day.count > 5) levelClass = 'bg-amber-500';

                      return (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-xs ${levelClass} contribution-cell cursor-pointer`}
                          title={`${day.date}: ${day.count} contributions`}
                        ></div>
                      );
                    })
                  : Array.from({ length: 140 }).map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-xs bg-[#21262d]"></div>
                    ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-[#30363d]/50">
              <span>Total Active Days: {contributions?.activeDays || 0}</span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-xs bg-[#21262d]"></span>
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-950"></span>
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-700"></span>
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
