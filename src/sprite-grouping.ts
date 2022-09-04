import { Sprite } from './sprite';

export type SpriteGrouping = {
    spriteGroupingDataLabel: string;
    binaryGraphicsDataBankPath: string;
    binaryGraphicsDataLabel: string;
    pngFilePath: string;
    tilesHigh: number;
    tilesWide: number;
    palette: number;
    sprites: Sprite[];
    bitOffsets12To15: number;
    bitOffsets16To23: number;
    bitOffset31: number;
    bitOffsets24To27: number;
    bitOffsets32To39: number;
    bitOffsets40To47: number;
    bitOffsets48To55: number;
    bitOffsets56To63: number;
}

export type SpriteGroupingKey = keyof SpriteGrouping;
export const spriteGroupingKeyDisplayOrder: SpriteGroupingKey[] = [
    'spriteGroupingDataLabel',
    'binaryGraphicsDataBankPath',
    'binaryGraphicsDataLabel',
    'pngFilePath',
    'tilesHigh',
    'tilesWide',
    'palette',
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

export type IncompleteSpriteGrouping = Partial<SpriteGrouping & { sprites: Partial<Sprite>[] }>;