import { Buffer } from 'node:buffer';

import { filePaths, spriteGroupPalettesYmlFileComment, yamlHeader } from './plugin';
import {
    CA65Datum,
    CA65Line,
    countCA65DatumBytes,
    DatumTypeString,
    getArgumentListFromPseudoFunctionCall,
    getTextFromCA65StringLiteral,
    isCA65StringLiteral,
    lineHasOperandList,
    parseCA65Number,
    readCA65LineData,
    readCA65Lines
} from './ca65';
import { CA65BlockError, CA65LineError } from './ca65-error';
import { SnesColor } from './data/snes-color';
import
{
    Sprite,
    validateExtractedSprite
} from './data/sprite';
import
{
    IncompleteSpriteGroup,
    SpriteGroup,
    spriteGroupKeyDisplayOrder,
    spriteMaps,
    validateExtractedSpriteGroup
} from './data/sprite-group';
import { SpriteGroupPalette } from './data/sprite-group-palette';
import PluginApi from './mock-plugin-api';
import { SnesImage } from './snes-image';
import
{
    dumpArrayAsYamlWithNumericKeys,
    filterToType,
    firstCharIsLowerCase,
    isNullishOrEmpty,
    removePrefix,
    stringEqualsIgnoreCase,
    toTitleCase,
    unpackErrorMessage
} from './utility';

export async function extractSpriteGroupingPointers(api: PluginApi): Promise<string[]>
{
    const spriteGroupingPointersFileContents: string = await api.getSourceText(filePaths.spriteGroupingPointersAsm);

    const lineReader: Generator<CA65Line> = readCA65Lines(spriteGroupingPointersFileContents, 'SPRITE_GROUPING_PTR_TABLE');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUPING_PTR_TABLE could not be found in the source file ${filePaths.spriteGroupingPointersAsm}.`);
    }

    const spriteGroupingDataLabels: string[] = [];
    for (const line of lineReader)
    {
        try
        {
            if (line.instruction !== undefined && line.operandList && stringEqualsIgnoreCase(line.instruction, '.DWORD'))
            {
                spriteGroupingDataLabels.push(line.operandList);
            }
        }
        catch (error: unknown)
        {
            throw new CA65LineError(
                unpackErrorMessage(error, 'An error occured while parsing sprite group pointers.'),
                filePaths.spriteGroupingPointersAsm,
                line);
        }
    }

    return spriteGroupingDataLabels;
}

export async function extractSpriteGroupingData(api: PluginApi, spriteGroupingDataLabels: string[]): Promise<IncompleteSpriteGroup[]>
{
    const spriteGroupingDataFileContents: string = await api.getSourceText(filePaths.spriteGroupingDataAsm);

    const lineReader: Generator<CA65Line> = readCA65Lines(spriteGroupingDataFileContents, 'SPRITE_GROUPING_DATA');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUPING_DATA could not be found in the source file ${filePaths.spriteGroupingDataAsm}.`);
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
            sg.label !== undefined &&
            currentSpriteGroupingPointerTableIndex !== undefined &&
            sg.label === spriteGroupingDataLabels[currentSpriteGroupingPointerTableIndex]))
    {

        incompleteSpriteGroups.push(parseSpriteGroupingData(linesInCurrentSpriteGroup, spriteGroupingDataLabels.length - 1));
    }

    return incompleteSpriteGroups;
}

function validateSpriteGroupingData(lines: CA65Line[], data: CA65Datum[], byteCount: number): void
{
    if (byteCount !== 0 && (byteCount < 25 || byteCount > 41))
    {
        throw new Error('A block of sprite group data with an unexpected number of bytes was encountered.s');
    }

    if (byteCount <= 0)
    {
        return;
    }

    for (let i = 0; i <= 7; ++i)
    {
        assertIsDatumType(data[i], 'byte');
        assertDatumIsNumeric(data[i]);
    }

    assertLineContainsInstruction(data[8].line, 'SPRITES');

    if (byteCount <= 25)
    {
        return;
    }

    assertLineContainsInstruction(data[17].line, 'SPRITES2');
}

