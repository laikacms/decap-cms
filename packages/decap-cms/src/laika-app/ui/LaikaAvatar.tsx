import React from 'react';

import { Avatar } from '@/ui/Avatar';

import type { AvatarProps, AvatarSize } from '@/ui/Avatar';

/**
 * Backwards-compatible alias over the canonical `@/ui` Avatar (DCMS-544, per
 * #635/DCMS-548) — the same Base UI wrapper, no divergent second
 * implementation, kept so `@laikacms/decap-cms/laika-app/bare` consumers
 * importing `LaikaAvatar` don't need to change call sites.
 */

export type LaikaAvatarSize = AvatarSize;
export type LaikaAvatarProps = AvatarProps;

function LaikaAvatar(props: LaikaAvatarProps) {
  return <Avatar {...props} />;
}

export default LaikaAvatar;
