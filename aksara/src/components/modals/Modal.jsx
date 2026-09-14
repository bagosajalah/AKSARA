import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className={clsx("relative w-full mx-auto my-6 z-50", maxWidth)}>
        <div className="relative flex flex-col w-full bg-[#1C1E22] border border-white/10 rounded-3xl shadow-2xl outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-solid border-white/5 rounded-t-3xl">
            <h2 className="text-lg font-medium text-white">
              {title}
            </h2>
            <button
              className="p-2 ml-auto bg-white/5 hover:bg-white/10 rounded-xl border-0 text-gray-500 hover:text-white transition-colors focus:outline-none"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Body */}
          <div className="relative p-6 flex-auto max-h-[75vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
