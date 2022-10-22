import PluginApi from './mock-plugin-api';
import { RgbaColor } from './data/rgba-color';
import { SpriteGroupPalette } from './data/sprite-group-palette';
import { filePaths, yamlHeader } from './plugin';
import { loadYamlWithNumericKeysAsArray, objectHasKey } from './utility';
import { FileParseError } from './file-parse-error';
import { ColorScalingMethods } from './data/snes-color';

export async function importSpriteGroupPalettes(api: PluginApi): Promise<SpriteGroupPalette[]>
{
    const spriteGroupPalettes: SpriteGroupPalette[] = [];

    const modFiles: string[] = await api.listModFiles();
    if (modFiles.includes(filePaths.spriteGroupPalettesYml))
    {
        const fileContents: string = (await api.getModText(filePaths.spriteGroupPalettesYml)).trim();

        // ebsrc-sprite-groups-plugin v1.0.0 format.
        if (fileContents.startsWith(yamlHeader))
        {
            throw new Error('not implemented.');
        }
        // CoilSnake format.
        else
        {
            const objects: unknown[] = loadYamlWithNumericKeysAsArray(fileContents);
            for (let i = 0; i < objects.length; ++i)
            {
                const obj: unknown = objects[i];
                const spriteGroupPalette: Partial<SpriteGroupPalette> = {};

                spriteGroupPalette['Binary File Path'] = `src/bin/US/overworld_sprites/${i}.pal`;

                if (typeof obj === 'object' &&
                    obj !== null &&
                    objectHasKey(obj, 'Palette') &&
                    Array.isArray(obj['Palette']))
                {
                    spriteGroupPalette['Palette'] = [];
                    for (const item of obj['Palette'])
                    {
                        spriteGroupPalette['Palette'].push(parseColorTuple(item).toSnesColor(ColorScalingMethods.CoilSnake));
                    }
                }
                
                // const errorMessage: string | undefined = validateImportedSpriteGroupPalettes(value);
                spriteGroupPalettes.push(spriteGroupPalette as SpriteGroupPalette);
            }
        }
    }

    return spriteGroupPalettes;
}

function parseColorTuple(item: unknown): RgbaColor
{
    if (typeof item !== 'string')
    {
        throw new FileParseError(
            'A non-string was encountered where an RGB color expression was expected.',
            filePaths.spriteGroupPalettesYml);
    }

    const rgbExpression: string = item.trim();
    
    if (!rgbExpression.startsWith('(') || !rgbExpression.endsWith(')'))
    {
        throw new FileParseError(
            `An RGB color expression with missing parentheses was encountered: ${rgbExpression}`,
            filePaths.spriteGroupPalettesYml);
    }

    const componentStrings: string[] = rgbExpression.substring(1, rgbExpression.length - 1).split(',');
    if (componentStrings.length !== 3)
    {
        throw new FileParseError(
            `An RGB color expression with an invalid number of components was encountered: ${rgbExpression}.`,
            filePaths.spriteGroupPalettesYml);
    }

    const red = parseColorComponent(componentStrings[0], 'red', rgbExpression);
    const green = parseColorComponent(componentStrings[1], 'green', rgbExpression);
    const blue = parseColorComponent(componentStrings[2], 'blue', rgbExpression);

    return RgbaColor(red, green, blue, 255);
}

function parseColorComponent(componentString: string, componentName: string, fullRgbExpression: string): number
{
    const num = Number.parseInt(componentString, 10);
    if (Number.isNaN(num))
    {
        throw new FileParseError(
            `An RGB color expression with a non-numeric ${componentName} component was encountered: ${fullRgbExpression}.`,
            filePaths.spriteGroupPalettesYml);
    }

    return num;
}

function readIndexedPngPalette(data: Buffer): RgbaColor[] | undefined
{
    const dataView = new DataView(new Uint8Array(data.buffer));
    let plteChunkData: Uint8Array | undefined = undefined;
    let trnsChunkData: Uint8Array | undefined = undefined;

    let chunkDataLength = 0;
    for (let chunkStartOffset = 8; chunkStartOffset < data.byteLength; chunkStartOffset += chunkDataLength + 12)
    {
        chunkDataLength = dataView.getUint32(chunkStartOffset, false);

        const chunkType = String.fromCharCode(
            dataView.getUint8(chunkStartOffset + 4),
            dataView.getUint8(chunkStartOffset + 5),
            dataView.getUint8(chunkStartOffset + 6),
            dataView.getUint8(chunkStartOffset + 7));

        switch (chunkType)
        {
            case 'IHDR':
            {
                const colorType: number = dataView.getUint8(chunkStartOffset + 17);
                if (colorType !== 3)
                {
                    return undefined;
                }
                break;
            }
            case 'PLTE':
                plteChunkData = getUint8Range(dataView, chunkStartOffset + 8, chunkDataLength);
                break;
            case 'tRNS':
                trnsChunkData = getUint8Range(dataView, chunkStartOffset + 8, chunkDataLength);
                break;
        }

        if (plteChunkData !== undefined && trnsChunkData !== undefined)
        {
            break;
        }
    }

    if (plteChunkData !== undefined)
    {
        return parsePaletteFromPngChunkData(plteChunkData, trnsChunkData);
    }

    return undefined;
}

function getUint8Range(dataView: DataView, startOffset: number, length: number) : Uint8Array
{
    const data = new Uint8Array(length);
    for (let i = 0; i < length; ++i)
    {
        const uint8 = dataView.getUint8(startOffset + i);
        data[i] = uint8;
    }
    
    return data;
}

function parsePaletteFromPngChunkData(plteChunkData: Uint8Array, trnsChunkData: Uint8Array | undefined): RgbaColor[]
{
    const rgbaColors: RgbaColor[] = [];
    const colorCount = plteChunkData.length / 3;
    
    for (let i = 0; i < colorCount; ++i)
    {
        const plteOffset = i * 3;

        rgbaColors.push(RgbaColor(
            plteChunkData[plteOffset + 0],
            plteChunkData[plteOffset + 1],
            plteChunkData[plteOffset + 2],
            trnsChunkData?.[i] ?? 255));
    }

    return rgbaColors;
}