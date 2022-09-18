import { Buffer } from 'node:buffer';

import { filePaths, PluginApi } from '.';
import
{
    CA65Datum,
    CA65Line,
    countCA65DatumBytes,
    DatumTypeString,
    getArgumentListFromPseudoFunctionCall,
    getTextFromCA65StringLiteral,
    isCA65StringLiteral,
    parseCA65Number,
    readCA65LineData,
    readCA65Lines,
} from './ca65';
import { CA65BlockError } from './ca65-error';
import { Color15 } from './data/color';
import { IncompleteSprite, Sprite } from './data/sprite';
import { IncompleteSpriteGroup, SpriteGroup } from './data/sprite-group';
import { IncompleteSpriteGroupPalette, SpriteGroupPalette } from './data/sprite-group-palette';
import { IndexedPng } from './indexed-png';
import
{
    dumpArrayAsYAMLWithNumericKeys,
    isNullishOrEmpty,
    removePrefix,
    stringEqualsIgnoreCase,
    toTitleCase,
} from './utility';

export async function extractSpriteGroupingPointers(api: PluginApi): Promise<string[]>
{
    const spriteGroupingPointersFileContents: string = await api.getSourceText(filePaths.spriteGroupingPointersASM);

    let lineReader: Generator<CA65Line> = readCA65Lines(spriteGroupingPointersFileContents, 'SPRITE_GROUPING_PTR_TABLE');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUPING_PTR_TABLE could not be found in the source file ${filePaths.spriteGroupingPointersASM}.`);
    }

    const spriteGroupingDataLabels: string[] = [];
    for (const line of lineReader)
    {
        if (line.instruction !== undefined && line.operandList && stringEqualsIgnoreCase(line.instruction, '.DWORD'))
        {
            spriteGroupingDataLabels.push(line.operandList);
        }
    }

    return spriteGroupingDataLabels;
}

export async function extractSpriteGroupingData(api: PluginApi, spriteGroupingDataLabels: string[]): Promise<IncompleteSpriteGroup[]>
{
    const spriteGroupingDataFileContents: string = await api.getSourceText(filePaths.spriteGroupingDataASM);

    let lineReader: Generator<CA65Line> = readCA65Lines(spriteGroupingDataFileContents, 'SPRITE_GROUPING_DATA');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUPING_DATA could not be found in the source file ${filePaths.spriteGroupingDataASM}.`);
    }

    const incompleteSpriteGroups: IncompleteSpriteGroup[] = [];
    let currentSpriteGroupingPointerTableIndex: number | undefined = undefined;
    let linesInCurrentSpriteGroup: CA65Line[] = [];

    for (const line of lineReader)
    {
        if (!line.isSignificantToAssembler)
        {
            continue;
        }
        
        if (line.label !== undefined)
        {
            // Check if we've arrived at the address for a block of sprite group data.
            const spriteGroupingPointerTableIndex: number = spriteGroupingDataLabels.indexOf(line.label);
            if (spriteGroupingPointerTableIndex !== -1)
            {
                // If this is the first block we've found, make it the current grouping being processed.
                if (currentSpriteGroupingPointerTableIndex === undefined)
                {
                    currentSpriteGroupingPointerTableIndex = spriteGroupingPointerTableIndex;
                }

                // If we've arrived at the next block, extract the data from the current lines and set up for the block that starts on this line.
                if (linesInCurrentSpriteGroup.length > 0)
                {
                    incompleteSpriteGroups.push(parseSpriteGroupingData(linesInCurrentSpriteGroup, currentSpriteGroupingPointerTableIndex));

                    currentSpriteGroupingPointerTableIndex = spriteGroupingPointerTableIndex;
                    linesInCurrentSpriteGroup = [];
                }
            }
        }

        linesInCurrentSpriteGroup.push(line);
    }

    if (currentSpriteGroupingPointerTableIndex !== undefined &&
        linesInCurrentSpriteGroup.length > 0 &&
        !incompleteSpriteGroups.some(sg =>
            sg['Label'] !== undefined &&
            currentSpriteGroupingPointerTableIndex !== undefined &&
            sg['Label'] === spriteGroupingDataLabels[currentSpriteGroupingPointerTableIndex]))
    {

        incompleteSpriteGroups.push(parseSpriteGroupingData(linesInCurrentSpriteGroup, spriteGroupingDataLabels.length - 1));
    }

    return incompleteSpriteGroups;
}

