export type EmbedColor = 'info' | 'success' | 'error' | 'timezone';

export default EmbedColor;

export function getColorValue(color: EmbedColor): number {
  switch (color) {
    case 'info':
      return 0xb0e0e6;
    case 'success':
      return 0x61b329;
    case 'error':
      return 0xcd5555;
    case 'timezone':
      return 0x7a378b;
  }
}
