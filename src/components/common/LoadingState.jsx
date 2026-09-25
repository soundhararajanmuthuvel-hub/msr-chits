import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading data from Google Sheets...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="p-3 bg-[#174D38]/10 rounded-full text-[#003524] mb-3 animate-spin">
        <Loader2 className="w-7 h-7" />
      </div>
      <p className="text-sm font-semibold text-[#003524]">{message}</p>
      <p className="text-xs text-[#5B7065] mt-1">Please wait a moment...</p>
    </div>
  );
};

export default LoadingState;