function validateSpriteGroupingData(lines: CA65Line[], data: CA65Datum[], byteCount: number)
{
    if (byteCount !== 0 && (byteCount < 25 || byteCount > 41))
    {
        throw new CA65BlockError(
            'A block of sprite group data with an unexpected number of bytes was encountered.',
            filePaths.spriteGroupingDataASM,
            lines);
    }

    if (byteCount <= 0)
    {
        return;
    }

    for (let i = 0; i <= 7; ++i)
    {
        assertIsDatumType(lines, data[i], 'byte');
        assertDatumIsNumeric(lines, data[i]);
    }

    assertLineContainsInstruction(lines, data[8].line, 'SPRITES');

    if (byteCount <= 25)
    {
        return;
    }

    assertLineContainsInstruction(lines, data[17].line, 'SPRITES2');
}

function parseSpriteGroupingData(lines: CA65Line[], spriteGroupingPointerTableIndex: number): IncompleteSpriteGroup
{
    const group: Partial<IncompleteSpriteGroup> = {};

    const data: CA65Datum[] = lines.flatMap(l => readCA65LineData(l));
    const byteCount: number = countCA65DatumBytes(data);
    validateSpriteGroupingData(lines, data, byteCount);

    group['Label'] = lines[0].label;
    

    if (byteCount <= 0)
    {
        return castToIncompleteSpriteGroup(group, filePaths.spriteGroupingDataASM, lines);
    }

    group['Tiles High'] = data[0].numericValue; // Bit offsets 00 to 07.
    group['Tiles Wide'] = data[1].numericValue >>> 4; // Bit offsets 08 to 11.
    group['Size'] = `${group['Tiles Wide'] * 8}x${group['Tiles High'] * 8}`;

    group['Offset 12 to 15'] = data[1].numericValue & 0b00001111; // This is always 0b0000.
    group['Offset 16 to 23'] = data[2].numericValue;
    group['Offset 24 to 27'] = (data[3].numericValue & 0b11110000) >>> 4; // This is always 0b0001.
    group['Original Palette'] = (data[3].numericValue & 0b00001110) >>> 1; // Bit offsets 28 to 30.
    group['Offset 31'] = data[3].numericValue >>> 7; // This is always 0b0.
    group['North/South Collision Width'] = data[4].numericValue;
    group['North/South Collision Height'] = data[5].numericValue;
    group['East/West Collision Width'] = data[6].numericValue;
    group['East/West Collision Height'] = data[7].numericValue;
    group['Binary Label'] = getArgumentListFromPseudoFunctionCall(data[8].sourceExpressionText); // Bit offsets 64 to 71.

    group['PNG File Path'] = getPngFilePath(spriteGroupingPointerTableIndex, group['Binary Label'], lines[0].comment);

    group['Sprites'] = []; // Bit offsets 72 and greater.
    for (const datum of data.slice(9))
    {
        group['Sprites'].push(parseSpriteData(lines, datum));
    }

    group['Length'] = group['Sprites'].length;

    return castToIncompleteSpriteGroup(group, filePaths.spriteGroupingDataASM, lines);
}

