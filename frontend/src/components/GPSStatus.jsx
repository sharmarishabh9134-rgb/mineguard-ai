
import React, { useState, useEffect } from 'react';

export default function GPSStatus() {
  const [status, setStatus] = useState('ONLINE');

  useEffect(() => {
    const handleOffline = () => setStatus('OFFLINE');
    const handleOnline = () => setStatus('SYNCING');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="gps-status">
      Status: {status === 'SYNCING' ? 'SYNC COMPLETE' : status}
    </div>
  );
}
