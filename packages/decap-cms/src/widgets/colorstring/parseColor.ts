/**
 * Minimal CSS color parser for the colorstring widget. Replaces tinycolor2:
 * reads hex, named colors, `transparent`, and rgb()/rgba()/hsl()/hsla() in
 * both comma-separated and space-separated (`/ alpha`) syntax, with number or
 * percent channels. hsv()/hwb()/lab() and friends are not supported. Writes
 * lowercase hex or rgba() strings back.
 */

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/* dprint-ignore */
const NAMED_COLORS: Record<string, string> = {
  aliceblue: 'f0f8ff', antiquewhite: 'faebd7', aqua: '00ffff', aquamarine: '7fffd4', azure: 'f0ffff',
  beige: 'f5f5dc', bisque: 'ffe4c4', black: '000000', blanchedalmond: 'ffebcd', blue: '0000ff',
  blueviolet: '8a2be2', brown: 'a52a2a', burlywood: 'deb887', cadetblue: '5f9ea0', chartreuse: '7fff00',
  chocolate: 'd2691e', coral: 'ff7f50', cornflowerblue: '6495ed', cornsilk: 'fff8dc', crimson: 'dc143c',
  cyan: '00ffff', darkblue: '00008b', darkcyan: '008b8b', darkgoldenrod: 'b8860b', darkgray: 'a9a9a9',
  darkgreen: '006400', darkgrey: 'a9a9a9', darkkhaki: 'bdb76b', darkmagenta: '8b008b', darkolivegreen: '556b2f',
  darkorange: 'ff8c00', darkorchid: '9932cc', darkred: '8b0000', darksalmon: 'e9967a', darkseagreen: '8fbc8f',
  darkslateblue: '483d8b', darkslategray: '2f4f4f', darkslategrey: '2f4f4f', darkturquoise: '00ced1',
  darkviolet: '9400d3', deeppink: 'ff1493', deepskyblue: '00bfff', dimgray: '696969', dimgrey: '696969',
  dodgerblue: '1e90ff', firebrick: 'b22222', floralwhite: 'fffaf0', forestgreen: '228b22', fuchsia: 'ff00ff',
  gainsboro: 'dcdcdc', ghostwhite: 'f8f8ff', gold: 'ffd700', goldenrod: 'daa520', gray: '808080',
  green: '008000', greenyellow: 'adff2f', grey: '808080', honeydew: 'f0fff0', hotpink: 'ff69b4',
  indianred: 'cd5c5c', indigo: '4b0082', ivory: 'fffff0', khaki: 'f0e68c', lavender: 'e6e6fa',
  lavenderblush: 'fff0f5', lawngreen: '7cfc00', lemonchiffon: 'fffacd', lightblue: 'add8e6', lightcoral: 'f08080',
  lightcyan: 'e0ffff', lightgoldenrodyellow: 'fafad2', lightgray: 'd3d3d3', lightgreen: '90ee90',
  lightgrey: 'd3d3d3', lightpink: 'ffb6c1', lightsalmon: 'ffa07a', lightseagreen: '20b2aa',
  lightskyblue: '87cefa', lightslategray: '778899', lightslategrey: '778899', lightsteelblue: 'b0c4de',
  lightyellow: 'ffffe0', lime: '00ff00', limegreen: '32cd32', linen: 'faf0e6', magenta: 'ff00ff',
  maroon: '800000', mediumaquamarine: '66cdaa', mediumblue: '0000cd', mediumorchid: 'ba55d3',
  mediumpurple: '9370db', mediumseagreen: '3cb371', mediumslateblue: '7b68ee', mediumspringgreen: '00fa9a',
  mediumturquoise: '48d1cc', mediumvioletred: 'c71585', midnightblue: '191970', mintcream: 'f5fffa',
  mistyrose: 'ffe4e1', moccasin: 'ffe4b5', navajowhite: 'ffdead', navy: '000080', oldlace: 'fdf5e6',
  olive: '808000', olivedrab: '6b8e23', orange: 'ffa500', orangered: 'ff4500', orchid: 'da70d6',
  palegoldenrod: 'eee8aa', palegreen: '98fb98', paleturquoise: 'afeeee', palevioletred: 'db7093',
  papayawhip: 'ffefd5', peachpuff: 'ffdab9', peru: 'cd853f', pink: 'ffc0cb', plum: 'dda0dd',
  powderblue: 'b0e0e6', purple: '800080', rebeccapurple: '663399', red: 'ff0000', rosybrown: 'bc8f8f',
  royalblue: '4169e1', saddlebrown: '8b4513', salmon: 'fa8072', sandybrown: 'f4a460', seagreen: '2e8b57',
  seashell: 'fff5ee', sienna: 'a0522d', silver: 'c0c0c0', skyblue: '87ceeb', slateblue: '6a5acd',
  slategray: '708090', slategrey: '708090', snow: 'fffafa', springgreen: '00ff7f', steelblue: '4682b4',
  tan: 'd2b48c', teal: '008080', thistle: 'd8bfd8', tomato: 'ff6347', turquoise: '40e0d0',
  violet: 'ee82ee', wheat: 'f5deb3', white: 'ffffff', whitesmoke: 'f5f5f5', yellow: 'ffff00',
  yellowgreen: '9acd32',
};

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 0), max);
}

