/**
 * Bundled SVG icons for the decap-cms UI layer.
 *
 * GENERATED FILE (scripts context: DCMS-492 follow-up). Vendored from
 * lucide-react@1.21.0 (https://lucide.dev, ISC license) so the UI does not
 * depend on the lucide-react package at runtime; only the opt-in
 * `widgets/lucide-icon` picker needs the real library (optional peer dep).
 * The SVG bodies are rendered from the installed package, so output is
 * identical to the previous direct imports.
 *
 * Prop surface intentionally mirrors lucide-react's: `size` (default 24),
 * standard SVG props (`className`, `strokeWidth`, ...).
 */
import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

function createIcon(displayName: string, children: React.ReactNode) {
  function Icon({ size = 24, strokeWidth = 2, ...rest }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const IndentDecreaseIcon = createIcon(
  'IndentDecreaseIcon',
  (
    <>
      <path d="M21 5H11">
      </path>
      <path d="M21 12H11">
      </path>
      <path d="M21 19H11">
      </path>
      <path d="m7 8-4 4 4 4">
      </path>
    </>
  ),
);

export const IndentIncreaseIcon = createIcon(
  'IndentIncreaseIcon',
  (
    <>
      <path d="M21 5H11">
      </path>
      <path d="M21 12H11">
      </path>
      <path d="M21 19H11">
      </path>
      <path d="m3 8 4 4-4 4">
      </path>
    </>
  ),
);

export const AlignCenterIcon = createIcon(
  'AlignCenterIcon',
  (
    <>
      <path d="M21 5H3">
      </path>
      <path d="M17 12H7">
      </path>
      <path d="M19 19H5">
      </path>
    </>
  ),
);

export const AlignJustifyIcon = createIcon(
  'AlignJustifyIcon',
  (
    <>
      <path d="M3 5h18">
      </path>
      <path d="M3 12h18">
      </path>
      <path d="M3 19h18">
      </path>
    </>
  ),
);

export const AlignLeftIcon = createIcon(
  'AlignLeftIcon',
  (
    <>
      <path d="M21 5H3">
      </path>
      <path d="M15 12H3">
      </path>
      <path d="M17 19H3">
      </path>
    </>
  ),
);

export const AlignRightIcon = createIcon(
  'AlignRightIcon',
  (
    <>
      <path d="M21 5H3">
      </path>
      <path d="M21 12H9">
      </path>
      <path d="M21 19H7">
      </path>
    </>
  ),
);

export const BaselineIcon = createIcon(
  'BaselineIcon',
  (
    <>
      <path d="M4 20h16">
      </path>
      <path d="m6 16 6-12 6 12">
      </path>
      <path d="M8 12h8">
      </path>
    </>
  ),
);

export const BoldIcon = createIcon(
  'BoldIcon',
  (
    <>
      <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8">
      </path>
    </>
  ),
);

export const CalendarIcon = createIcon(
  'CalendarIcon',
  (
    <>
      <path d="M8 2v4">
      </path>
      <path d="M16 2v4">
      </path>
      <rect width="18" height="18" x="3" y="4" rx="2">
      </rect>
      <path d="M3 10h18">
      </path>
    </>
  ),
);

export const CheckIcon = createIcon(
  'CheckIcon',
  (
    <>
      <path d="M20 6 9 17l-5-5">
      </path>
    </>
  ),
);

export const ChevronDownIcon = createIcon(
  'ChevronDownIcon',
  (
    <>
      <path d="m6 9 6 6 6-6">
      </path>
    </>
  ),
);

export const ChevronRightIcon = createIcon(
  'ChevronRightIcon',
  (
    <>
      <path d="m9 18 6-6-6-6">
      </path>
    </>
  ),
);

export const ChevronUpIcon = createIcon(
  'ChevronUpIcon',
  (
    <>
      <path d="m18 15-6-6-6 6">
      </path>
    </>
  ),
);

export const CircleCheckIcon = createIcon(
  'CircleCheckIcon',
  (
    <>
      <circle cx="12" cy="12" r="10">
      </circle>
      <path d="m9 12 2 2 4-4">
      </path>
    </>
  ),
);

export const CircleUserRoundIcon = createIcon(
  'CircleUserRoundIcon',
  (
    <>
      <path d="M17.925 20.056a6 6 0 0 0-11.851.001">
      </path>
      <circle cx="12" cy="11" r="4">
      </circle>
      <circle cx="12" cy="12" r="10">
      </circle>
    </>
  ),
);

export const Clipboard = createIcon(
  'Clipboard',
  (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1">
      </rect>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2">
      </path>
    </>
  ),
);

export const ClipboardType = createIcon(
  'ClipboardType',
  (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1">
      </rect>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2">
      </path>
      <path d="M9 12v-1h6v1">
      </path>
      <path d="M11 17h2">
      </path>
      <path d="M12 11v6">
      </path>
    </>
  ),
);

export const CodeIcon = createIcon(
  'CodeIcon',
  (
    <>
      <path d="m16 18 6-6-6-6">
      </path>
      <path d="m8 6-6 6 6 6">
      </path>
    </>
  ),
);

export const Columns3Icon = createIcon(
  'Columns3Icon',
  (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2">
      </rect>
      <path d="M9 3v18">
      </path>
      <path d="M15 3v18">
      </path>
    </>
  ),
);

export const CopyIcon = createIcon(
  'CopyIcon',
  (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2">
      </rect>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2">
      </path>
    </>
  ),
);

export const DownloadIcon = createIcon(
  'DownloadIcon',
  (
    <>
      <path d="M12 15V3">
      </path>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4">
      </path>
      <path d="m7 10 5 5 5-5">
      </path>
    </>
  ),
);

export const EraserIcon = createIcon(
  'EraserIcon',
  (
    <>
      <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21">
      </path>
      <path d="m5.082 11.09 8.828 8.828">
      </path>
    </>
  ),
);

export const FileTextIcon = createIcon(
  'FileTextIcon',
  (
    <>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z">
      </path>
      <path d="M14 2v5a1 1 0 0 0 1 1h5">
      </path>
      <path d="M10 9H8">
      </path>
      <path d="M16 13H8">
      </path>
      <path d="M16 17H8">
      </path>
    </>
  ),
);

export const GripVerticalIcon = createIcon(
  'GripVerticalIcon',
  (
    <>
      <circle cx="9" cy="12" r="1">
      </circle>
      <circle cx="9" cy="5" r="1">
      </circle>
      <circle cx="9" cy="19" r="1">
      </circle>
      <circle cx="15" cy="12" r="1">
      </circle>
      <circle cx="15" cy="5" r="1">
      </circle>
      <circle cx="15" cy="19" r="1">
      </circle>
    </>
  ),
);

export const Heading1Icon = createIcon(
  'Heading1Icon',
  (
    <>
      <path d="M4 12h8">
      </path>
      <path d="M4 18V6">
      </path>
      <path d="M12 18V6">
      </path>
      <path d="m17 12 3-2v8">
      </path>
    </>
  ),
);

export const Heading2Icon = createIcon(
  'Heading2Icon',
  (
    <>
      <path d="M4 12h8">
      </path>
      <path d="M4 18V6">
      </path>
      <path d="M12 18V6">
      </path>
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1">
      </path>
    </>
  ),
);

export const Heading3Icon = createIcon(
  'Heading3Icon',
  (
    <>
      <path d="M4 12h8">
      </path>
      <path d="M4 18V6">
      </path>
      <path d="M12 18V6">
      </path>
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2">
      </path>
      <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2">
      </path>
    </>
  ),
);

export const ImageIcon = createIcon(
  'ImageIcon',
  (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2">
      </rect>
      <circle cx="9" cy="9" r="2">
      </circle>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21">
      </path>
    </>
  ),
);

export const ItalicIcon = createIcon(
  'ItalicIcon',
  (
    <>
      <line x1="19" x2="10" y1="4" y2="4">
      </line>
      <line x1="14" x2="5" y1="20" y2="20">
      </line>
      <line x1="15" x2="9" y1="4" y2="20">
      </line>
    </>
  ),
);

export const Link2Off = createIcon(
  'Link2Off',
  (
    <>
      <path d="M9 17H7A5 5 0 0 1 7 7">
      </path>
      <path d="M15 7h2a5 5 0 0 1 4 8">
      </path>
      <line x1="8" x2="12" y1="12" y2="12">
      </line>
      <line x1="2" x2="22" y1="2" y2="22">
      </line>
    </>
  ),
);

export const LinkIcon = createIcon(
  'LinkIcon',
  (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71">
      </path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71">
      </path>
    </>
  ),
);

export const ListIcon = createIcon(
  'ListIcon',
  (
    <>
      <path d="M3 5h.01">
      </path>
      <path d="M3 12h.01">
      </path>
      <path d="M3 19h.01">
      </path>
      <path d="M8 5h13">
      </path>
      <path d="M8 12h13">
      </path>
      <path d="M8 19h13">
      </path>
    </>
  ),
);

export const ListOrderedIcon = createIcon(
  'ListOrderedIcon',
  (
    <>
      <path d="M11 5h10">
      </path>
      <path d="M11 12h10">
      </path>
      <path d="M11 19h10">
      </path>
      <path d="M4 4h1v5">
      </path>
      <path d="M4 9h2">
      </path>
      <path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02">
      </path>
    </>
  ),
);

export const ListTodoIcon = createIcon(
  'ListTodoIcon',
  (
    <>
      <path d="M13 5h8">
      </path>
      <path d="M13 12h8">
      </path>
      <path d="M13 19h8">
      </path>
      <path d="m3 17 2 2 4-4">
      </path>
      <rect x="3" y="4" width="6" height="6" rx="1">
      </rect>
    </>
  ),
);

export const LockIcon = createIcon(
  'LockIcon',
  (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2">
      </rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4">
      </path>
    </>
  ),
);

export const MessageCircleIcon = createIcon(
  'MessageCircleIcon',
  (
    <>
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719">
      </path>
    </>
  ),
);

export const MicIcon = createIcon(
  'MicIcon',
  (
    <>
      <path d="M12 19v3">
      </path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2">
      </path>
      <rect x="9" y="2" width="6" height="13" rx="3">
      </rect>
    </>
  ),
);

export const MinusIcon = createIcon(
  'MinusIcon',
  (
    <>
      <path d="M5 12h14">
      </path>
    </>
  ),
);

export const NotebookPenIcon = createIcon(
  'NotebookPenIcon',
  (
    <>
      <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4">
      </path>
      <path d="M2 6h4">
      </path>
      <path d="M2 10h4">
      </path>
      <path d="M2 14h4">
      </path>
      <path d="M2 18h4">
      </path>
      <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z">
      </path>
    </>
  ),
);

export const PaintBucketIcon = createIcon(
  'PaintBucketIcon',
  (
    <>
      <path d="M11 7 6 2">
      </path>
      <path d="M18.992 12H2.041">
      </path>
      <path d="M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595">
      </path>
      <path d="m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33">
      </path>
    </>
  ),
);

export const PencilIcon = createIcon(
  'PencilIcon',
  (
    <>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z">
      </path>
      <path d="m15 5 4 4">
      </path>
    </>
  ),
);

export const PlusIcon = createIcon(
  'PlusIcon',
  (
    <>
      <path d="M5 12h14">
      </path>
      <path d="M12 5v14">
      </path>
    </>
  ),
);

export const PuzzleIcon = createIcon(
  'PuzzleIcon',
  (
    <>
      <path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z">
      </path>
    </>
  ),
);

export const QuoteIcon = createIcon(
  'QuoteIcon',
  (
    <>
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z">
      </path>
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z">
      </path>
    </>
  ),
);

export const RedoIcon = createIcon(
  'RedoIcon',
  (
    <>
      <path d="M21 7v6h-6">
      </path>
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7">
      </path>
    </>
  ),
);

export const ScissorsIcon = createIcon(
  'ScissorsIcon',
  (
    <>
      <circle cx="6" cy="6" r="3">
      </circle>
      <path d="M8.12 8.12 12 12">
      </path>
      <path d="M20 4 8.12 15.88">
      </path>
      <circle cx="6" cy="18" r="3">
      </circle>
      <path d="M14.8 14.8 20 20">
      </path>
    </>
  ),
);

export const SearchIcon = createIcon(
  'SearchIcon',
  (
    <>
      <path d="m21 21-4.34-4.34">
      </path>
      <circle cx="11" cy="11" r="8">
      </circle>
    </>
  ),
);

export const SendIcon = createIcon(
  'SendIcon',
  (
    <>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z">
      </path>
      <path d="m21.854 2.147-10.94 10.939">
      </path>
    </>
  ),
);

export const StrikethroughIcon = createIcon(
  'StrikethroughIcon',
  (
    <>
      <path d="M16 4H9a3 3 0 0 0-2.83 4">
      </path>
      <path d="M14 12a4 4 0 0 1 0 8H6">
      </path>
      <line x1="4" x2="20" y1="12" y2="12">
      </line>
    </>
  ),
);

export const SubscriptIcon = createIcon(
  'SubscriptIcon',
  (
    <>
      <path d="m4 5 8 8">
      </path>
      <path d="m12 5-8 8">
      </path>
      <path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07">
      </path>
    </>
  ),
);

export const SuperscriptIcon = createIcon(
  'SuperscriptIcon',
  (
    <>
      <path d="m4 19 8-8">
      </path>
      <path d="m12 19-8-8">
      </path>
      <path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06">
      </path>
    </>
  ),
);

export const TableIcon = createIcon(
  'TableIcon',
  (
    <>
      <path d="M12 3v18">
      </path>
      <rect width="18" height="18" x="3" y="3" rx="2">
      </rect>
      <path d="M3 9h18">
      </path>
      <path d="M3 15h18">
      </path>
    </>
  ),
);

export const Trash = createIcon(
  'Trash',
  (
    <>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6">
      </path>
      <path d="M3 6h18">
      </path>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
      </path>
    </>
  ),
);

export const Trash2Icon = createIcon(
  'Trash2Icon',
  (
    <>
      <path d="M10 11v6">
      </path>
      <path d="M14 11v6">
      </path>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6">
      </path>
      <path d="M3 6h18">
      </path>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
      </path>
    </>
  ),
);

export const TypeIcon = createIcon(
  'TypeIcon',
  (
    <>
      <path d="M12 4v16">
      </path>
      <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2">
      </path>
      <path d="M9 20h6">
      </path>
    </>
  ),
);

export const UnderlineIcon = createIcon(
  'UnderlineIcon',
  (
    <>
      <path d="M6 4v6a6 6 0 0 0 12 0V4">
      </path>
      <line x1="4" x2="20" y1="20" y2="20">
      </line>
    </>
  ),
);

export const UndoIcon = createIcon(
  'UndoIcon',
  (
    <>
      <path d="M3 7v6h6">
      </path>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13">
      </path>
    </>
  ),
);

export const UnlockIcon = createIcon(
  'UnlockIcon',
  (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2">
      </rect>
      <path d="M7 11V7a5 5 0 0 1 9.9-1">
      </path>
    </>
  ),
);

export const UploadIcon = createIcon(
  'UploadIcon',
  (
    <>
      <path d="M12 3v12">
      </path>
      <path d="m17 8-5-5-5 5">
      </path>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4">
      </path>
    </>
  ),
);

export const VideoIcon = createIcon(
  'VideoIcon',
  (
    <>
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5">
      </path>
      <rect x="2" y="6" width="14" height="12" rx="2">
      </rect>
    </>
  ),
);

export const XIcon = createIcon(
  'XIcon',
  (
    <>
      <path d="M18 6 6 18">
      </path>
      <path d="m6 6 12 12">
      </path>
    </>
  ),
);

// lucide-react alias names kept so call sites work unchanged.
export const TextIcon = AlignLeftIcon;
export const Check = CheckIcon;
export const Copy = CopyIcon;
export const Minus = MinusIcon;
export const Pencil = PencilIcon;
export const Plus = PlusIcon;
export const Scissors = ScissorsIcon;
export const Trash2 = Trash2Icon;
export const X = XIcon;
