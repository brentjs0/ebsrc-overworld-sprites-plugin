import * as path from 'path';

import { filePaths, PluginApi } from '.';
import {
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
import { IncompleteSpriteGrouping, SpriteGrouping, validateIncompleteSpriteGrouping, validateSpriteGrouping } from './sprite-grouping';
import { stringEqualsIgnoreCase } from './utility';

export async function extractSpriteGroupingPointers(api: PluginApi): Promise<string[]> {
    const spriteGroupingPointersFileContents: string = await api.getSourceText(filePaths.sourceSpriteGroupingPointers);

    let lineReader: Generator<CA65Line> = readCA65Lines(spriteGroupingPointersFileContents, 'SPRITE_GROUPING_PTR_TABLE');
    if (lineReader.next()?.done !== false) {
        throw new Error(`SPRITE_GROUPING_PTR_TABLE could not be found in the source file ${filePaths.sourceSpriteGroupingPointers}.`);
    }

    const spriteGroupingDataLabels: string[] = [];
    for (const line of lineReader) {
        if (line.instruction !== undefined && line.operandList && stringEqualsIgnoreCase(line.instruction, '.DWORD')) {
            spriteGroupingDataLabels.push(line.operandList);
        }
    }

    return spriteGroupingDataLabels;
}

export async function extractSpriteGroupingData(api: PluginApi, spriteGroupingDataLabels: string[]): Promise<IncompleteSpriteGrouping[]> {
    const spriteGroupingDataFileContents: string = await api.getSourceText(filePaths.sourceSpriteGroupingData);

    let lineReader: Generator<CA65Line> = readCA65Lines(spriteGroupingDataFileContents, 'SPRITE_GROUPING_DATA');
    if (lineReader.next()?.done !== false) {
        throw new Error(`SPRITE_GROUPING_DATA could not be found in the source file ${filePaths.sourceSpriteGroupingData}.`);
    }

    const incompleteSpriteGroupings: IncompleteSpriteGrouping[] = [];
    let currentSpriteGroupingPointerTableIndex: number | undefined = undefined;
    let linesInCurrentSpriteGrouping: CA65Line[] = [];

    for (const line of lineReader) {
        if (!line.isSignificantToAssembler) {
            continue;
        }
        
        if (line.label !== undefined) {
            // Check if we've arrived at the address for a block of sprite grouping data.
            const spriteGroupingPointerTableIndex: number = spriteGroupingDataLabels.indexOf(line.label);
            if (spriteGroupingPointerTableIndex !== -1) {
                // If this is the first block we've found, make it the current grouping being processed.
                if (currentSpriteGroupingPointerTableIndex === undefined) {
                    currentSpriteGroupingPointerTableIndex = spriteGroupingPointerTableIndex;
                }

                // If we've arrived at the next block, extract the data from the current lines and set up for the block that starts on this line.
                if (linesInCurrentSpriteGrouping.length > 0) {
                    incompleteSpriteGroupings.push(parseSpriteGroupingData(linesInCurrentSpriteGrouping, currentSpriteGroupingPointerTableIndex));

                    currentSpriteGroupingPointerTableIndex = spriteGroupingPointerTableIndex;
                    linesInCurrentSpriteGrouping = [];
                }
            }
        }

        linesInCurrentSpriteGrouping.push(line);
    }

    if (currentSpriteGroupingPointerTableIndex !== undefined &&
        linesInCurrentSpriteGrouping.length > 0 &&
        !incompleteSpriteGroupings.some(sg =>
            sg.label !== undefined &&
            currentSpriteGroupingPointerTableIndex !== undefined &&
            sg.label === spriteGroupingDataLabels[currentSpriteGroupingPointerTableIndex])) {

        incompleteSpriteGroupings.push(parseSpriteGroupingData(linesInCurrentSpriteGrouping, spriteGroupingDataLabels.length - 1));
    }

    return incompleteSpriteGroupings;
}

function validateSpriteGroupingData(lines: CA65Line[], data: CA65Datum[], byteCount: number) {
    if (byteCount !== 0 && (byteCount < 25 || byteCount > 41)) {
        throw new CA65BlockError(
            'A block of sprite grouping data with an unexpected number of bytes was encountered.',
            filePaths.sourceSpriteGroupingData,
            lines);
    }

    if (byteCount <= 0) {
        return;
    }

    for (let i = 0; i <= 7; ++i) {
        assertIsDatumType(lines, data[i], 'byte');
        assertDatumIsNumeric(lines, data[i]);
    }

    assertLineContainsInstruction(lines, data[8].line, 'SPRITES');

    if (byteCount <= 25) {
        return;
    }

    assertLineContainsInstruction(lines, data[17].line, 'SPRITES2');
}

function parseSpriteGroupingData(lines: CA65Line[], spriteGroupingPointerTableIndex: number): IncompleteSpriteGrouping {
    const grouping: Partial<IncompleteSpriteGrouping> = {};

    const data: CA65Datum[] = lines.flatMap(l => readCA65LineData(l));
    const byteCount: number = countCA65DatumBytes(data);
    validateSpriteGroupingData(lines, data, byteCount);

    grouping.label = lines[0].label;

    if (byteCount <= 0) {
        return castToIncompleteSpriteGrouping(grouping, filePaths.sourceSpriteGroupingData, lines);
    }

    grouping.binaryBankPath = filePaths.sourceSpriteBinaryDataDefault;

    grouping.tilesHigh = data[0].numericValue; // Bit offsets 00 to 07.
    grouping.tilesWide = data[1].numericValue >>> 4; // Bit offsets 08 to 11.
    grouping.bitOffsets12To15 = data[1].numericValue & 0b00001111; // This is always 0b0000.
    grouping.bitOffsets16To23 = data[2].numericValue;
    grouping.bitOffsets24To27 = (data[3].numericValue & 0b11110000) >>> 4; // This is always 0b0001.
    grouping.paletteNumber = (data[3].numericValue & 0b00001110) >>> 1; // Bit offsets 28 to 30.
    grouping.bitOffset31 = data[3].numericValue >>> 7; // This is always 0b0.
    grouping.bitOffsets32To39 = data[4].numericValue;
    grouping.bitOffsets40To47 = data[5].numericValue;
    grouping.bitOffsets48To55 = data[6].numericValue;
    grouping.bitOffsets56To63 = data[7].numericValue;
    grouping.binaryLabel = getArgumentListFromPseudoFunctionCall(data[8].sourceExpressionText); // Bit offsets 64 to 71.

    const pngFileName = `${spriteGroupingPointerTableIndex.toString().padStart(4, '0')}_${grouping.binaryLabel}.png`
    grouping.pngFilePath = `${filePaths.referenceSpriteGraphics}${pngFileName}`

    grouping.sprites = []; // Bit offsets 72 and greater.
    for (const datum of data.slice(9)) {
        grouping.sprites.push(parseSpriteData(lines, datum));
    }

    return castToIncompleteSpriteGrouping(grouping, filePaths.sourceSpriteGroupingData, lines);
}

function castToIncompleteSpriteGrouping(grouping: Partial<IncompleteSpriteGrouping>, fileName: string, lines: CA65Line[]): IncompleteSpriteGrouping {
    const errorMessage: string | undefined = validateIncompleteSpriteGrouping(grouping);
    if (errorMessage !== undefined) {
        throw new CA65BlockError(errorMessage, fileName, lines);
    }

    return grouping as IncompleteSpriteGrouping;
}

function parseSpriteData(lines: CA65Line[], spriteGroupingItemDatum: CA65Datum): IncompleteSprite {
    const operandParts: string[] = getArgumentListFromPseudoFunctionCall(spriteGroupingItemDatum.sourceExpressionText)
        .split('|')
        .map(p => p.trim());

    let stringValue: string | undefined = undefined;
    let numericValue: number = 0;
    for (const operandPart of operandParts) {
        const number: number = parseCA65Number(operandPart);
        if (!Number.isNaN(number)) {
            numericValue |= number;
        }
        else if (stringValue === undefined) {
            stringValue = operandPart;
        }
        else {
            throw new CA65BlockError(
                'An unexpected value was encountered while parsing sprite flags and addresses for binary sprite data.',
                filePaths.sourceSpriteGroupingData,
                lines,
                spriteGroupingItemDatum.line);
        }
    }

    const incompleteSprite: IncompleteSprite = {
        binaryLabel: stringValue!,
        flipGraphicsHorizontally: (numericValue & 0b1) === 1,
        floatsWhenOnWater: (numericValue >>> 1) === 1
    }

    return castToIncompleteSprite(incompleteSprite, filePaths.sourceSpriteGroupingData, lines);

}

function castToIncompleteSprite(sprite: Partial<IncompleteSprite>, fileName: string, lines: CA65Line[]): IncompleteSprite {
    const errorMessage: string | undefined = validateIncompleteSprite(sprite);
    if (errorMessage !== undefined) {
        throw new CA65BlockError(errorMessage, fileName, lines);
    }

    return sprite as IncompleteSprite;
}

function assertIsDatumType(lines: CA65Line[], datum: CA65Datum, datumType: DatumTypeString) {
    if (datum.type !== datumType) {
        throw new CA65BlockError(
            `A "${datum.type}" value was encountered where a "${datumType}" value was expected.`,
            filePaths.sourceSpriteGroupingData,
            lines,
            datum.line);
    }
}

function assertDatumIsNumeric(lines: CA65Line[], datum: CA65Datum) {
    if (Number.isNaN(datum.numericValue)) {
        throw new CA65BlockError(
            `A non-numeric expression was encountered where a numeric expression was expected.`,
            filePaths.sourceSpriteGroupingData,
            lines,
            datum.line);
    }
}

function assertLineContainsInstruction(lines: CA65Line[], line: CA65Line, instruction: string) {
    if (line?.instruction === undefined) {
        throw new CA65BlockError(
            `No instruction was present where a "${instruction}" instruction was expected.`,
            filePaths.sourceSpriteGroupingData,
            lines,
            line);
    }

    if ((line.instruction.startsWith('.') && !stringEqualsIgnoreCase(line.instruction, instruction)) ||
        line.instruction !== instruction) {
            throw new CA65BlockError(
                `The instruction "${line.instruction}" was present where a "${instruction}" instruction was expected.`,
                filePaths.sourceSpriteGroupingData,
                lines,
                line);
    }
}

export async function extractBank11(api: PluginApi, incompleteSpriteGroupings: IncompleteSpriteGrouping[]): Promise<SpriteGrouping[]> {
    const bank11FileContents: string = await api.getSourceText(filePaths.sourceSpriteBinaryDataDefault);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank11FileContents);
    
    const binaryPathsByLabel: { [index: string]: string } = {};

    let lines: CA65Line[] = [];
    let labelsForAddress: string[] = [];
    
    for (const line of lineReader) {
        if (!line.isSignificantToAssembler) {
            continue;
        }

        if (line.label !== undefined) {
            labelsForAddress.push(line.label);
        }

        if (line.instruction === 'BINARY') {
            if (!isCA65StringLiteral(line.operandList)) {
                throw new CA65BlockError(
                    'A BINARY macro call was found with an invalid file path operand.',
                    filePaths.sourceSpriteBinaryDataDefault,
                    lines,
                    line);
            }
            const binaryPath = `src/bin/US/${getTextFromCA65StringLiteral(line.operandList)}`;
            for (const label of labelsForAddress) {
                binaryPathsByLabel[label] = binaryPath;
            }

            labelsForAddress = [];
            lines = [];
        }
    }

    for (const spriteGrouping of incompleteSpriteGroupings) {
        for (const sprite of spriteGrouping.sprites ?? []) {
            sprite.binaryFilePath = binaryPathsByLabel[sprite.binaryLabel];
        }
        const spriteGroupingErrorMessage: string | undefined = validateSpriteGrouping(spriteGrouping);
        if (spriteGroupingErrorMessage !== undefined) {
            throw new Error(spriteGroupingErrorMessage);
        }
    }

    return incompleteSpriteGroupings as SpriteGrouping[];
}

