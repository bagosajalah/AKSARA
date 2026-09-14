import React from 'react';

export default function Button({ 
  variant = 'primary', 
  icon: Icon, 
  children, 
  className = '', 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 text-[14px] font-semibold rounded-lg transition-colors duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1C1E22]";
  
  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-400 focus:ring-emerald-500",
    secondary: "bg-white dark:bg-[#1A1C20] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 focus:ring-red-500",
    ghost: "bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
  };

  const disabledStyles = props.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
