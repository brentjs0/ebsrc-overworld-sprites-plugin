import { isNullish, isNullishOrEmpty,  } from './utility';

type BaseSprite =
{
    'Binary Label': string;
    'Flip Graphics Horizontally': boolean;
    'Float When On Water': boolean;
}

export type Sprite = BaseSprite &
{
    'Binary File Path': string;
}

export type IncompleteSprite = BaseSprite &
{
    'Binary File Path'?: string;
}

export function validateIncompleteSprite(value: Partial<Sprite>): string | undefined
{
    if (isNullishOrEmpty(value?.['Binary Label']))
    {
        return getMissingSpritePropertyErrorMessage('Binary Label');
    }

    if (isNullish(value?.['Flip Graphics Horizontally']))
    {
        return getMissingSpritePropertyErrorMessage('Flip Graphics Horizontally');
    }

    if (isNullish(value?.['Float When On Water']))
    {
        return getMissingSpritePropertyErrorMessage('Float When On Water');
    }

    return undefined;
}

export function validateSprite(value: Partial<Sprite>): string | undefined
{
    const errorMessage = validateIncompleteSprite(value);
    if (errorMessage) {
        return errorMessage;
    }
    
    if (isNullishOrEmpty(value?.['Binary File Path']))
    {
        getMissingSpritePropertyErrorMessage('Binary File Path');
    }

    return undefined;
}

function getMissingSpritePropertyErrorMessage(propertyName: SpriteKey)
{
    return `Sprite data without a(n) "${propertyName}" value was encountered.`
}

export type SpriteKey = keyof Sprite;
export const spriteKeyDisplayOrder: SpriteKey[] =
[
    'Binary File Path',
    'Binary Label',
    'Flip Graphics Horizontally',
    'Float When On Water'
];