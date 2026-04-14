import { Search } from 'lucide-react';

interface FilterSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Additional wrapper classes for width constraints.
   * Defaults to 'sm:max-w-[320px]'. Override with e.g. 'sm:max-w-[280px]'.
   * Base classes (relative w-full sm:flex-1 sm:min-w-[140px]) are always applied.
   */
  wrapperClassName?: string;
}

/**
 * Search input designed for filter-bar flex-wrap layouts.
 *
 * This component enforces w-full on the input to prevent the width-overflow bug
 * that occurs when the general `inputClasses` pattern (which includes sm:w-auto)
 * is used inside constrained flex wrappers.
 *
 * Use this for any search field inside a filter bar.
 * Use `inputClasses` / `selectClasses` only for date pickers and dropdowns
 * that sit directly in the flex row (not inside a relative-positioned wrapper).
 */
export function FilterSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  wrapperClassName = 'sm:max-w-[320px]',
}: FilterSearchInputProps) {
  return (
    <div className={`relative w-full sm:flex-1 sm:min-w-[140px] ${wrapperClassName}`}>
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-[34px] pl-8 pr-3 text-[13px] bg-surface-sunken border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-[3px] focus:ring-primary-500/10 focus:border-primary-500 focus:bg-surface transition-all"
      />
    </div>
  );
}
