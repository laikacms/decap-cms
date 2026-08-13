import React, { useRef } from 'react';
export interface FileUploadButtonProps {
  className?: string;
  label: string;
  imagesOnly?: boolean | undefined;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function FileUploadButton({
  label,
  imagesOnly,
  onChange,
  disabled,
  className,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <label
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      className={`nc-fileUploadButton ${className || ''}`}
    >
      <span>{label}</span>
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        accept={imagesOnly ? 'image/*' : '*/*'}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}
