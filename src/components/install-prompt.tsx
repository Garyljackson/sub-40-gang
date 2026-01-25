'use client';

import { useInstallPrompt } from '@/hooks/use-install-prompt';

export function InstallPrompt() {
  const { canInstall, prompt, dismiss } = useInstallPrompt();

  if (!canInstall) {
    return null;
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 fixed right-4 bottom-20 left-4 z-50 duration-300">
      <div className="rounded-xl border border-gray-800 bg-gray-900/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">📱</div>
          <div className="flex-1">
            <p className="font-medium text-gray-100">Add to Home Screen</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Install S40G for quick access to your milestones
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={prompt}
            className="bg-brand-primary hover:bg-brand-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-gray-200"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
