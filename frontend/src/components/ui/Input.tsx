import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...rest }, ref) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input
      ref={ref}
      {...rest}
      className={`w-full px-3 py-2 rounded-lg border ${error ? 'border-red-400' : 'border-slate-300'} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${className}`}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
