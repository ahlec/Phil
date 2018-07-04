export enum EmbedColor {
    Info = 'info',
    Success = 'success',
    Error = 'error',
    Timezone = 'timezone'
}

export default EmbedColor;

export function getColorValue(color: EmbedColor): number {
    switch (color) {
        case EmbedColor.Info: return 0xB0E0E6;
        case EmbedColor.Success: return 0x61B329;
        case EmbedColor.Error: return 0xCD5555;
        case EmbedColor.Timezone: return 0x7A378B;
    }
}
