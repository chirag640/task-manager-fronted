import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';

type SyncState = 'synced' | 'pending' | 'error' | 'offline';

export default function SyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>('synced');

  // Simulate sync status - in real app, this would connect to actual sync logic
  useEffect(() => {
    // Check online status
    const handleOnline = () => setSyncState('synced');
    const handleOffline = () => setSyncState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncState('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getIcon = () => {
    switch (syncState) {
      case 'synced':
        return <Check className="w-4 h-4" />;
      case 'pending':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'offline':
        return <CloudOff className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (syncState) {
      case 'synced':
        return 'Synced';
      case 'pending':
        return 'Syncing...';
      case 'error':
        return 'Sync error';
      case 'offline':
        return 'Offline';
    }
  };

  const getColors = () => {
    switch (syncState) {
      case 'synced':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'offline':
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium ${getColors()}`}>
      <Cloud className="w-4 h-4" />
      {getIcon()}
      <span>{getLabel()}</span>
    </div>
  );
}