function parseSpriteGroupingData(lines: CA65Line[], spriteGroupingPointerTableIndex: number): IncompleteSpriteGroup
{
    try
    {
        const incompleteGroup: IncompleteSpriteGroup = {};
        const data: CA65Datum[] = filterToType(lines, lineHasOperandList).flatMap(l => readCA65LineData(l));
        const byteCount: number = countCA65DatumBytes(data);
        validateSpriteGroupingData(lines, data, byteCount);

        incompleteGroup.label = lines[0].label;

        if (byteCount <= 0)
        {
            incompleteGroup['Length'] = 0;
            incompleteGroup['Swim Flags'] = [];
            validateExtractedSpriteGroup(incompleteGroup, true, false);

            return incompleteGroup;
        }

        const spriteMapIndex = data[2].numericValue;
        const spriteMap = spriteMaps[spriteMapIndex];
        incompleteGroup.tilesHigh = spriteMap.tilesHigh;
        incompleteGroup.tilesWide = spriteMap.tilesWide;
        incompleteGroup.paletteIndex = (data[3].numericValue & 0b00001110) >>> 1;
        incompleteGroup.binaryLabel = getArgumentListFromPseudoFunctionCall(data[8].sourceExpressionText);
        incompleteGroup.pngFilePath = getPngFilePath(spriteGroupingPointerTableIndex, incompleteGroup.binaryLabel, lines[0].comment);

        incompleteGroup.sprites = [];
        const swimFlags: boolean[] = [];
        for (const datum of data.slice(9))
        {
            const incompleteSprite = parseSpriteData(lines, datum);

            incompleteGroup.sprites.push(incompleteSprite);
            if (incompleteSprite.swimFlag !== undefined)
            {
                swimFlags.push(incompleteSprite.swimFlag);
            }
        }

        incompleteGroup['East/West Collision Height'] = data[7].numericValue;
        incompleteGroup['East/West Collision Width'] = data[6].numericValue;
        incompleteGroup['Length'] = incompleteGroup.sprites.length;
        incompleteGroup['North/South Collision Height'] = data[5].numericValue;
        incompleteGroup['North/South Collision Width'] = data[4].numericValue;
        incompleteGroup['Size'] = spriteMap.spriteGroupSize;
        incompleteGroup['Swim Flags'] = swimFlags;

        incompleteGroup['Palette Autodetect Override'] = incompleteGroup.paletteIndex === 5 ? 5 : undefined;

        validateExtractedSpriteGroup(incompleteGroup, true, false);

        return incompleteGroup;
    }
    catch (error: unknown)
    {
        const errorLine = error instanceof CA65LineError ? error.line : undefined;

        throw new CA65BlockError(
            unpackErrorMessage(error, 'An error occured while parsing sprite group data.'),
            filePaths.spriteGroupingDataAsm,
            lines,
            errorLine);
    }
}

function getPngFilePath(spriteGroupingPointerTableIndex: number, binaryLabel: string, spriteGroupingLabelComment: string | undefined): string
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

    return `${filePaths.spriteGroupsDirectory}${pngFileName}.png`;
}

function parseSpriteData(lines: CA65Line[], spriteDatum: CA65Datum): Partial<Sprite>
{
    try
    {
        const operandParts: string[] = getArgumentListFromPseudoFunctionCall(spriteDatum.sourceExpressionText)
            .split('|')
            .map(p => p.trim());

        let stringValue: string | undefined = undefined;
        let numericValue = 0;
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
                throw new CA65LineError(
                    'An unexpected value was encountered while parsing sprite flags and addresses for binary sprite data.',
                    filePaths.spriteGroupingDataAsm,
                    spriteDatum.line);
            }
        }

        if (stringValue === undefined)
        {
            throw new CA65LineError(
                'A SPRITES or SPRITES2 macro argument without a binary sprite graphics data label was encountered.',
                filePaths.spriteGroupingDataAsm,
                spriteDatum.line);
        }

        const incompleteSprite: Partial<Sprite> =
        {
            binaryLabel: stringValue,
            flipGraphicsHorizontally: (numericValue & 0b1) === 1,
            swimFlag: (numericValue >>> 1) === 1
        };

        validateExtractedSprite(incompleteSprite, true, false);

        return incompleteSprite;
    }
    catch (error: unknown)
    {
        const errorLine = error instanceof CA65LineError ? error.line : undefined;

        throw new CA65BlockError(
            unpackErrorMessage(error, 'An error occured while parsing sprite data.'),
            filePaths.spriteGroupingPointersAsm,
            lines,
            errorLine);
    }
}

function assertIsDatumType(datum: CA65Datum, datumType: DatumTypeString): void
{
    if (datum.type !== datumType)
    {
        throw new Error(`A "${datum.type}" value was encountered where a "${datumType}" value was expected.`);
    }
}

function assertDatumIsNumeric(datum: CA65Datum): void
{
    if (Number.isNaN(datum.numericValue))
    {
        throw new Error('A non-numeric expression was encountered where a numeric expression was expected.');
    }
}

function assertLineContainsInstruction(line: CA65Line, instruction: string): void
{
    if (line?.instruction === undefined)
    {
        throw new CA65LineError(`No instruction was present where a "${instruction}" instruction was expected.`,
            filePaths.spriteGroupingDataAsm,
            line);
    }

    if ((line.instruction.startsWith('.') && !stringEqualsIgnoreCase(line.instruction, instruction)) ||
        line.instruction !== instruction)
    {
        throw new CA65LineError(
            `The instruction "${line.instruction}" was present where a "${instruction}" instruction was expected.`,
            filePaths.spriteGroupingDataAsm,
            line);
    }
}

