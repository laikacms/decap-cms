// Lazy boundary for the code widget's control. CodeControl statically pulls
// in the CodeMirror runtime (~240KB minified) plus the language index, so the
// widget registers this thin wrapper instead: registration costs nothing and
// the editor code only downloads when a code field actually renders.
import { ClassNames } from '@emotion/react';
import React from 'react';

import type { CodeControlProps } from './CodeControl';

const CodeControl = React.lazy(() => import('./CodeControl'));

export default function CodeControlLazy(props: CodeControlProps) {
  return (
    <ClassNames>
      {({ css, cx }) => (
        <React.Suspense
          fallback={
            <div
              className={cx(
                props.classNameWrapper,
                css`
                  min-height: 300px;
                `,
              )}
            />
          }
        >
          <CodeControl {...props} />
        </React.Suspense>
      )}
    </ClassNames>
  );
}
