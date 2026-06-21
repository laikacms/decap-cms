// Core
import { DecapCmsCore as CMS } from '../core/index';
// Backends
import { AzureBackend } from '../backend-azure/index';
import { AwsCognitoGitHubProxyBackend } from '../backend-aws-cognito-github-proxy/index';
import { GitHubBackend } from '../backend-github/index';
import { GitLabBackend } from '../backend-gitlab/index';
import { GiteaBackend } from '../backend-gitea/index';
import { GitGatewayBackend } from '../backend-git-gateway/index';
import { BitbucketBackend } from '../backend-bitbucket/index';
import { TestBackend } from '../backend-test/index';
import { ProxyBackend } from '../backend-proxy/index';
// Widgets
import DecapCmsWidgetString from '../widget-string/index';
import DecapCmsWidgetNumber from '../widget-number/index';
import DecapCmsWidgetText from '../widget-text/index';
import DecapCmsWidgetImage from '../widget-image/index';
import DecapCmsWidgetFile from '../widget-file/index';
import DecapCmsWidgetSelect from '../widget-select/index';
import DecapCmsWidgetList from '../widget-list/index';
import DecapCmsWidgetObject from '../widget-object/index';
import DecapCmsWidgetRelation from '../widget-relation/index';
import DecapCmsWidgetBoolean from '../widget-boolean/index';
import DecapCmsWidgetMap from '../widget-map/index';
import DecapCmsWidgetDatetime from '../widget-datetime/index';
import DecapCmsWidgetCode from '../widget-code/index';
import DecapCmsWidgetColorString from '../widget-colorstring/index';
import DecapCmsWidgetMarkdown from '../widget-markdown/index';
// Editor Components
import image from '../editor-component-image/index';
// Locales
import * as locales from '../locales/index';

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
  DecapCmsWidgetMarkdown.Widget(),
].forEach(widget => CMS.registerWidget(widget));
// The markdown widget stores a lazy `RichtextValue`; serialize it to a markdown
// string at persist time (deserialize on load) via the value-serializer pipeline.
CMS.registerWidgetValueSerializer('markdown', DecapCmsWidgetMarkdown.valueSerializer);
CMS.registerEditorComponent(image as any);
CMS.registerEditorComponent({
  id: 'code-block',
  label: 'Code Block',
  widget: 'code',
  type: 'code-block',
} as any);
Object.keys(locales).forEach(locale => {
  CMS.registerLocale(locale, (locales as Record<string, unknown>)[locale]);
});