function getPngFilePath(spriteGroupingPointerTableIndex: number, binaryLabel: string, spriteGroupingLabelComment: string | undefined)
{
    let pngFileName = spriteGroupingPointerTableIndex.toString().padStart(3, '0');
    if (!isNullishOrEmpty(binaryLabel))
    {
        const labelSegment = removePrefix(binaryLabel, 'SPRITE_GROUP_');
        if (labelSegment.length > 0)
        {
            pngFileName += ` ${toTitleCase(labelSegment)}`;
        }
    }

    if (!isNullishOrEmpty(spriteGroupingLabelComment))
    {
        pngFileName += ` (${toTitleCase(spriteGroupingLabelComment)})`;
    }

    return `${filePaths.spriteGroupsDirectory}${pngFileName}.png`
}

function castToIncompleteSpriteGroup(group: Partial<IncompleteSpriteGroup>, fileName: string, lines: CA65Line[]): IncompleteSpriteGroup
{
    const errorMessage: string | undefined = IncompleteSpriteGroup.validateForExtract(group);
    if (errorMessage !== undefined)
    {
        throw new CA65BlockError(errorMessage, fileName, lines);
    }

    return group as IncompleteSpriteGroup;
}

function parseSpriteData(lines: CA65Line[], spriteDatum: CA65Datum): IncompleteSprite
{
    const operandParts: string[] = getArgumentListFromPseudoFunctionCall(spriteDatum.sourceExpressionText)
        .split('|')
        .map(p => p.trim());

    let stringValue: string | undefined = undefined;
    let numericValue: number = 0;
    for (const operandPart of operandParts)
    {
        const number: number = parseCA65Number(operandPart);
        if (!Number.isNaN(number))
        {
            numericValue |= number;
        }
        else if (stringValue === undefined)
        {
            stringValue = operandPart;
        }
        else
        {
            throw new CA65BlockError(
                'An unexpected value was encountered while parsing sprite flags and addresses for binary sprite data.',
                filePaths.spriteGroupingDataASM,
                lines,
                spriteDatum.line);
        }
    }

    const incompleteSprite: IncompleteSprite =
    {
        'Binary Label': stringValue!,
        'Flip Graphics Horizontally': (numericValue & 0b1) === 1,
        'Swim Flag': (numericValue >>> 1) === 1
    }

    return castToIncompleteSprite(incompleteSprite, filePaths.spriteGroupingDataASM, lines);

}

function castToIncompleteSprite(sprite: Partial<IncompleteSprite>, fileName: string, lines: CA65Line[]): IncompleteSprite
{
    const errorMessage: string | undefined = IncompleteSprite.validateForExtract(sprite);
    if (errorMessage !== undefined)
    {
        throw new CA65BlockError(errorMessage, fileName, lines);
    }

    return sprite as IncompleteSprite;
}

function assertIsDatumType(lines: CA65Line[], datum: CA65Datum, datumType: DatumTypeString)
{
    if (datum.type !== datumType)
    {
        throw new CA65BlockError(
            `A "${datum.type}" value was encountered where a "${datumType}" value was expected.`,
            filePaths.spriteGroupingDataASM,
            lines,
            datum.line);
    }
}

function assertDatumIsNumeric(lines: CA65Line[], datum: CA65Datum)
{
    if (Number.isNaN(datum.numericValue))
    {
        throw new CA65BlockError(
            `A non-numeric expression was encountered where a numeric expression was expected.`,
            filePaths.spriteGroupingDataASM,
            lines,
            datum.line);
    }
}

function assertLineContainsInstruction(lines: CA65Line[], line: CA65Line, instruction: string)
{
    if (line?.instruction === undefined)
    {
        throw new CA65BlockError(
            `No instruction was present where a "${instruction}" instruction was expected.`,
            filePaths.spriteGroupingDataASM,
            lines,
            line);
    }

    if ((line.instruction.startsWith('.') && !stringEqualsIgnoreCase(line.instruction, instruction)) ||
        line.instruction !== instruction)
    {
            throw new CA65BlockError(
                `The instruction "${line.instruction}" was present where a "${instruction}" instruction was expected.`,
                filePaths.spriteGroupingDataASM,
                lines,
                line);
    }
}

