import { RgbaColor } from './data/rgba-color';

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