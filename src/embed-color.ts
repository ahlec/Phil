export enum EmbedColor {
  Info = 'info',
  Success = 'success',
  Error = 'error',
  Timezone = 'timezone',
}

export default EmbedColor;

export function getColorValue(color: EmbedColor): number {
  switch (color) {
    case EmbedColor.Info:
      return 0xb0e0e6;
    case EmbedColor.Success:
      return 0x61b329;
    case EmbedColor.Error:
      return 0xcd5555;
    case EmbedColor.Timezone:
      return 0x7a378b;
  }
}
