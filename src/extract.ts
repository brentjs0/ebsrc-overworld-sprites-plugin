import { filePaths, PluginApi } from '.';
import {
    CA65Datum,
    CA65Line,
    countCA65DatumBytes,
    DatumTypeString,
    getArgumentListFromPseudoFunctionCall,
    parseCA65Number,
    readCA65LineData,
    readCA65Lines,
} from './ca65';
import { CA65BlockError } from './ca65-error';
import { Sprite } from './sprite';
import { IncompleteSpriteGrouping, SpriteGrouping } from './sprite-grouping';
import { stringEqualsIgnoreCase, substringByLength } from './utility';

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
            sg.spriteGroupingDataLabel !== undefined &&
            currentSpriteGroupingPointerTableIndex !== undefined &&
            sg.spriteGroupingDataLabel === spriteGroupingDataLabels[currentSpriteGroupingPointerTableIndex])) {

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
    const grouping: IncompleteSpriteGrouping = {};

    const data: CA65Datum[] = lines.flatMap(l => readCA65LineData(l));
    const byteCount: number = countCA65DatumBytes(data);
    validateSpriteGroupingData(lines, data, byteCount);

    grouping.spriteGroupingDataLabel = lines[0].label;

    if (byteCount <= 0) {
        return grouping;
    }

    grouping.binaryGraphicsDataBankPath = filePaths.sourceSpriteBinaryDataDefault;

    grouping.tilesHigh = data[0].numericValue; // Bit offsets 00 to 07.
    grouping.tilesWide = data[1].numericValue >>> 4; // Bit offsets 08 to 11.
    grouping.bitOffsets12To15 = data[1].numericValue & 0b00001111; // This is always 0b0000.
    grouping.bitOffsets16To23 = data[2].numericValue;
    grouping.bitOffsets24To27 = (data[3].numericValue & 0b11110000) >>> 4; // This is always 0b0001.
    grouping.palette = (data[3].numericValue & 0b00001110) >>> 1; // Bit offsets 28 to 30.
    grouping.bitOffset31 = data[3].numericValue >>> 7; // This is always 0b0.
    grouping.bitOffsets32To39 = data[4].numericValue;
    grouping.bitOffsets40To47 = data[5].numericValue;
    grouping.bitOffsets48To55 = data[6].numericValue;
    grouping.bitOffsets56To63 = data[7].numericValue;
    grouping.binaryGraphicsDataLabel = getArgumentListFromPseudoFunctionCall(data[8].sourceExpressionText); // Bit offsets 64 to 71.

    grouping.sprites = []; // Bit offsets 72 and greater.
    for (const datum of data.slice(9)) {
        grouping.sprites.push(parseSpriteGroupingItem(lines, datum));
    }

    const pngFileName = `${spriteGroupingPointerTableIndex.toString().padStart(3, '0')}_${grouping.binaryGraphicsDataLabel}.png`
    grouping.pngFilePath = `${filePaths.referenceSpriteGraphics}${pngFileName}`

    return grouping;
}

function parseSpriteGroupingItem(lines: CA65Line[], spriteGroupingItemDatum: CA65Datum): Partial<Sprite> {
    const operandParts: string[] = getArgumentListFromPseudoFunctionCall(spriteGroupingItemDatum.sourceExpressionText)
        .split('|')
        .map(p => p.trim());

    let stringValue = undefined;
    let numericValue = 0;
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

    return {
        binaryGraphicsDataLabel: stringValue,
        flipGraphicsHorizontally: (numericValue & 0b1) === 1,
        floatsWhenOnWater: (numericValue >>> 1) === 1
    }
}

function assertIsDatumType(lines: CA65Line[], datum: CA65Datum, datumType: DatumTypeString) {
    if (datum.type !== datumType) {
        throw new CA65BlockError(
            `A '${datum.type}' value was encountered where a '${datumType}' value was expected.`,
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
            `No instruction was present where a '${instruction}' instruction was expected.`,
            filePaths.sourceSpriteGroupingData,
            lines,
            line);
    }

    if ((line.instruction.startsWith('.') && !stringEqualsIgnoreCase(line.instruction, instruction)) ||
        line.instruction !== instruction) {
            throw new CA65BlockError(
                `The instruction '${line.instruction}' was present where a '${instruction}' instruction was expected.`,
                filePaths.sourceSpriteGroupingData,
                lines,
                line);
    }
}

