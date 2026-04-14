import { useState, useEffect } from 'react';

interface SelectWithOtherProps {
  options: readonly string[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  otherLabel?: string;
  selectClassName?: string;
  inputClassName?: string;
  required?: boolean;
  id?: string;
}

/**
 * A dropdown that shows a text input when "Other" is selected,
 * allowing the user to type a custom value.
 *
 * - Automatically filters out any literal "Other" from the options array
 *   so only one "Other (specify)" entry appears.
 * - When editing a record whose value isn't in the options list, the
 *   component automatically switches to "Other" mode and pre-fills
 *   the text input.
 */
export default function SelectWithOther({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  otherLabel = 'Please specify...',
  selectClassName = '',
  inputClassName = '',
  required,
  id,
}: SelectWithOtherProps) {
  // Filter out literal "Other" from options — we add our own entry
  const filteredOptions = options.filter((o) => o !== 'Other');

  const isKnownOption = value === '' || filteredOptions.includes(value);
  const [isOther, setIsOther] = useState(!isKnownOption && value !== '');
  const [customValue, setCustomValue] = useState(!isKnownOption ? value : '');

  // Sync when value changes externally (e.g. editing an existing record)
  useEffect(() => {
    const known = value === '' || filteredOptions.includes(value);
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
    <>
      <select
        id={id}
        className={selectClassName}
        value={isOther ? '__other__' : value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required && !isOther}
      >
        <option value="">{placeholder}</option>
        {filteredOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="__other__">Other (specify)</option>
      </select>
      {isOther && (
        <input
          type="text"
          className={inputClassName || selectClassName}
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder={otherLabel}
          required={required}
          style={{ marginTop: 6 }}
        />
      )}
    </>
  );
}
