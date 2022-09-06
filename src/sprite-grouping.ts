import { IncompleteSprite, Sprite, validateSprite } from './sprite';
import { isNullish, isNullishOrEmpty } from './utility';

type BaseSpriteGrouping = {
    label: string;
    binaryBankPath?: string;
    binaryLabel?: string;
    pngFilePath?: string;
    tilesHigh?: number;
    tilesWide?: number;
    paletteNumber?: number;
    bitOffsets12To15?: number;
    bitOffsets16To23?: number;
    bitOffset31?: number;
    bitOffsets24To27?: number;
    bitOffsets32To39?: number;
    bitOffsets40To47?: number;
    bitOffsets48To55?: number;
    bitOffsets56To63?: number;
}

export type SpriteGrouping = BaseSpriteGrouping & {
    sprites?: Sprite[];
}

export type SpriteGroupingKey = keyof SpriteGrouping;
export const spriteGroupingKeyDisplayOrder: SpriteGroupingKey[] = [
    'label',
    'binaryBankPath',
    'binaryLabel',
    'pngFilePath',
    'tilesHigh',
    'tilesWide',
    'paletteNumber',
    'sprites',
    'bitOffsets12To15',
    'bitOffsets16To23',
    'bitOffsets24To27',
    'bitOffset31',
    'bitOffsets32To39',
    'bitOffsets40To47',
    'bitOffsets48To55',
    'bitOffsets56To63'
];

export function validateSpriteGrouping(value: IncompleteSpriteGrouping | Partial<SpriteGrouping>): string | undefined {
    const errorMessage = validateIncompleteSpriteGrouping(value);
    if (errorMessage !== undefined) {
        return errorMessage;
    }

    for (const sprite of value.sprites ?? []) {
        const spriteErrorMessage: string | undefined = validateSprite(sprite);
        if (spriteErrorMessage !== undefined) {
            return spriteErrorMessage;
        }
    }

    return undefined;
}

export type IncompleteSpriteGrouping = BaseSpriteGrouping & {
    sprites?: IncompleteSprite[];
}

export function validateIncompleteSpriteGrouping(value: Partial<IncompleteSpriteGrouping>): string | undefined {
    if (isNullishOrEmpty(value?.label)) {
        return getMissingSpriteGroupingPropertyErrorMessage('label');
    }

    if (isNullish(value?.sprites)) {
        return undefined;
    }

    if (isNullishOrEmpty(value?.binaryBankPath)) {
        return getMissingSpriteGroupingPropertyErrorMessage('binaryBankPath');
    }

    if (isNullishOrEmpty(value?.binaryLabel)) {
        return getMissingSpriteGroupingPropertyErrorMessage('binaryLabel');
    }

    if (isNullishOrEmpty(value?.pngFilePath)) {
        return getMissingSpriteGroupingPropertyErrorMessage('pngFilePath');
    }

    if (isNullish(value?.tilesHigh)) {
        return getMissingSpriteGroupingPropertyErrorMessage('tilesHigh');
    }

    if (isNullish(value?.tilesWide)) {
        return getMissingSpriteGroupingPropertyErrorMessage('tilesWide');
    }

    if (isNullish(value?.paletteNumber)) {
        return getMissingSpriteGroupingPropertyErrorMessage('paletteNumber');
    }

    if (value.sprites.length < 8) {
        return 'Sprite grouping data was encountered with fewer than 8 sprites.';
    }

    if (isNullish(value?.bitOffsets12To15)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets12To15');
    }

    if (isNullish(value?.bitOffsets16To23)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets16To23');
    }

    if (isNullish(value?.bitOffsets24To27)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets24To27');
    }

    if (isNullish(value?.bitOffset31)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffset31');
    }

    if (isNullish(value?.bitOffsets32To39)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets32To39');
    }

    if (isNullish(value?.bitOffsets40To47)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets40To47');
    }

    if (isNullish(value?.bitOffsets48To55)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets48To55');
    }

    if (isNullish(value?.bitOffsets56To63)) {
        return getMissingSpriteGroupingPropertyErrorMessage('bitOffsets56To63');
    }

    return undefined;
}

function getMissingSpriteGroupingPropertyErrorMessage(propertyName: SpriteGroupingKey) {
    return `Sprite grouping data without a "${propertyName}" value was encountered.`
}