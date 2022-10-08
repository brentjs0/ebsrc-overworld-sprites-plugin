import { SnesColor } from './snes-color';

type BaseSpriteGroupPalette =
{
    'Binary File Path': string;
};

export type SpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette': SnesColor[];
};

export namespace SpriteGroupPalette
{
    export type Key = keyof SpriteGroupPalette;
}

export type IncompleteSpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette'?: SnesColor[];
};