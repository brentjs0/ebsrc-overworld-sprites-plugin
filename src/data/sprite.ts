import { isNullish, isNullishOrEmpty } from '../utility';

type BaseSprite =
{
    'Binary Label': string;
    'Flip Graphics Horizontally': boolean;
    'Float When On Water': boolean;
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
    export function validate(value: Partial<Sprite>): string | undefined
    {
        const errorMessage = IncompleteSprite.validate(value);
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
    export const displayOrder: Key[] =
    [
        'Binary File Path',
        'Binary Label',
        'Flip Graphics Horizontally',
        'Float When On Water'
    ];
}


export type IncompleteSprite = BaseSprite &
{
    'Binary File Path'?: string;
}

export namespace IncompleteSprite
{
    export function validate(value: Partial<Sprite>): string | undefined
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
}