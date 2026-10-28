import React from 'react';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  onLabel = 'ON',
  offLabel = 'OFF',
  label,
  size = 'md',
  ariaLabel,
}) => {
  const switchId = id || `switch-${Math.random().toString(36).substring(2, 7)}`;

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const trackWidth = isSmall ? 'w-12 h-6' : isLarge ? 'w-16 h-8' : 'w-14 h-7';
  const knobSize = isSmall ? 'w-5 h-5' : isLarge ? 'w-7 h-7' : 'w-6 h-6';
  const translateClass = isSmall
    ? checked ? 'translate-x-6' : 'translate-x-0.5'
    : isLarge
    ? checked ? 'translate-x-8' : 'translate-x-0.5'
    : checked ? 'translate-x-7' : 'translate-x-0.5';

  return (
    <div className="inline-flex items-center gap-2.5">
      {label && (
        <label
          htmlFor={switchId}
          className="font-bold text-neutral-900 cursor-pointer select-none text-sm md:text-base"
        >
          {label}
        </label>
      )}

      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || (checked ? onLabel : offLabel)}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 cursor-pointer border-2 border-neutral-950 ${trackWidth} ${
          checked ? 'bg-emerald-600' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${knobSize} ${translateClass}`}
        />
      </button>

      <span
        onClick={() => onChange(!checked)}
        className={`font-bold select-none cursor-pointer text-xs md:text-sm px-2 py-0.5 rounded border border-neutral-900/30 ${
          checked
            ? 'bg-emerald-100 text-emerald-950 border-emerald-600 font-extrabold'
            : 'bg-neutral-200 text-neutral-700'
        }`}
      >
        {checked ? onLabel : offLabel}
      </span>
    </div>
  );
};
