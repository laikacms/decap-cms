import React, { useState } from 'react';

import LaikaButton from './LaikaButton';
import LaikaDialog from './LaikaDialog';

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

export const WithoutHeader: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div id="nc-root">
        <LaikaButton onClick={() => setOpen(true)}>Open headerless dialog</LaikaButton>
        <LaikaDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          ariaLabel="Quick actions"
          showCloseButton={false}
          width="560px"
        >
          <LaikaDialog.Body>
            No title and no close button; labelled via aria-label. Press Esc or click outside to close.
          </LaikaDialog.Body>
        </LaikaDialog>
      </div>
    );
  },
};
