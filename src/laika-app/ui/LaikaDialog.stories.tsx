import React, { useState } from 'react';

import LaikaDialog from './LaikaDialog';
import LaikaButton from './LaikaButton';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LaikaDialog> = {
  title: 'Primitives/LaikaDialog',
  component: LaikaDialog,
};
export default meta;
type Story = StoryObj<typeof LaikaDialog>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div id="nc-root">
        <LaikaButton onClick={() => setOpen(true)}>Open dialog</LaikaButton>
        <LaikaDialog isOpen={open} onClose={() => setOpen(false)} title="Confirm delete">
          <LaikaDialog.Body>
            This action cannot be undone. The entry will be permanently removed.
          </LaikaDialog.Body>
          <LaikaDialog.Footer>
            <LaikaButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </LaikaButton>
            <LaikaButton variant="danger" onClick={() => setOpen(false)}>
              Delete
            </LaikaButton>
          </LaikaDialog.Footer>
        </LaikaDialog>
      </div>
    );
  },
};
