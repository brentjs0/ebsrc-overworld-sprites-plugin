import { IncompleteSprite, Sprite, validateSprite } from './sprite';
import { isNullish, isNullishOrEmpty } from './utility';

type BaseSpriteGroup =
{
    'Label': string;
    'East/West Collision Height'?: number;
    'East/West Collision Width'?: number;
    'North/South Collision Height'?: number;
    'North/South Collision Width'?: number;
    'Size'?: string;
    'Binary Bank Path'?: string;
    'Binary Label'?: string;
    'PNG File Path'?: string;
    'Palette'?: number;
    'Offset 12 to 15'?: number;
    'Offset 16 to 23'?: number;
    'Offset 24 to 27'?: number;
    'Offset 31'?: number;
}

export type SpriteGroup = BaseSpriteGroup &
{
    'Sprites'?: Sprite[];
}

export type SpriteGroupKey = keyof SpriteGroup;
export const spriteGroupKeyDisplayOrder: SpriteGroupKey[] =
[
    'Label',
    'East/West Collision Height',
    'East/West Collision Width',
    'North/South Collision Height',
    'North/South Collision Width',
    'Size',
    'Binary Bank Path',
    'Binary Label',
    'PNG File Path',
    'Palette',
    'Sprites',
    'Offset 12 to 15',
    'Offset 16 to 23',
    'Offset 24 to 27',
    'Offset 31'
];

export function validateSpriteGroup(value: IncompleteSpriteGroup | Partial<SpriteGroup>): string | undefined
{
    const errorMessage = validateIncompleteSpriteGroup(value);
    if (errorMessage !== undefined)
    {
        return errorMessage;
    }

    for (const sprite of value['Sprites'] ?? [])
    {
        const spriteErrorMessage: string | undefined = validateSprite(sprite);
        if (spriteErrorMessage !== undefined)
        {
            return spriteErrorMessage;
        }
    }

    return undefined;
}

export type IncompleteSpriteGroup = BaseSpriteGroup &
{
    'Sprites'?: IncompleteSprite[];
}

export function validateIncompleteSpriteGroup(value: Partial<IncompleteSpriteGroup>): string | undefined
{
    if (isNullishOrEmpty(value?.['Label']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Label');
    }

    if (isNullish(value?.['Sprites']))
    {
        return undefined;
    }

    if (isNullishOrEmpty(value?.['Binary Bank Path']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Binary Bank Path');
    }

    if (isNullishOrEmpty(value?.['Binary Label'])) 
    {
        return getMissingSpriteGroupPropertyErrorMessage('Binary Label');
    }

    if (isNullishOrEmpty(value?.['PNG File Path']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('PNG File Path');
    }

    if (isNullishOrEmpty(value?.['Size']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Size');
    }

    if (isNullish(value?.['Palette']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Palette');
    }

    if (value['Sprites'].length < 8)
    {
        return 'Sprite group data was encountered with fewer than 8 sprites.';
    }

    if (isNullish(value?.['Offset 12 to 15']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Offset 12 to 15');
    }

    if (isNullish(value?.['Offset 16 to 23']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Offset 16 to 23');
    }

    if (isNullish(value?.['Offset 24 to 27']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Offset 24 to 27');
    }

    if (isNullish(value?.['Offset 31']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('Offset 31');
    }

    if (isNullish(value?.['North/South Collision Width']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('North/South Collision Width');
    }

    if (isNullish(value?.['North/South Collision Height']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('North/South Collision Height');
    }

    if (isNullish(value?.['East/West Collision Width']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('East/West Collision Width');
    }

    if (isNullish(value?.['East/West Collision Height']))
    {
        return getMissingSpriteGroupPropertyErrorMessage('East/West Collision Height');
    }

    return undefined;
}

function getMissingSpriteGroupPropertyErrorMessage(propertyName: SpriteGroupKey)
{
    return `Sprite group data without a(n) "${propertyName}" value was encountered.`
}