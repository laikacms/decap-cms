import React from 'react';

import { WidgetPreviewContainer } from '../../ui/default/index';

function ListPreview({ values }: { values: unknown[] }) {
  return (
    <ul>
      {values.map((value: unknown, idx: number) => (
        <li key={idx}>{value as React.ReactNode}</li>
      ))}
    </ul>
  );
}

interface SelectPreviewProps {
  value?: string | unknown[];
}

function SelectPreview({ value }: SelectPreviewProps) {
  return (
    <WidgetPreviewContainer>
      {value && (Array.isArray(value) ? <ListPreview values={value} /> : value)}
      {!value && null}
    </WidgetPreviewContainer>
  );
}

export default SelectPreview;
