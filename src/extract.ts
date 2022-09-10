import * as path from 'path';
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
import { validateIncompleteSprite, IncompleteSprite } from './sprite';
import { SpriteGroupPalette } from './sprite-group-palette';
import { IncompleteSpriteGroup, SpriteGroup, validateIncompleteSpriteGroup, validateSpriteGroup } from './sprite-group';
import { stringEqualsIgnoreCase } from './utility';
import { Color } from './color';
import { createPNG } from 'indexed-png';

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

    group['Binary Bank Path'] = filePaths.bank11ASM;

    const tilesHigh = data[0].numericValue; // Bit offsets 00 to 07.
    const tilesWide = data[1].numericValue >>> 4; // Bit offsets 08 to 11.
    group['Size'] = `${tilesWide * 8}x${tilesHigh * 8}`;

    group['Offset 12 to 15'] = data[1].numericValue & 0b00001111; // This is always 0b0000.
    group['Offset 16 to 23'] = data[2].numericValue;
    group['Offset 24 to 27'] = (data[3].numericValue & 0b11110000) >>> 4; // This is always 0b0001.
    group['Palette'] = (data[3].numericValue & 0b00001110) >>> 1; // Bit offsets 28 to 30.
    group['Offset 31'] = data[3].numericValue >>> 7; // This is always 0b0.
    group['North/South Collision Width'] = data[4].numericValue;
    group['North/South Collision Height'] = data[5].numericValue;
    group['East/West Collision Width'] = data[6].numericValue;
    group['East/West Collision Height'] = data[7].numericValue;
    group['Binary Label'] = getArgumentListFromPseudoFunctionCall(data[8].sourceExpressionText); // Bit offsets 64 to 71.

    const pngFileName = `${spriteGroupingPointerTableIndex.toString().padStart(4, '0')}_${group['Binary Label']}.png`
    group['PNG File Path'] = `${filePaths.spriteGroupsDirectory}${pngFileName}`

    group['Sprites'] = []; // Bit offsets 72 and greater.
    for (const datum of data.slice(9))
    {
        group['Sprites'].push(parseSpriteData(lines, datum));
    }

    return castToIncompleteSpriteGroup(group, filePaths.spriteGroupingDataASM, lines);
}

function castToIncompleteSpriteGroup(group: Partial<IncompleteSpriteGroup>, fileName: string, lines: CA65Line[]): IncompleteSpriteGroup
{
    const errorMessage: string | undefined = validateIncompleteSpriteGroup(group);
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
        'Float When On Water': (numericValue >>> 1) === 1
    }

    return castToIncompleteSprite(incompleteSprite, filePaths.spriteGroupingDataASM, lines);

}

function castToIncompleteSprite(sprite: Partial<IncompleteSprite>, fileName: string, lines: CA65Line[]): IncompleteSprite
{
    const errorMessage: string | undefined = validateIncompleteSprite(sprite);
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

export async function extractBank11(api: PluginApi, incompleteSpriteGroups: IncompleteSpriteGroup[]): Promise<SpriteGroup[]>
{
    const bank11FileContents: string = await api.getSourceText(filePaths.bank11ASM);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank11FileContents);
    
    const binaryPathsByLabel: { [index: string]: string } = {};

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
            labelsForAddress.push(line.label);
        }

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
        for (const sprite of spriteGroup['Sprites'] ?? [])
        {
            sprite['Binary File Path'] = binaryPathsByLabel[sprite['Binary Label']];
        }
        const spriteGroupErrorMessage: string | undefined = validateSpriteGroup(spriteGroup);
        if (spriteGroupErrorMessage !== undefined)
        {
            throw new Error(spriteGroupErrorMessage);
        }
    }

    return incompleteSpriteGroups as SpriteGroup[];
}

export async function extractSpriteGroupPalettesFromBank03(api: PluginApi): Promise<SpriteGroupPalette[]>
{
    const bank03FileContents: string = await api.getSourceText(filePaths.bank03ASM);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank03FileContents, 'SPRITE_GROUP_PALETTES');
    if (lineReader.next()?.done !== false)
    {
        throw new Error(`SPRITE_GROUP_PALETTES could not be found in the source file ${filePaths.bank03ASM}.`);
    }
    const lines: CA65Line[] = [];
    const spriteGroupPalettes: SpriteGroupPalette[] = [];

    let paletteNumber = 0;
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
                    const fileName = path.basename(operandStringValue);

                    spriteGroupPalettes.push(
                    {
                        number: paletteNumber++,
                        binaryFilePath: `src/bin/US/${operandStringValue}`,
                        pngFilePath: `${filePaths.spriteGroupsDirectory}${fileName}.png`
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

export async function extractSpriteGroupPalettePNGFromBinaries(api: PluginApi, palettes: SpriteGroupPalette[])
{
    const middleGray = 8355711;
    const lastPaletteIndex = 128;

    const pngPalette: number[] = [];
    pngPalette[lastPaletteIndex] = middleGray;
    let paletteIndex = 0;

    let imageData: number[] = Array(19).fill(lastPaletteIndex);
    let imageDataValue = 0;

    for (const palette of palettes)
    {
        const buffer: Buffer = await api.getSourceBin(palette.binaryFilePath);

        for (let i = 0; i < buffer.length; i += 2)
        {
            imageData.push(imageDataValue++);

            const word = buffer.readUInt16LE(i);
            const blue = Color.convertComponentTo8Bit(word >>> 10);
            const green = Color.convertComponentTo8Bit((word & 0b0000_0011_1110_0000) >>> 5);
            const red = Color.convertComponentTo8Bit(word & 0b0000_0000_0001_1111);

            pngPalette[paletteIndex++] = blue | (green << 8) | (red << 16);
        }
        imageData = imageData.concat(Array(20).fill(lastPaletteIndex));
    }

    imageData.push(lastPaletteIndex);

    api.writeReference(filePaths.spriteGroupPalettesPNG, await createPNG(Buffer.from(imageData), pngPalette, 18))
}