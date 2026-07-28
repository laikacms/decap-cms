const mockRegisterBackend = jest.fn();
const mockRegisterWidget = jest.fn();
const mockRegisterEditorComponent = jest.fn();
const mockRegisterLocale = jest.fn();

jest.mock(
  'decap-cms-core',
  () => ({
    DecapCmsCore: {
      registerBackend: mockRegisterBackend,
      registerWidget: mockRegisterWidget,
      registerEditorComponent: mockRegisterEditorComponent,
      registerLocale: mockRegisterLocale,
    },
  }),
  { virtual: true },
);

// Backends
jest.mock('decap-cms-backend-azure', () => ({ AzureBackend: 'AzureBackendMock' }), {
  virtual: true,
});
jest.mock(
  'decap-cms-backend-aws-cognito-github-proxy',
  () => ({
    AwsCognitoGitHubProxyBackend: 'AwsCognitoGitHubProxyBackendMock',
  }),
  { virtual: true },
);
jest.mock('decap-cms-backend-github', () => ({ GitHubBackend: 'GitHubBackendMock' }), {
  virtual: true,
});
jest.mock('decap-cms-backend-gitlab', () => ({ GitLabBackend: 'GitLabBackendMock' }), {
  virtual: true,
});
jest.mock('decap-cms-backend-gitea', () => ({ GiteaBackend: 'GiteaBackendMock' }), {
  virtual: true,
});
jest.mock('decap-cms-backend-git-gateway', () => ({ GitGatewayBackend: 'GitGatewayBackendMock' }), {
  virtual: true,
});
jest.mock('decap-cms-backend-bitbucket', () => ({ BitbucketBackend: 'BitbucketBackendMock' }), {
  virtual: true,
});
jest.mock('decap-cms-backend-test', () => ({ TestBackend: 'TestBackendMock' }), {
  virtual: true,
});
jest.mock('decap-cms-backend-proxy', () => ({ ProxyBackend: 'ProxyBackendMock' }), {
  virtual: true,
});

// Widgets
function mockWidget(name) {
  return {
    __esModule: true,
    default: { Widget: jest.fn(() => `${name}Definition`) },
  };
}
jest.mock('decap-cms-widget-string', () => mockWidget('String'), { virtual: true });
jest.mock('decap-cms-widget-number', () => mockWidget('Number'), { virtual: true });
jest.mock('decap-cms-widget-text', () => mockWidget('Text'), { virtual: true });
jest.mock('decap-cms-widget-image', () => mockWidget('Image'), { virtual: true });
jest.mock('decap-cms-widget-file', () => mockWidget('File'), { virtual: true });
jest.mock('decap-cms-widget-select', () => mockWidget('Select'), { virtual: true });
jest.mock('decap-cms-widget-markdown', () => mockWidget('Markdown'), { virtual: true });
jest.mock('decap-cms-widget-richtext', () => mockWidget('Richtext'), { virtual: true });
jest.mock('decap-cms-widget-list', () => mockWidget('List'), { virtual: true });
jest.mock('decap-cms-widget-object', () => mockWidget('Object'), { virtual: true });
jest.mock('decap-cms-widget-relation', () => mockWidget('Relation'), { virtual: true });
jest.mock('decap-cms-widget-boolean', () => mockWidget('Boolean'), { virtual: true });
jest.mock('decap-cms-widget-map', () => mockWidget('Map'), { virtual: true });
jest.mock('decap-cms-widget-datetime', () => mockWidget('Datetime'), { virtual: true });
jest.mock('decap-cms-widget-code', () => mockWidget('Code'), { virtual: true });
jest.mock('decap-cms-widget-colorstring', () => mockWidget('ColorString'), { virtual: true });

// Editor components
jest.mock(
  'decap-cms-editor-component-image',
  () => ({
    __esModule: true,
    default: 'ImageEditorComponentMock',
  }),
  { virtual: true },
);

// Locales
jest.mock('decap-cms-locales', () => ({ en: {}, fr: {} }), { virtual: true });

describe('extensions', () => {
  beforeAll(() => {
    // eslint-disable-next-line global-require
    require('../extensions');
  });

  it('registers every backend with the correct implementation', () => {
    expect(mockRegisterBackend).toHaveBeenCalledTimes(9);
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(1, 'git-gateway', 'GitGatewayBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(2, 'azure', 'AzureBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(
      3,
      'aws-cognito-github-proxy',
      'AwsCognitoGitHubProxyBackendMock',
    );
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(4, 'github', 'GitHubBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(5, 'gitlab', 'GitLabBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(6, 'gitea', 'GiteaBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(7, 'bitbucket', 'BitbucketBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(8, 'test-repo', 'TestBackendMock');
    expect(mockRegisterBackend).toHaveBeenNthCalledWith(9, 'proxy', 'ProxyBackendMock');
  });

  it('registers all 16 widgets in a single call', () => {
    expect(mockRegisterWidget).toHaveBeenCalledTimes(1);
    expect(mockRegisterWidget).toHaveBeenCalledWith([
      'StringDefinition',
      'NumberDefinition',
      'TextDefinition',
      'ImageDefinition',
      'FileDefinition',
      'SelectDefinition',
      'MarkdownDefinition',
      'RichtextDefinition',
      'ListDefinition',
      'ObjectDefinition',
      'RelationDefinition',
      'BooleanDefinition',
      'MapDefinition',
      'DatetimeDefinition',
      'CodeDefinition',
      'ColorStringDefinition',
    ]);
    expect(mockRegisterWidget.mock.calls[0][0]).toHaveLength(16);
  });

  it('registers the image and code-block editor components', () => {
    expect(mockRegisterEditorComponent).toHaveBeenCalledTimes(2);
    expect(mockRegisterEditorComponent).toHaveBeenNthCalledWith(1, 'ImageEditorComponentMock');
    expect(mockRegisterEditorComponent).toHaveBeenNthCalledWith(2, {
      id: 'code-block',
      label: 'Code Block',
      widget: 'code',
      type: 'code-block',
    });
  });
});
