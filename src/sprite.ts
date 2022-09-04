
export type Sprite = {
    binaryGraphicsFilePath: string;
    binaryGraphicsDataLabel: string;
    flipGraphicsHorizontally: boolean;
    floatsWhenOnWater: boolean;
}

export type SpriteKey = keyof Sprite;
export const spriteKeyDisplayOrder: SpriteKey[] = [
    'binaryGraphicsFilePath',
    'binaryGraphicsDataLabel',
    'flipGraphicsHorizontally',
    'floatsWhenOnWater'
];