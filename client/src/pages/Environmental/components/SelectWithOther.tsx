import { useState, useEffect } from 'react';

interface Props {
  label: string;
  required?: boolean;
  options: readonly string[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  otherLabel?: string;
}

/**
 * Dropdown that shows a text input when "Other" is selected,
 * allowing the user to type a custom value.
 */
export default function SelectWithOther({
  label,
  required,
  options,
  value,
  onChange,
  placeholder,
  otherLabel = 'Please specify...',
}: Props) {
  const isKnownOption = value === '' || options.includes(value);
  const [isOther, setIsOther] = useState(!isKnownOption && value !== '');
  const [customValue, setCustomValue] = useState(!isKnownOption ? value : '');

  // Sync when value changes externally (e.g. editing an existing record)
  useEffect(() => {
    const known = value === '' || options.includes(value);
    if (!known && value !== '') {
      setIsOther(true);
      setCustomValue(value);
    } else {
      setIsOther(false);
      setCustomValue('');
    }
  }, [value, options]);

  const handleSelectChange = (selected: string) => {
    if (selected === '__other__') {
      setIsOther(true);
      setCustomValue('');
      onChange('');
    } else {
      setIsOther(false);
      setCustomValue('');
      onChange(selected);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomValue(text);
    onChange(text);
  };

  return (
    <div className="env-form-group">
      <label>
        {label}
        {required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      <select
        value={isOther ? '__other__' : value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required && !isOther}
      >
        <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="__other__">Other (specify)</option>
      </select>
      {isOther && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder={otherLabel}
          required={required}
          style={{ marginTop: 6 }}
        />
      )}
    </div>
  );
}
