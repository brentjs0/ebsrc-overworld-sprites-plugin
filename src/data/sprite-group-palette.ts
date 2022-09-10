export type SpriteGroupPalette =
{
    number: number;
    binaryFilePath: string;
    pngFilePath: string;
}

export namespace SpriteGroupPalette 
{
    export type Key = keyof SpriteGroupPalette;
    export const displayOrder: Key[] =
    [
        'number',
        'binaryFilePath',
        'pngFilePath'
    ];
}