export async function extractBank11(api: PluginApi, spriteGroupings: IncompleteSpriteGrouping[]): Promise<SpriteGrouping[]> {
    const bank11FileContents: string = await api.getSourceText(filePaths.sourceSpriteBinaryDataDefault);
    const lineReader: Generator<CA65Line> = readCA65Lines(bank11FileContents);
    let currentSpriteGroupings: IncompleteSpriteGrouping[] | undefined = undefined;
    let linesInCurrentGraphicsDataBlock: CA65Line[] = [];
    
    for (const line of lineReader) {
        if (!line.isSignificantToAssembler) {
            continue;
        }
        
        if (line.label !== undefined) {
            // Check if we've arrived at the address for a block of binary sprite graphics data.
            const spriteGroupingsThatUseTheseGraphics = spriteGroupings.filter(sg => sg.binaryGraphicsDataLabel === line.label);
            if (spriteGroupingsThatUseTheseGraphics.length > 0) {

                // If this is the first block we've found, make it the current set of groupings being processed.
                if (currentSpriteGroupings === undefined) {
                    currentSpriteGroupings = spriteGroupingsThatUseTheseGraphics;
                }

                // If we've arrived at the next block, extract the data from the current lines and set up for the block that starts on this line.
                if (linesInCurrentGraphicsDataBlock.length > 0) {
                    assignBinaryGraphicsFilePaths(linesInCurrentGraphicsDataBlock, currentSpriteGroupings);

                    currentSpriteGroupings = spriteGroupingsThatUseTheseGraphics;
                    linesInCurrentGraphicsDataBlock = [];
                }
            }
        }

        linesInCurrentGraphicsDataBlock.push(line);
    }

    if (currentSpriteGroupings !== undefined && linesInCurrentGraphicsDataBlock.length > 0) {
        assignBinaryGraphicsFilePaths(linesInCurrentGraphicsDataBlock, currentSpriteGroupings);
    }

    return spriteGroupings as any;
}

function assignBinaryGraphicsFilePaths(lines: CA65Line[], spriteGroupingsThatUseTheseGraphics: IncompleteSpriteGrouping[]) {
    const graphicsFilePathsByBinaryDataLabel: { [index: string]: string } = parseBinaryGraphicsFilePaths(
        lines,
        spriteGroupingsThatUseTheseGraphics);

    for (const incompleteSpriteGrouping of spriteGroupingsThatUseTheseGraphics) {
        for (const sprite of incompleteSpriteGrouping.sprites ?? []) {
            sprite.binaryGraphicsFilePath = graphicsFilePathsByBinaryDataLabel[sprite.binaryGraphicsDataLabel];
        }
    }
}

function parseBinaryGraphicsFilePaths(lines: CA65Line[], spriteGroupingsThatUseTheseGraphics: IncompleteSpriteGrouping[]): { [index: string]: string } {
    const graphicsFilePathsByBinaryDataLabel: { [index: string]: string } = {};

    const binaryGraphicsDataLabels: string[] = spriteGroupingsThatUseTheseGraphics
        .filter(sg => sg.sprites !== undefined)
        .flatMap(sg => sg.sprites!.map(s => s.binaryGraphicsDataLabel));
        
    let currentLabel: string | undefined = undefined;
    for (const line of lines) {
        if (line?.label !== undefined &&
            binaryGraphicsDataLabels.includes(line.label)) {
            currentLabel = line.label;
        }
        if (currentLabel !== undefined &&
            line.instruction === 'BINARY' &&
            line.operandList !== undefined) {

            graphicsFilePathsByBinaryDataLabel[currentLabel] = 
                `src/bin/US/${substringByLength(line.operandList, 1, line.operandList.length - 2)}`;
        }
    }

    return graphicsFilePathsByBinaryDataLabel;
}