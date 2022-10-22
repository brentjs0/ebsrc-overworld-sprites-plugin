import { SnesColor } from './snes-color';

export type SpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette': SnesColor[];
};

export type SpriteGroupPaletteKey = keyof SpriteGroupPalette;

// export function validateImportedSpriteGroupPalettes(value: unknown): string | undefined
// {
//     if (typeof value !== 'object')
//     {
        
//     }
//     objectHasKey())
// {
// }

export type IncompleteSpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette'?: SnesColor[];
};

type BaseSpriteGroupPalette =
{
    'Binary File Path': string;
};