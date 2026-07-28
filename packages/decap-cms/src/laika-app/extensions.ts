// Core
import { once } from 'lodash-es';

// Must stay before any import that pulls the richtext editor: evaluates
// Prism core before '@lexical/code'; see the comment in prism-global.ts.
import { DecapCmsCore as CMS } from '@/core/index';
import { ensurePrismGlobal } from '@/ui/editor/utils/prism-global';
// Entry codecs (whole-entry-file encodings)
import { jsonEntryCodec, jsonFrontmatterCodec } from '@/entry-codecs/json/index';
import { createMarkdownEntryCodec } from '@/entry-codecs/markdown/index';
import { tomlEntryCodec, tomlFrontmatterCodec } from '@/entry-codecs/toml/index';
import { yamlEntryCodec, yamlFrontmatterCodec } from '@/entry-codecs/yaml/index';
// Richtext format packs (field-level text formats)
import { markdownFormat } from '@/format-packs/markdown/index';
// Backends
import { AwsCognitoGitHubProxyBackend } from '@/backends/aws-cognito-github-proxy/index';
import { AzureBackend } from '@/backends/azure/index';
import { BitbucketBackend } from '@/backends/bitbucket/index';
import { ForgejoBackend } from '@/backends/forgejo/index';
import { GitGatewayBackend } from '@/backends/git-gateway/index';
import { GiteaBackend } from '@/backends/gitea/index';
import { GitHubBackend } from '@/backends/github/index';
import { GitLabBackend } from '@/backends/gitlab/index';
import createLaikaBackend from '@/backends/laika/index';
import { ProxyBackend } from '@/backends/proxy/index';
import { TestBackend } from '@/backends/test/index';
// Widgets
import DecapCmsWidgetBoolean from '@/widgets/boolean/index';
import DecapCmsWidgetCode from '@/widgets/code/index';
import DecapCmsWidgetColorString from '@/widgets/colorstring/index';
import DecapCmsWidgetDatetime from '@/widgets/datetime/index';
import DecapCmsWidgetFile from '@/widgets/file/index';
import DecapCmsWidgetImage from '@/widgets/image/index';
import DecapCmsWidgetList from '@/widgets/list/index';
import DecapCmsWidgetMap from '@/widgets/map/index';
import DecapCmsWidgetNumber from '@/widgets/number/index';
import DecapCmsWidgetObject from '@/widgets/object/index';
import DecapCmsWidgetRelation from '@/widgets/relation/index';
import {
  passthroughSerializer as richtextPassthroughSerializer,
  tweetBlock,
  Widget as RichtextWidget,
  youtubeBlock,
} from '@/widgets/richtext/index';
import DecapCmsWidgetSelect from '@/widgets/select/index';
import DecapCmsWidgetString from '@/widgets/string/index';
import DecapCmsWidgetText from '@/widgets/text/index';
import DecapCmsWidgetUuid from '@/widgets/uuid/index';
// Locales
import * as locales from '@/locales/index';

import type { CmsLocalePhrases } from '@/lib/util/types/cms/common.js';

/**
 * Register every built-in backend, widget, block, format, and locale on the
 * Registry. Explicit and idempotent (lodash `once`) — no module in this
 * package registers anything at import time; the entry point calls this.
 */
export const registerExtensions = once(function registerExtensions(): void {
  ensurePrismGlobal();

  CMS.registerBackend('git-gateway', GitGatewayBackend);
  CMS.registerBackend('azure', AzureBackend);
  CMS.registerBackend('aws-cognito-github-proxy', AwsCognitoGitHubProxyBackend);
  CMS.registerBackend('github', GitHubBackend);
  CMS.registerBackend('gitlab', GitLabBackend);
  CMS.registerBackend('gitea', GiteaBackend);
  CMS.registerBackend('forgejo', ForgejoBackend);
  CMS.registerBackend('bitbucket', BitbucketBackend);
  CMS.registerBackend('test-repo', TestBackend);
  CMS.registerBackend('proxy', ProxyBackend);
  CMS.registerBackend('laika', createLaikaBackend());
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
    DecapCmsWidgetUuid.Widget(),
    RichtextWidget() as any,
    // v1→v2 back-compat alias: `markdown` was renamed to `richtext` (DCMS-483).
    // See BREAKING_CHANGES_V4_BETA.md for the migration note.
    { ...RichtextWidget(), name: 'markdown' } as any,
  ].forEach(widget => CMS.registerWidget(widget));
  // The richtext widget stores a lazy `LexicalRichtextValue`; the passthrough
  // serializer keeps the proxy intact through Decap's value pipeline so its
  // `toString()` (Lexical -> Portable Text -> output format) fires once, at
  // file-write time.
  CMS.registerWidgetValueSerializer('richtext', richtextPassthroughSerializer);
  CMS.registerWidgetValueSerializer('markdown', richtextPassthroughSerializer);
  // The default output format. Formats are packs (`@/format-packs/*`) so bare
  // consumers can pick theirs; the fat laika app registers markdown out of the box.
  CMS.registerRichtextFormat(markdownFormat);
  // Entry codecs (whole-entry-file encodings) are registerable too; bare
  // consumers register only what their collections use — laika collections
  // are JSON, so `/bare` setups typically need just `jsonEntryCodec`. The
  // markdown codec (frontmatter + opaque body) is kept for git backends and
  // built explicitly with its frontmatter languages: fences are tried in the
  // order given, and the first language is the default when writing.
  CMS.registerEntryCodec(yamlEntryCodec);
  CMS.registerEntryCodec(tomlEntryCodec);
  CMS.registerEntryCodec(jsonEntryCodec);
  CMS.registerEntryCodec(
    createMarkdownEntryCodec({ frontmatter: [yamlFrontmatterCodec, tomlFrontmatterCodec, jsonFrontmatterCodec] }),
  );
  // The legacy `registerEditorComponent` API was removed: images and code
  // blocks are native Portable Text types; custom blocks register via
  // `CMS.registerBlock(...)` (see BREAKING_CHANGES_V4_BETA.md).
  // Default embed blocks (previously hardcoded Lexical nodes that lost their
  // content at persist). Re-register with the same id to customize.
  CMS.registerBlock(youtubeBlock);
  CMS.registerBlock(tweetBlock);
  Object.keys(locales).forEach(locale => {
    CMS.registerLocale(locale, (locales as Record<string, CmsLocalePhrases>)[locale]);
  });
});
