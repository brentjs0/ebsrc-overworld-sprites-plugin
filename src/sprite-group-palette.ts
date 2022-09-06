export type SpriteGroupPalette = {
    number: number;
    binaryFilePath: string;
    pngFilePath: string;
}

export type SpriteGroupPaletteKey = keyof SpriteGroupPalette;
export const spriteGroupPaletteKeyDisplayOrder: SpriteGroupPaletteKey[] = [
    'number',
    'binaryFilePath',
    'pngFilePath'
];