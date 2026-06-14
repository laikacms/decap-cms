import React from 'react';
import { render } from '@testing-library/react';
import { Map } from 'immutable';

import FilePreview from '../FilePreview';

function getAsset(value) {
  return value;
}

describe('FilePreview', () => {
  describe('class prop', () => {
    it('applies class from field to the preview container', () => {
      const field = Map({ name: 'file', widget: 'file', class: 'my-class' });
      const { container } = render(
        <FilePreview value="file.pdf" getAsset={getAsset} field={field} />,
      );
      expect(container.firstChild).toHaveClass('my-class');
    });

    it('does not set a custom className when class is not defined on the field', () => {
      const field = Map({ name: 'file', widget: 'file' });
      const { container } = render(
        <FilePreview value="file.pdf" getAsset={getAsset} field={field} />,
      );
      expect(container.firstChild).not.toHaveClass('my-class');
    });

    it('renders without errors when field is not provided', () => {
      const { container } = render(<FilePreview value="file.pdf" getAsset={getAsset} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
