import { ClassNames } from '@emotion/react';
import { PlateContent } from 'platejs/react';

import type { ClipboardEvent } from 'react';

interface EditorProps {
  isDisabled?: boolean | undefined;
  onPaste?: ((event: ClipboardEvent) => void) | undefined;
}

export default function Editor({ isDisabled, onPaste }: EditorProps) {
  return (
    <ClassNames>
      {({ css }) => (
        <PlateContent
          className={css`
            flex-grow: 1;
            padding: 8px 20px 0;
            outline: none;
          `}
          disableDefaultStyles
          {...(isDisabled === undefined ? {} : { readOnly: isDisabled, 'aria-disabled': isDisabled })}
          {...(onPaste === undefined ? {} : { onPaste })}
        />
      )}
    </ClassNames>
  );
}