export async function extractSpriteGroupPalettesFromBank03(api: PluginApi): Promise<SpriteGroupPalette[]> {
    const bank03FileContents: string = await api.getSourceText(filePaths.sourceSpriteGroupPaletteDataDefault);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank03FileContents, 'SPRITE_GROUP_PALETTES');
    if (lineReader.next()?.done !== false) {
        throw new Error(`SPRITE_GROUP_PALETTES could not be found in the source file ${filePaths.sourceSpriteGroupPaletteDataDefault}.`);
    }
    const lines: CA65Line[] = [];
    const spriteGroupPalettes: SpriteGroupPalette[] = [];

    let paletteNumber = 0;
    for (const line of lineReader) {
        lines.push(line);

        if (!line.isSignificantToAssembler) {
            continue;
        }
        if (line.instruction !== undefined) {
            if (line.instruction === 'BINARY') {
                if (!isCA65StringLiteral(line.operandList)) {
                    throw new CA65BlockError(
                        'A BINARY macro call was found with an invalid file path operand.',
                        filePaths.sourceSpriteBinaryDataDefault,
                        lines,
                        line);
                }
                else {
                    const operandStringValue = getTextFromCA65StringLiteral(line.operandList);
                    const fileName = path.basename(operandStringValue);

                    spriteGroupPalettes.push({
                        number: paletteNumber++,
                        binaryFilePath: `src/bin/US/${operandStringValue}`,
                        pngFilePath: `${filePaths.referenceSpriteGraphics}${fileName}.png`
                    })
                }
            }
            else {
                break;
            }
        }
    }

    return spriteGroupPalettes;
}