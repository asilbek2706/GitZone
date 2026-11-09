'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { repositoryService } from '@/services/repository.service';
import { authService } from '@/services/auth.service';
import { Repository, AuthUser } from '@/types/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Yangi repozitoriy formasi uchun state'lar
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUserDataAndRepos = async () => {
      try {
        const userRes = await authService.getCurrentUser(token);
        const currentUser = userRes.data.user;
        setUser(currentUser);

        const reposRes = await repositoryService.getUserRepositories(currentUser.username);
        setRepositories(reposRes.data.repositories);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Ma&apos;lumotlarni yuklashda xatolik yuz berdi';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndRepos();
  }, [router]);

  const handleCreateRepo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setIsCreating(true);
    try {
      const res = await repositoryService.createRepository(token, {
        name: repoName,
        description: description || undefined,
        isPrivate,
      });

      setRepositories((prev) => [res.data.repository, ...prev]);
      setRepoName('');
      setDescription('');
      setIsPrivate(false);
      setShowModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Repozitoriy yaratishda xatolik';
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <p className="text-gray-400">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Navbar */}
      <nav className="border-b border-[#30363d] bg-[#161b22] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-lg tracking-wider">GitZone</span>
        </div>
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300 font-medium">{user.username}</span>
            <button
              onClick={() => {
                localStorage.removeItem('accessToken');
                router.push('/login');
              }}
              className="text-sm bg-[#21262d] hover:bg-[#30363d] px-3 py-1.5 rounded-md border border-[#30363d] transition"
            >
              Chiqish
            </button>
          </div>
        )}
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Sizning Repozitoriyalaringiz</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
          >
            Yangi Repozitoriy
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {repositories.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#30363d] rounded-xl">
            <p className="text-gray-400 mb-4">Hozircha repozitoriyalar mavjud emas</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-400 hover:underline text-sm font-medium"
            >
              Birinchisini yarating &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-gray-500 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <Link
                    href={`/${user?.username}/${repo.name}`}
                    className="text-blue-400 font-semibold hover:underline text-lg"
                  >
                    {repo.name}
                  </Link>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border ${
                      repo.isPrivate
                        ? 'bg-yellow-950/40 text-yellow-300 border-yellow-800'
                        : 'bg-gray-800 text-gray-300 border-gray-700'
                    }`}
                  >
                    {repo.isPrivate ? 'Shaxsiy' : 'Ochiq'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {repo.description || 'Tavsif berilmagan'}
                </p>
                <div className="text-xs text-gray-500">
                  Asosiy tarmoq: <span className="text-gray-300">{repo.defaultBranch}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Repo Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Yangi Repozitoriy Yaratish</h2>
            <form onSubmit={handleCreateRepo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Repozitoriy nomi
                </label>
                <input
                  type="text"
                  required
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="masalan: my-project"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tavsif (ixtiyoriy)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Loyihangiz haqida qisqacha ma'lumot..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0d1117] border-[#30363d]"
                />
                <label htmlFor="isPrivate" className="text-sm text-gray-300">
                  Shaxsiy (Private)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] text-gray-300 hover:bg-[#30363d] text-sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {isCreating ? 'Yaratilmoqda...' : 'Repozitoriy yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
