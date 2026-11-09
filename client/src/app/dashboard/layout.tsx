// src/app/dashboard/layout.tsx
import ProtectedRoute from '@/components/ProtectedRoute';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Bu yerda kelgusida Sidebar yoki Header bo'lishi mumkin */}
        <main>{children}</main>
      </div>
    </ProtectedRoute>
  );
}
