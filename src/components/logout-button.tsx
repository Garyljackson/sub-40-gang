'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={handleLogout} className="w-full">
      Sign Out
    </Button>
  );
}
