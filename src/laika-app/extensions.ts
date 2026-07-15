// Core
import { DecapCmsCore as CMS } from '@/core/index';
// Backends
import { AzureBackend } from '@/backends/azure/index';
import { AwsCognitoGitHubProxyBackend } from '@/backends/aws-cognito-github-proxy/index';
import { GitHubBackend } from '@/backends/github/index';
import { GitLabBackend } from '@/backends/gitlab/index';
import { GiteaBackend } from '@/backends/gitea/index';
import { GitGatewayBackend } from '@/backends/git-gateway/index';
import { BitbucketBackend } from '@/backends/bitbucket/index';
import { TestBackend } from '@/backends/test/index';
import { ProxyBackend } from '@/backends/proxy/index';
// Widgets
import DecapCmsWidgetString from '@/widgets/string/index';
import DecapCmsWidgetNumber from '@/widgets/number/index';
import DecapCmsWidgetText from '@/widgets/text/index';
import DecapCmsWidgetImage from '@/widgets/image/index';
import DecapCmsWidgetFile from '@/widgets/file/index';
import DecapCmsWidgetSelect from '@/widgets/select/index';
import DecapCmsWidgetList from '@/widgets/list/index';
import DecapCmsWidgetObject from '@/widgets/object/index';
import DecapCmsWidgetRelation from '@/widgets/relation/index';
import DecapCmsWidgetBoolean from '@/widgets/boolean/index';
import DecapCmsWidgetMap from '@/widgets/map/index';
import DecapCmsWidgetDatetime from '@/widgets/datetime/index';
import DecapCmsWidgetCode from '@/widgets/code/index';
import DecapCmsWidgetColorString from '@/widgets/colorstring/index';
import {
  passthroughSerializer as richtextPassthroughSerializer,
  tweetBlock,
  Widget as RichtextWidget,
  youtubeBlock,
} from '@/widgets/richtext/index';
// Locales
import * as locales from '@/locales/index';

import type { CmsLocalePhrases } from '@/lib/util/types/cms/common.js';

CMS.registerBackend('git-gateway', GitGatewayBackend);
CMS.registerBackend('azure', AzureBackend);
CMS.registerBackend('aws-cognito-github-proxy', AwsCognitoGitHubProxyBackend);
CMS.registerBackend('github', GitHubBackend);
CMS.registerBackend('gitlab', GitLabBackend);
CMS.registerBackend('gitea', GiteaBackend);
CMS.registerBackend('bitbucket', BitbucketBackend);
CMS.registerBackend('test-repo', TestBackend);
CMS.registerBackend('proxy', ProxyBackend);
[
  DecapCmsWidgetString.Widget(),
  DecapCmsWidgetNumber.Widget(),
  DecapCmsWidgetText.Widget(),
  DecapCmsWidgetImage.Widget(),
  DecapCmsWidgetFile.Widget(),
  DecapCmsWidgetSelect.Widget(),
  DecapCmsWidgetList.Widget(),
  DecapCmsWidgetObject.Widget(),
  DecapCmsWidgetRelation.Widget(),
  DecapCmsWidgetBoolean.Widget(),
  DecapCmsWidgetMap.Widget(),
  DecapCmsWidgetDatetime.Widget(),
  DecapCmsWidgetCode.Widget(),
  DecapCmsWidgetColorString.Widget(),
  RichtextWidget() as any,
  // v1→v2 back-compat alias: `markdown` was renamed to `richtext` (DCMS-483).
  // See BREAKING_CHANGES_V2_BETA.md for the migration note.
  { ...RichtextWidget(), name: 'markdown' } as any,
].forEach(widget => CMS.registerWidget(widget));
// The richtext widget stores a lazy `LexicalRichtextValue`; the passthrough
// serializer keeps the proxy intact through Decap's value pipeline so its
// `toString()` (Lexical -> Portable Text -> output format) fires once, at
// file-write time.
CMS.registerWidgetValueSerializer('richtext', richtextPassthroughSerializer);
CMS.registerWidgetValueSerializer('markdown', richtextPassthroughSerializer);
// The legacy `registerEditorComponent` API was removed: images and code
// blocks are native Portable Text types; custom blocks register via
// `CMS.registerBlock(...)` (see BREAKING_CHANGES_V2_BETA.md).
// Default embed blocks (previously hardcoded Lexical nodes that lost their
// content at persist). Re-register with the same id to customize.
CMS.registerBlock(youtubeBlock);
CMS.registerBlock(tweetBlock);
Object.keys(locales).forEach(locale => {
  CMS.registerLocale(locale, (locales as Record<string, CmsLocalePhrases>)[locale]);
});
