import { Color15 } from "./color";

type BaseSpriteGroupPalette =
{
    'Binary File Path': string;
};

export type SpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette': Color15[];
};

export namespace SpriteGroupPalette
{
    export type Key = keyof SpriteGroupPalette;
}

export type IncompleteSpriteGroupPalette = BaseSpriteGroupPalette &
{
    'Palette'?: Color15[];
};