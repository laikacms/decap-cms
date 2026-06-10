import React from 'react';
import { fromJS } from 'immutable';
import { render, act } from '@testing-library/react';

import ImagePreview from '../ImagePreview';

const ASSET_URL = 'https://example.com/image.jpg';

function makeGetAsset(url) {
  return jest.fn(() => url);
}

async function renderPreview({ fieldMap, value = 'image.jpg' } = {}) {
  const getAsset = makeGetAsset(ASSET_URL);
  const field = fromJS(fieldMap || {});
  let result;
  await act(async () => {
    result = render(<ImagePreview value={value} getAsset={getAsset} field={field} />);
  });
  return result;
}

describe('ImagePreview — class field option', () => {
  it('applies className from field.class to the rendered img', async () => {
    const { container } = await renderPreview({ fieldMap: { class: 'thumb' } });
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveClass('thumb');
  });

  it('does not apply a class attribute when field.class is absent', async () => {
    const { container } = await renderPreview({ fieldMap: {} });
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.className).not.toContain('thumb');
    expect(img.getAttribute('class')).not.toMatch(/^thumb/);
  });
});