export async function extractBanks11to15(api: PluginApi, incompleteSpriteGroups: IncompleteSpriteGroup[]): Promise<SpriteGroup[]>
{
    const binaryBankPaths =
    [
        filePaths.bank11ASM,
        filePaths.bank12ASM,
        filePaths.bank13ASM,
        filePaths.bank14ASM,
        filePaths.bank15ASM
    ];

    for (const binaryBankPath of binaryBankPaths)
    {
        const labelsInBank: string[] = [];
        const binaryPathsByLabel: { [index: string]: string } = {};

        const bankFileContents: string = await api.getSourceText(binaryBankPath);
        const lineReader: Generator<CA65Line> = readCA65Lines(bankFileContents);

        let lines: CA65Line[] = [];
        let labelsForAddress: string[] = [];
        
        for (const line of lineReader)
        {
            if (!line.isSignificantToAssembler)
            {
                continue;
            }

            if (line.label !== undefined)
            {
                labelsInBank.push(line.label);
                labelsForAddress.push(line.label);
            }

            if (line.instruction === 'BINARY')
            {
                if (!isCA65StringLiteral(line.operandList))
                {
                    throw new CA65BlockError(
                        'A BINARY macro call was found with an invalid file path operand.',
                        binaryBankPath,
                        lines,
                        line);
                }
                const binaryPath = `src/bin/US/${getTextFromCA65StringLiteral(line.operandList)}`;
                for (const label of labelsForAddress)
                {
                    binaryPathsByLabel[label] = binaryPath;
                }

                labelsForAddress = [];
                lines = [];
            }
        }

        for (const spriteGroup of incompleteSpriteGroups)
        {
            if (labelsInBank.includes(spriteGroup['Binary Label']))
            {
                spriteGroup['Binary Bank Path'] = binaryBankPath;

                for (const sprite of spriteGroup['Sprites'] ?? [])
                {
                    sprite['Binary File Path'] = binaryPathsByLabel[sprite['Binary Label']];
                }
            }
        }
    }

    for (const spriteGroup of incompleteSpriteGroups)
    {
        const spriteGroupErrorMessage: string | undefined = SpriteGroup.validateForExtract(spriteGroup);
        if (spriteGroupErrorMessage !== undefined)
        {
            throw new Error(spriteGroupErrorMessage);
        }
    }

    api.writeReference(filePaths.spriteGroupsYML, dumpArrayAsYAMLWithNumericKeys(incompleteSpriteGroups, { sortKeys: sortSpriteGroupKeys, replacer: replaceSpriteGroupValues }));

    return incompleteSpriteGroups as SpriteGroup[];
}

function sortSpriteGroupKeys(key1: any, key2: any): number
{
    if (typeof key1 !== 'string' || typeof key2 !== 'string')
    {
        return 0;
    }

    const keyOrderLists =
    [
        SpriteGroup.keyDisplayOrder as string[],
        Sprite.keyDisplayOrder as string[],
    ];

    for (const keyOrderList of keyOrderLists)
    {
        if (keyOrderList.includes(key1) && keyOrderList.includes(key2))
        {
            return keyOrderList.indexOf(key1) - keyOrderList.indexOf(key2) ;
        }
    }

    return 0;
}

function replaceSpriteGroupValues(key: any, value: any): any
{
    if (key === 'Tiles Wide' || key === 'Tiles High')
    {
        return undefined
    }

    return value;
}

