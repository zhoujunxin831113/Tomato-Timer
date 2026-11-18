import { memo, forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(function Input({ label, className = '', ...rest }, ref) {
    return (
      <label className="flex flex-col gap-1 text-sm text-muted">
        {label && <span>{label}</span>}
        <input
          ref={ref}
          className={`h-11 rounded-sm border border-line bg-card px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${className}`}
          {...rest}
        />
      </label>
    );
  }),
);
