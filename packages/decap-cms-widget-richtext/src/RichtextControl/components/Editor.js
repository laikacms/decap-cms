import React from 'react';
import { PlateContent } from 'platejs/react';
import { ClassNames } from '@emotion/react';

function Editor(props) {
  const { isDisabled, onPaste, forID, ariaRequired, ariaInvalid, ariaErrorMessage } = props;

  return (
    <ClassNames>
      {({ css }) => (
        <PlateContent
          id={forID}
          className={css`
            flex-grow: 1;
            padding: 8px 20px 0;
            outline: none;
          `}
          disableDefaultStyles
          readOnly={isDisabled}
          aria-disabled={isDisabled}
          aria-required={ariaRequired}
          aria-invalid={ariaInvalid || undefined}
          aria-errormessage={ariaInvalid ? ariaErrorMessage : undefined}
          aria-describedby={ariaInvalid ? ariaErrorMessage : undefined}
          onPaste={onPaste}
        />
      )}
    </ClassNames>
  );
}

export default Editor;
