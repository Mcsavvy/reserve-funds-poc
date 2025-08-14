'use client';

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Reserve Funds Dashboard</h1>
      <p className="text-gray-600 mt-2">Welcome back, {userName}</p>
    </div>
  );
}
