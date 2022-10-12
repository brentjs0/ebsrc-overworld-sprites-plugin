import { SnesColor } from './snes-color';

export type SpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette': SnesColor[];
};


export type SpriteGroupPaletteKey = keyof SpriteGroupPalette;

export type IncompleteSpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette'?: SnesColor[];
};

type BaseSpriteGroupPalette =
{
    'Binary File Path': string;
};