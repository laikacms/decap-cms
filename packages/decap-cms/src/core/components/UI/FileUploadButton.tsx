import React from 'react';
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
  return (
    <label tabIndex={0} className={`nc-fileUploadButton ${className || ''}`}>
      <span>{label}</span>
      <input
        type="file"
        accept={imagesOnly ? 'image/*' : '*/*'}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}
