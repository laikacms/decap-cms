import auth from './auth';
import collections from './collections';
import config from './config';
import cursors from './cursors';
import deploys from './deploys';
import editorialWorkflow from './editorialWorkflow';
import entries from './entries';
import entryDraft from './entryDraft';
import globalUI from './globalUI';
import integrations from './integrations';
import mediaLibrary from './mediaLibrary';
import medias from './medias';
import notifications from './notifications';
import search from './search';
import status from './status';

// Cross-slice selectors live in `./selectors` so action modules never import
// this barrel (see the note there about the evaluation cycle); re-exported
// here for existing consumers.
export * from './selectors';

const reducers = {
  auth,
  config,
  collections,
  search,
  integrations,
  entries,
  cursors,
  editorialWorkflow,
  entryDraft,
  medias,
  mediaLibrary,
  deploys,
  globalUI,
  status,
  notifications,
};

export default reducers;
