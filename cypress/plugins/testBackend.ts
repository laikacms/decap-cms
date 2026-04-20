import { updateConfig } from '../utils/config';
import { merge } from 'lodash';

interface BackendOptions {
  [key: string]: unknown;
}

export async function setupTestBackend(options: BackendOptions): Promise<null> {
  await updateConfig(current => {
    merge(current, options);
  });

  return null;
}
