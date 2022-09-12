import { isNullish, isNullishOrEmpty } from '../utility';

type BaseSprite =
{
    'Binary Label': string;
    'Swim Flag': boolean;

    'Flip Graphics Horizontally': boolean;
}

function getMissingSpritePropertyErrorMessage(propertyName: Sprite.Key)
{
    return `Sprite data without a(n) "${propertyName}" value was encountered.`
}

export type Sprite = BaseSprite &
{
    'Binary File Path': string;
}

export namespace Sprite
{
    export function validateForExtract(value: Partial<Sprite>): string | undefined
    {
        const errorMessage = IncompleteSprite.validateForExtract(value);
        if (errorMessage) {
            return errorMessage;
        }
        
        if (isNullishOrEmpty(value?.['Binary File Path']))
        {
            getMissingSpritePropertyErrorMessage('Binary File Path');
        }

        return undefined;
    }

    export type Key = keyof Sprite;
    export const keyDisplayOrder: Key[] =
    [
        'Binary File Path',
        'Binary Label',
        'Flip Graphics Horizontally',
        'Swim Flag'
    ];
}


export type IncompleteSprite = BaseSprite &
{
    'Binary File Path'?: string;
}

export namespace IncompleteSprite
{
    export function validateForExtract(value: Partial<Sprite>): string | undefined
    {
        if (isNullishOrEmpty(value?.['Binary Label']))
        {
            return getMissingSpritePropertyErrorMessage('Binary Label');
        }

        if (isNullish(value?.['Flip Graphics Horizontally']))
        {
            return getMissingSpritePropertyErrorMessage('Flip Graphics Horizontally');
        }

        if (isNullish(value?.['Swim Flag']))
        {
            return getMissingSpritePropertyErrorMessage('Swim Flag');
        }

        return undefined;
    }
}