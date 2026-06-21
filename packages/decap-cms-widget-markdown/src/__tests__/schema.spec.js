import schema from '../schema';

describe('markdown widget schema buttons', () => {
  const buttonEnum = schema.properties.buttons.items.enum;

  it('includes strikethrough', () => {
    expect(buttonEnum).toContain('strikethrough');
  });

  it('does not include code-block (not a toolbar button)', () => {
    expect(buttonEnum).not.toContain('code-block');
  });

  it('includes all core toolbar buttons', () => {
    const coreButtons = [
      'bold',
      'italic',
      'strikethrough',
      'code',
      'link',
      'heading-one',
      'heading-two',
      'heading-three',
      'heading-four',
      'heading-five',
      'heading-six',
      'quote',
      'bulleted-list',
      'numbered-list',
    ];
    for (const btn of coreButtons) {
      expect(buttonEnum).toContain(btn);
    }
  });
});
