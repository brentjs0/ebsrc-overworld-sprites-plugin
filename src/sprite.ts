import { isNullish, isNullishOrEmpty,  } from './utility';

type BaseSprite = {
    binaryGraphicsDataLabel: string;
    flipGraphicsHorizontally: boolean;
    floatsWhenOnWater: boolean;
}

export type Sprite = BaseSprite & {
    binaryGraphicsFilePath: string;
}

export type IncompleteSprite = BaseSprite & {
    binaryGraphicsFilePath?: string;
}

export function validateIncompleteSprite(value: Partial<Sprite>): string | undefined {
    if (isNullishOrEmpty(value?.binaryGraphicsDataLabel)) {
        return getMissingSpritePropertyErrorMessage('binaryGraphicsDataLabel');
    }

    if (isNullish(value?.flipGraphicsHorizontally)) {
        return getMissingSpritePropertyErrorMessage('flipGraphicsHorizontally');
    }

    if (isNullish(value?.floatsWhenOnWater)) {
        return getMissingSpritePropertyErrorMessage('floatsWhenOnWater');
    }

    return undefined;
}

export function validateSprite(value: Partial<Sprite>): string | undefined {
    const errorMessage = validateIncompleteSprite(value);
    if (errorMessage) {
        return errorMessage;
    }
    
    if (isNullishOrEmpty(value?.binaryGraphicsFilePath)) {
        getMissingSpritePropertyErrorMessage('binaryGraphicsFilePath');
    }

    return undefined;
}

function getMissingSpritePropertyErrorMessage(propertyName: SpriteKey) {
    return `Sprite data without a "${propertyName}" value was encountered.`
}

export type SpriteKey = keyof Sprite;
export const spriteKeyDisplayOrder: SpriteKey[] = [
    'binaryGraphicsFilePath',
    'binaryGraphicsDataLabel',
    'flipGraphicsHorizontally',
    'floatsWhenOnWater'
];