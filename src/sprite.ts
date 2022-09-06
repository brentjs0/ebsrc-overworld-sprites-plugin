import { isNullish, isNullishOrEmpty,  } from './utility';

type BaseSprite = {
    binaryLabel: string;
    flipGraphicsHorizontally: boolean;
    floatsWhenOnWater: boolean;
}

export type Sprite = BaseSprite & {
    binaryFilePath: string;
}

export type IncompleteSprite = BaseSprite & {
    binaryFilePath?: string;
}

export function validateIncompleteSprite(value: Partial<Sprite>): string | undefined {
    if (isNullishOrEmpty(value?.binaryLabel)) {
        return getMissingSpritePropertyErrorMessage('binaryLabel');
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
    
    if (isNullishOrEmpty(value?.binaryFilePath)) {
        getMissingSpritePropertyErrorMessage('binaryFilePath');
    }

    return undefined;
}

function getMissingSpritePropertyErrorMessage(propertyName: SpriteKey) {
    return `Sprite data without a "${propertyName}" value was encountered.`
}

export type SpriteKey = keyof Sprite;
export const spriteKeyDisplayOrder: SpriteKey[] = [
    'binaryFilePath',
    'binaryLabel',
    'flipGraphicsHorizontally',
    'floatsWhenOnWater'
];