export async function extractBanks11to15(api: PluginApi, incompleteSpriteGroups: IncompleteSpriteGroup[]): Promise<SpriteGroup[]>
{
    const binaryBankPaths =
    [
        filePaths.bank11Asm,
        filePaths.bank12Asm,
        filePaths.bank13Asm,
        filePaths.bank14Asm,
        filePaths.bank15Asm
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
            lines.push(line);

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
            if (spriteGroup.binaryLabel !== undefined &&
                 labelsInBank.includes(spriteGroup.binaryLabel))
            {
                spriteGroup.binaryBankPath = binaryBankPath;

                for (const sprite of spriteGroup.sprites ?? [])
                {
                    if (sprite.binaryLabel !== undefined)
                    {
                        sprite.binaryFilePath = binaryPathsByLabel[sprite.binaryLabel];
                    }
                }
            }
        }
    }

    const spriteGroups: SpriteGroup[] = [];

    for (const spriteGroup of incompleteSpriteGroups)
    {
        validateExtractedSpriteGroup(spriteGroup, true, true);
        spriteGroups.push(spriteGroup as SpriteGroup);
    }

    const spriteGroupsYmlContents =
        yamlHeader + '\n' +
        dumpArrayAsYamlWithNumericKeys(incompleteSpriteGroups, spriteGroupDumpOptions);

    api.writeReference(filePaths.spriteGroupsYml, spriteGroupsYmlContents);

    return spriteGroups;
}

const spriteGroupDumpOptions: jsyaml.DumpOptions =
{
    flowLevel: 1,
    sortKeys: sortSpriteGroupKeys,
    replacer: replaceSpriteGroupValues
};

function sortSpriteGroupKeys(key1: string | symbol, key2: string | symbol): number
{
    if (typeof key1 !== 'string' || typeof key2 !== 'string')
    {
        return 0;
    }

    const keyOrderLists = [spriteGroupKeyDisplayOrder as string[]];

    for (const keyOrderList of keyOrderLists)
    {
        if (keyOrderList.includes(key1) && keyOrderList.includes(key2))
        {
            return keyOrderList.indexOf(key1) - keyOrderList.indexOf(key2) ;
        }
    }

    return 0;
}

function replaceSpriteGroupValues(key: string | symbol, value: unknown): undefined | unknown
{
    if (typeof key === 'string' && key.length > 0 && firstCharIsLowerCase(key))
    {
        return undefined;
    }

    return value;
}

