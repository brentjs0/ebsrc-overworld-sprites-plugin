import { Sprite, validateExtractedSprite } from './sprite';
import { isNullish, isNullishOrEmpty, returnOrThrowErrorMessage, toTitleCase } from '../utility';

export type CSSpriteGroup =
{
    'East/West Collision Height': number;
    'East/West Collision Width': number;
    'Length': number;
    'North/South Collision Height': number;
    'North/South Collision Width': number;
    'Size': SpriteGroupSize;
    'Swim Flags': boolean[];
};

export type SpriteGroup = CSSpriteGroup &
{
    'Palette Autodetect Override'?: number;

    label: string;
    binaryLabel: string;
    pngFilePath: string;
    tilesWide: number;
    tilesHigh: number;
    paletteIndex: number;

    binaryBankPath: string;
    sprites: Sprite[];
};

export type IncompleteSpriteGroup = Omit<Partial<SpriteGroup>, 'sprites'> & { sprites?: Partial<Sprite>[] };

export type SpriteGroupSize =
    '16x16' | '16x16 2' | '24x16' | '32x16' | '48x16' | '16x24' | '24x24' | '16x32' |
    '32x32' | '48x32' | '24x40' | '16x48' | '32x48' | '48x48' | '64x48' | '64x64' | '64x80';

export type SpriteMap = 
{
    spriteGroupSize: SpriteGroupSize;
    tilesWide: number;
    tilesHigh: number;
}

export const spriteMaps: SpriteMap[] =
[
    { spriteGroupSize: '16x16', tilesWide: 2, tilesHigh: 2 },
    { spriteGroupSize: '16x16 2', tilesWide: 2, tilesHigh: 2 },
    { spriteGroupSize: '24x16', tilesWide: 3, tilesHigh: 2 },
    { spriteGroupSize: '32x16', tilesWide: 4, tilesHigh: 2 },
    { spriteGroupSize: '48x16', tilesWide: 6, tilesHigh: 2 },
    { spriteGroupSize: '16x24', tilesWide: 2, tilesHigh: 3 },
    { spriteGroupSize: '24x24', tilesWide: 3, tilesHigh: 3 },
    { spriteGroupSize: '16x32', tilesWide: 2, tilesHigh: 4 },
    { spriteGroupSize: '32x32', tilesWide: 4, tilesHigh: 4 },
    { spriteGroupSize: '48x32', tilesWide: 6, tilesHigh: 4 },
    { spriteGroupSize: '24x40', tilesWide: 3, tilesHigh: 5 },
    { spriteGroupSize: '16x48', tilesWide: 2, tilesHigh: 6 },
    { spriteGroupSize: '32x48', tilesWide: 4, tilesHigh: 6 },
    { spriteGroupSize: '48x48', tilesWide: 6, tilesHigh: 6 },
    { spriteGroupSize: '64x48', tilesWide: 8, tilesHigh: 6 },
    { spriteGroupSize: '64x64', tilesWide: 8, tilesHigh: 8 },
    { spriteGroupSize: '64x80', tilesWide: 8, tilesHigh: 10 }
];

export const spriteGroupSizes: SpriteGroupSize[] =
[
    '16x16',
    '16x16 2',
    '24x16',
    '32x16',
    '48x16',
    '16x24',
    '24x24',
    '16x32',
    '32x32',
    '48x32',
    '24x40',
    '16x48',
    '32x48',
    '48x48',
    '64x48',
    '64x64',
    '64x80'
];

export type SpriteGroupKey = keyof SpriteGroup;
export const spriteGroupKeyDisplayOrder: SpriteGroupKey[] =
[
    'East/West Collision Height',
    'East/West Collision Width',
    'Length',
    'North/South Collision Height',
    'North/South Collision Width',
    'Size',
    'Palette Autodetect Override',
    'Swim Flags'
];

export function validateExtractedSpriteGroup(
    value: IncompleteSpriteGroup | Partial<SpriteGroup>, 
    throwOnError: boolean,
    valdateSpritesAndBankPath: boolean): string | undefined
{
    if (isNullishOrEmpty(value.label))
    {
        return returnMissingPropMessageOrThrow('label', throwOnError);
    }

    if (isNullish(value['Length']))
    {
        return returnMissingPropMessageOrThrow('Length', throwOnError);
    }

    if (isNullishOrEmpty(value['Swim Flags']))
    {
        return returnMissingPropMessageOrThrow('Swim Flags', throwOnError);
    }

    if (value['Length'] === 0)
    {
        return undefined;
    }

    if (isNullish(value.sprites))
    {
        return returnMissingPropMessageOrThrow('sprites', throwOnError);
    }

    if (value.sprites.length < 8)
    {
        return returnOrThrowErrorMessage(
            'Sprite group data was encountered with fewer than 8 sprites.',
            throwOnError);
    }

    if (isNullish(value['East/West Collision Height']))
    {
        return returnMissingPropMessageOrThrow('East/West Collision Height', throwOnError);
    }

    if (isNullish(value['East/West Collision Width']))
    {
        return returnMissingPropMessageOrThrow('East/West Collision Width', throwOnError);
    }

    if (isNullish(value['North/South Collision Height']))
    {
        return returnMissingPropMessageOrThrow('North/South Collision Height', throwOnError);
    }

    if (isNullish(value['North/South Collision Width']))
    {
        return returnMissingPropMessageOrThrow('North/South Collision Width', throwOnError);
    }

    if (isNullish(value['Size']))
    {
        return returnMissingPropMessageOrThrow('Size', throwOnError);
    }

    if (!spriteGroupSizes.includes(value['Size']))
    {
        return returnOrThrowErrorMessage(
            'Sprite group data was encountered with an invalid Size value.',
            throwOnError);
    }

    if (value['Swim Flags'].length < value['Length'])
    {
        return returnOrThrowErrorMessage(
            'Sprite group data was encountered with a number of swim flags less than its Length.',
            throwOnError);
    }

    if (isNullishOrEmpty(value.paletteIndex))
    {
        return returnMissingPropMessageOrThrow('paletteIndex', throwOnError);
    }

    if (value.paletteIndex === 5 && isNullish(value['Palette Autodetect Override']))
    {
        return returnOrThrowErrorMessage(
            'Sprite group data was encountered with a palette of 5 or 6 but no Palette Autodetect Override.',
            throwOnError);
    }

    if (isNullishOrEmpty(value.binaryLabel))
    {
        return returnMissingPropMessageOrThrow('binaryLabel', throwOnError);
    }

    if (isNullishOrEmpty(value.pngFilePath))
    {
        return returnMissingPropMessageOrThrow('pngFilePath', throwOnError);
    }

    if (isNullish(value.tilesWide))
    {
        return returnMissingPropMessageOrThrow('tilesWide', throwOnError);
    }

    if (isNullish(value.tilesHigh))
    {
        return returnMissingPropMessageOrThrow('tilesHigh', throwOnError);
    }

    if (!valdateSpritesAndBankPath)
    {
        return undefined;
    }

    if (isNullishOrEmpty(value.binaryBankPath))
    {
        return returnMissingPropMessageOrThrow('binaryBankPath', throwOnError);
    }

    for (const sprite of value.sprites ?? [])
    {
        validateExtractedSprite(sprite, throwOnError, true);
    }

    return undefined;
}

function returnMissingPropMessageOrThrow(propertyName: SpriteGroupKey, throwError: boolean): string
{
    return returnOrThrowErrorMessage(
        `Sprite group data without a(n) "${toTitleCase(propertyName)}" value was encountered.`,
        throwError);
}