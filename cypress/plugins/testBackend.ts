import { merge } from 'lodash-es';

import { updateConfig } from '../utils/config';

interface BackendOptions {
  [key: string]: unknown;
}

export async function setupTestBackend(options: BackendOptions): Promise<null> {
  await updateConfig(current => {
    merge(current, options);
  });

  return null;
}