export async function extractBank03(api: PluginApi): Promise<Partial<SpriteGroupPalette>[]>
{
    const bank03FileContents: string = await api.getSourceText(filePaths.bank03Asm);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank03FileContents, 'SPRITE_GROUP_PALETTES');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUP_PALETTES could not be found in the source file ${filePaths.bank03Asm}.`);
    }
    const lines: CA65Line[] = [];
    const spriteGroupPalettes: Partial<SpriteGroupPalette>[] = [];

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
                        filePaths.bank11Asm,
                        lines,
                        line);
                }
                else
                {
                    const operandStringValue = getTextFromCA65StringLiteral(line.operandList);

                    spriteGroupPalettes.push(
                        {
                            binaryFilePath: `src/bin/US/${operandStringValue}`
                        });
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

export async function extractPaletteBinaries(api: PluginApi, incompletePalettes: Partial<SpriteGroupPalette>[]): Promise<SpriteGroupPalette[]>
{
    const pngWidth = 18;
    const pngHeight = 17;
    const lastPaletteIndex = incompletePalettes.length * 16;

    let pngPaletteIndex = 0;

    const snesImage: SnesImage = SnesImage(pngWidth, pngHeight);
    snesImage.palette[lastPaletteIndex] = SnesColor(15, 15, 15);
    snesImage.fill(lastPaletteIndex);

    for (let paletteNumber = 0; paletteNumber < incompletePalettes.length; ++paletteNumber)
    {
        const spriteGroupPalette = incompletePalettes[paletteNumber];
        spriteGroupPalette.Palette = [];

        if (spriteGroupPalette.binaryFilePath === undefined)
        {
            throw new Error('Sprite group data without a "Binary Bank Path" value was encountered.');
        }
        const buffer: Buffer = await api.getSourceBin(spriteGroupPalette.binaryFilePath);

        const y = (paletteNumber * 2) + 1;
        let x = 1;

        for (let bufferOffset = 0; bufferOffset < buffer.length; bufferOffset += 2)
        {
            const word = buffer.readUInt16LE(bufferOffset);
            const blue5 = word >>> 10;
            const green5 = (word & 0b0000_0011_1110_0000) >>> 5;
            const red5 = word & 0b0000_0000_0001_1111;

            const snesColor = SnesColor(red5, green5, blue5, bufferOffset === 0);
            spriteGroupPalette.Palette.push(snesColor);

            snesImage.palette[pngPaletteIndex] = SnesColor(red5, green5, blue5);
            snesImage.setPixelValue(x, y, pngPaletteIndex);

            pngPaletteIndex++;
            x++;
        }
    }

    api.writeReference(filePaths.spriteGroupPalettesPng, await snesImage.toPngBuffer());
    api.writeReference(filePaths.spriteGroupPalettesYml, spriteGroupPalettesYmlFileComment);

    return incompletePalettes as SpriteGroupPalette[];
}

const bytesPerTile = 32;
const rowsPerTile = 8;
const pixelsPerRow = 8;
const bitsPerPixel = 4;
const spritesPerRow = 4;
const maxSpriteRowCount = 4;

export async function extractSpriteGroupBinaries(api: PluginApi, spriteGroups: SpriteGroup[], spriteGroupPalettes: SpriteGroupPalette[]): Promise<void>
{
    const modifiedPalettes: SnesColor[][] = getPalettesModifiedForSpriteGroupPngExtraction(spriteGroupPalettes);

    for (const spriteGroup of spriteGroups)
    {
        if (spriteGroup['Length'] === undefined || spriteGroup['Length'] === 0)
        {
            continue;
        }

        const spriteWidth = spriteGroup.tilesWide * pixelsPerRow;
        const spriteHeight = spriteGroup.tilesHigh * rowsPerTile;

        const modifiedPalette: SnesColor[] = modifiedPalettes[spriteGroup.paletteIndex];

        const indexedPng = SnesImage(
            spriteWidth * spritesPerRow,
            spriteHeight * maxSpriteRowCount,
            modifiedPalette);

        indexedPng.fill(0);

        let spriteOffsetX = 0;
        let spriteOffsetY = 0;

        if (spriteGroup.sprites !== undefined)
        {
            let tileOffsetX = 0;
            let tileOffsetY = 0;

            for (let spriteIndex = 0; spriteIndex < spriteGroup.sprites?.length ?? 0; ++spriteIndex)
            {
                const sprite = spriteGroup.sprites[spriteIndex];

                const spriteGridCellX = spriteIndex % spritesPerRow;
                const spriteGridCellY = Math.floor(spriteIndex / spritesPerRow);

                spriteOffsetX = spriteGridCellX * spriteWidth;
                spriteOffsetY = spriteGridCellY * spriteHeight;

                let tileIndex = 0;
                for await (const tile of extractTiles(api, sprite))
                {
                    [tileOffsetX, tileOffsetY] = calculateTileOffsets(
                        tileIndex,
                        spriteGroup.tilesWide,
                        sprite.flipGraphicsHorizontally);

                    for (let pixelY = 0; pixelY < tile.length; ++pixelY)
                    {
                        const tileRow: number[] = tile[pixelY];
                        for (let pixelX = 0; pixelX < tileRow.length; ++pixelX)
                        {
                            indexedPng.setPixelValue(
                                spriteOffsetX + tileOffsetX + pixelX,
                                spriteOffsetY + tileOffsetY + pixelY,
                                getColorIndex(tileRow, pixelX, sprite.flipGraphicsHorizontally));
                        }
                    }

                    tileIndex++;
                }
            }
        }

        api.writeReference(spriteGroup.pngFilePath, await indexedPng.toPngBuffer());
    }
}

function getPalettesModifiedForSpriteGroupPngExtraction(spriteGroupPalettes: SpriteGroupPalette[]): SnesColor[][]
{
    const palettes: SnesColor[][] = [];
    for (const spriteGroupPalette of spriteGroupPalettes)
    {
        const paletteWithoutZeroColor: SnesColor[] = spriteGroupPalette['Palette'].slice(1);
        const unusedGrayColor: SnesColor = findGrayNotInSnesColorList(paletteWithoutZeroColor);
        palettes.push([unusedGrayColor, ...paletteWithoutZeroColor]);
    }

    return palettes;
}

function findGrayNotInSnesColorList(list: SnesColor[]): SnesColor
{
    for (let i = 0; i <= 15; ++i)
    {
        let component = 15 - i;
        let thisGray = SnesColor(component, component, component);
        if (!snesColorIsInList(thisGray, list))
        {
            return thisGray;
        }

        component = 16 + i;
        thisGray = SnesColor(component, component, component);
        if (!snesColorIsInList(thisGray, list))
        {
            return thisGray;
        }
    }

    throw new Error('An unused shade of gray could not be found.');
}

function snesColorIsInList(snesColor: SnesColor, list: SnesColor[]): boolean
{
    return list.some(c => c.equals(snesColor, true));
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
    const buffer: Buffer = await api.getSourceBin(sprite.binaryFilePath);
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