function parseHex(hex: string): RgbaColor | null {
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)`;
const COMPONENT = new RegExp(`^(${NUMBER})(%|deg)?$`);

function parseComponent(token: string): { value: number, unit: string } | null {
  const match = token.match(COMPONENT);
  return match ? { value: Number(match[1]), unit: match[2] ?? '' } : null;
}

function parseChannel(token: string, max: number): number | null {
  const component = parseComponent(token);
  if (!component || component.unit === 'deg') return null;
  const scaled = component.unit === '%' ? component.value / 100 * max : component.value;
  return clamp(scaled, max);
}

function parseAlpha(token: string | undefined): number | null {
  if (token === undefined) return 1;
  return parseChannel(token, 1);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset: number) => {
    const t = (hue + offset + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(1 / 3), channel(0), channel(-1 / 3)].map(c => Math.round(c * 255)) as [number, number, number];
}

function parseFunctionalColor(isRgb: boolean, args: string): RgbaColor | null {
  const trimmed = args.trim();
  let tokens: string[];
  if (trimmed.includes(',')) {
    if (trimmed.includes('/')) return null;
    tokens = trimmed.split(',').map(token => token.trim());
  } else {
    const [channels, alpha, ...rest] = trimmed.split('/').map(part => part.trim());
    if (rest.length > 0 || (alpha !== undefined && !alpha)) return null;
    tokens = channels.split(/\s+/);
    if (alpha !== undefined) tokens.push(alpha);
  }
  if (tokens.length !== 3 && tokens.length !== 4) return null;

  const a = parseAlpha(tokens[3]);
  if (a === null) return null;

  if (isRgb) {
    const [r, g, b] = tokens.slice(0, 3).map(token => parseChannel(token, 255));
    if (r === null || g === null || b === null) return null;
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
  }

  const hue = parseComponent(tokens[0]);
  if (!hue || hue.unit === '%' || !tokens[1].endsWith('%') || !tokens[2].endsWith('%')) return null;
  const s = parseChannel(tokens[1], 1);
  const l = parseChannel(tokens[2], 1);
  if (s === null || l === null) return null;
  const [r, g, b] = hslToRgb(hue.value, s, l);
  return { r, g, b, a };
}

export function parseColor(input: string | undefined): RgbaColor | null {
  const value = input?.trim().toLowerCase();
  if (!value) return null;

  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const named = NAMED_COLORS[value];
  if (named) return parseHex(named);

  if (value.startsWith('#')) return parseHex(value.slice(1));

  const fn = value.match(/^(rgba?|hsla?)\(([^()]*)\)$/);
  if (fn) return parseFunctionalColor(fn[1].startsWith('rgb'), fn[2]);

  return null;
}

export function toHexString({ r, g, b }: RgbaColor): string {
  const hex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function toRgbaString({ r, g, b, a }: RgbaColor): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