export async function extractBank03(api: PluginApi): Promise<IncompleteSpriteGroupPalette[]>
{
    const bank03FileContents: string = await api.getSourceText(filePaths.bank03ASM);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank03FileContents, 'SPRITE_GROUP_PALETTES');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUP_PALETTES could not be found in the source file ${filePaths.bank03ASM}.`);
    }
    const lines: CA65Line[] = [];
    const spriteGroupPalettes: IncompleteSpriteGroupPalette[] = [];

    for (const line of lineReader)
    {
        lines.push(line);

        if (!line.isSignificantToAssembler)
        {
            continue;
        }
        if (line.instruction !== undefined)
        {
            if (line.instruction === 'BINARY')
            {
                if (!isCA65StringLiteral(line.operandList))
                {
                    throw new CA65BlockError(
                        'A BINARY macro call was found with an invalid file path operand.',
                        filePaths.bank11ASM,
                        lines,
                        line);
                }
                else
                {
                    const operandStringValue = getTextFromCA65StringLiteral(line.operandList);

                    spriteGroupPalettes.push(
                    {
                        'Binary File Path': `src/bin/US/${operandStringValue}`,
                    })
                }
            }
            else
            {
                break;
            }
        }
    }

    return spriteGroupPalettes;
}

export async function extractPaletteBinaries(api: PluginApi, incompletePalettes: IncompleteSpriteGroupPalette[])
{
    const pngWidth = 18;
    const pngHeight = 17;
    const lastPaletteIndex = incompletePalettes.length * 16;

    let pngPaletteIndex = 0;

    const indexedPng: IndexedPng = IndexedPng.create(pngWidth, pngHeight);
    indexedPng.setPaletteColor(lastPaletteIndex, Color15.create(15, 15, 15));
    indexedPng.fillWithIndex(lastPaletteIndex);

    for (let paletteNumber = 0; paletteNumber < incompletePalettes.length; ++paletteNumber)
    {
        const spriteGroupPalette = incompletePalettes[paletteNumber];
        spriteGroupPalette.Palette = [];

        const buffer: Buffer = await api.getSourceBin(spriteGroupPalette['Binary File Path']);

        const y = (paletteNumber * 2) + 1;
        let x = 1;

        for (let bufferOffset = 0; bufferOffset < buffer.length; bufferOffset += 2)
        {
            const word = buffer.readUInt16LE(bufferOffset);
            const blue5 = word >>> 10;
            const green5 = (word & 0b0000_0011_1110_0000) >>> 5;
            const red5 = word & 0b0000_0000_0001_1111;

            const color15 = Color15.create(red5, green5, blue5);
            spriteGroupPalette.Palette.push(color15);

            indexedPng.setPaletteColor(pngPaletteIndex, color15);
            indexedPng.setPixelIndex(x, y, pngPaletteIndex);

            pngPaletteIndex++;
            x++;
        }
    }

    api.writeReference(filePaths.spriteGroupPalettesPNG, await indexedPng.toBuffer());
    api.writeReference(filePaths.spriteGroupPalettesYML, dumpArrayAsYAMLWithNumericKeys(incompletePalettes, { replacer: replaceSpriteGroupPaletteValues }));

    return incompletePalettes as SpriteGroupPalette[];
}

function replaceSpriteGroupPaletteValues(key: any, value: any): any
{
    if (Array.isArray(value) && Color15.isColor15(value[0]))
    {
        return undefined
    }

    return value;
}

const bytesPerTile = 32;
const rowsPerTile = 8;
const pixelsPerRow = 8;
const bitsPerPixel = 4;
const spritesPerRow = 4;

export async function extractSpriteGroupBinaries(api: PluginApi, spriteGroups: SpriteGroup[], spriteGroupPalettes: SpriteGroupPalette[])
{
    for (const spriteGroup of spriteGroups)
    {
        if (spriteGroup['Length'] === undefined || spriteGroup['Length'] === 0)
        {
            continue;
        }

        const spriteWidth = spriteGroup['Tiles Wide'] * pixelsPerRow;
        const spriteHeight = spriteGroup['Tiles High'] * rowsPerTile;
        const spriteRowCount = Math.ceil(spriteGroup['Length'] / spritesPerRow);

        const palette: Color15[] = spriteGroupPalettes[spriteGroup['Original Palette']]['Palette'];
        const indexedPng = IndexedPng.create(spriteWidth * spritesPerRow, spriteHeight * spriteRowCount, palette);
        indexedPng.fillWithIndex(0);

        let spriteOffsetX = 0;
        let spriteOffsetY = 0;

        if (spriteGroup['Sprites'] !== undefined)
        {
            let tileOffsetX = 0;
            let tileOffsetY = 0;

            for (let spriteIndex = 0; spriteIndex < spriteGroup['Sprites']?.length ?? 0; ++spriteIndex)
            {
                const sprite = spriteGroup['Sprites'][spriteIndex];

                spriteOffsetX = (spriteIndex % spritesPerRow) * spriteWidth;
                spriteOffsetY = Math.floor(spriteIndex / spritesPerRow) * spriteHeight;

                let tileIndex = 0;
                for await (const tile of extractTiles(api, sprite))
                {
                    [tileOffsetX, tileOffsetY] = calculateTileOffsets(
                        tileIndex,
                        spriteGroup['Tiles Wide'],
                        sprite['Flip Graphics Horizontally'])

                    for (let pixelY = 0; pixelY < tile.length; ++pixelY)
                    {
                        const tileRow: number[] = tile[pixelY];
                        for (let pixelX = 0; pixelX < tileRow.length; ++pixelX)
                        {
                            indexedPng.setPixelIndex(
                                spriteOffsetX + tileOffsetX + pixelX,
                                spriteOffsetY + tileOffsetY + pixelY,
                                getColorIndex(tileRow, pixelX, sprite['Flip Graphics Horizontally']));
                        }
                    }

                    tileIndex++;
                }
            }
        }

        api.writeReference(spriteGroup['PNG File Path'], await indexedPng.toBuffer());
    }
}

function calculateTileOffsets(tileIndex: number, tilesWide: number, flipHorizontally: boolean): [number, number]
{
    const tileOffsetX = flipHorizontally
        ? (tilesWide - (tileIndex % tilesWide) - 1) * pixelsPerRow
        : (tileIndex % tilesWide) * pixelsPerRow;

    const tileOffsetY = Math.floor(tileIndex / tilesWide) * rowsPerTile;

    return [tileOffsetX, tileOffsetY];
}

function getColorIndex(tileRow: number[], pixelX: number, flipHorizontally: boolean): number
{
    return flipHorizontally
        ? tileRow[tileRow.length - pixelX - 1]
        : tileRow[pixelX];
}

async function* extractTiles(api: PluginApi, sprite: Sprite): AsyncGenerator<number[][]>
{
    const buffer: Buffer = await api.getSourceBin(sprite['Binary File Path']);
    let currentTile: number[][] = createNewTile();

    for (let byteIndex = 0; byteIndex < buffer.length; byteIndex++)
    {
        const byte = buffer.readUint8(byteIndex);

        // For each byte, the row encoded follows the pattern
        // 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7,
        // 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7
        const rowIndex = Math.floor(byteIndex / 2) % rowsPerTile; 
        const row: number[] = currentTile[rowIndex];

        // For each byte, the bit encoded follows the pattern
        // 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
        // 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3
        const bitIndex = ((Math.floor(byteIndex / 16) * 2) % bitsPerPixel) + (byteIndex % 2);

        for (let pixelIndex = 0; pixelIndex < pixelsPerRow; ++pixelIndex)
        {
            const sourceBitMask = 0b1000_0000 >>> pixelIndex;

            // Isolate the source bit value for this pixel from the current byte
            // and shift it into the ones place.
            const bitValue = (byte & sourceBitMask) / sourceBitMask;

            // Shift the isolated bit value into the destination position and 
            // combine it with the value accumulated for that pixel so far.
            row[pixelIndex] = row[pixelIndex] | (bitValue << bitIndex);
        }

        if ((byteIndex + 1) % bytesPerTile === 0)
        {
            yield currentTile;
            currentTile = createNewTile();
        }
    }
}

function createNewTile(): number[][]
{
    const tile =
    [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];

    return tile;
}