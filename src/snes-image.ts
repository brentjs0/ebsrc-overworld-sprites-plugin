import { IndexedPNG } from 'indexed-png';
import findLastIndex from 'lodash/findLastIndex';
import isEqual from 'lodash/isEqual';

import { SnesColor } from './data/snes-color';

const pixelValuesSymbol: unique symbol = Symbol('pixelValues');
const widthSymbol: unique symbol = Symbol('width');
const heightSymbol: unique symbol = Symbol('height');

export type SnesImage =
{
    [pixelValuesSymbol]: number[];
    getPixelValues: () => number[];
    [widthSymbol]: number;
    getWidth: () => number;
    [heightSymbol]: number;
    getHeight: () => number;
    palette: SnesColor[];
    getPaletteColorIndex: (snesColor: SnesColor) => number;
    setPixelValue: (x: number, y: number, colorIndexValue: number) => void;
    fill: (colorIndexValue: number) => void;
    toPngBuffer: () => Promise<Buffer>;
}

export namespace SnesImage
{
    export function create(width: number, height: number, palette: SnesColor[] | undefined = undefined)
    {
        const indexedPng: SnesImage = 
        {
            [pixelValuesSymbol]: Array(width * height).fill(0),
            getPixelValues: getPixelValues,
            [widthSymbol]: width,
            getWidth: getWidth,
            [heightSymbol]: height,
            getHeight: getHeight,
            palette: palette ?? [],
            getPaletteColorIndex: getPaletteColorIndex,
            setPixelValue: setPixelValue,
            fill: fill,
            toPngBuffer: toPngBuffer
        };
        
        return indexedPng;
    }

    function getPixelValues(this: SnesImage): number[]
    {
        return [...this[pixelValuesSymbol]];
    }

    function getWidth(this: SnesImage): number
    {
        return this[widthSymbol];
    }

    function getHeight(this: SnesImage): number
    {
        return this[heightSymbol];
    }

    function getPaletteColorIndex(this: SnesImage, snesColor: SnesColor): number
    {
        for (let i = 0 ; i < this.palette.length; ++i)
        {
            if (isEqual(this.palette[i], snesColor))
            {
                return i;
            }
        }

        return -1;
    }

    function setPixelValue(this: SnesImage, x: number, y: number, colorIndexValue: number)
    {
        checkPixelCoordinateArguments(this, x, y);
        const dataIndex = getPixelValueIndex(this, x, y);
        this[pixelValuesSymbol][dataIndex] = colorIndexValue;
    }

    function checkPixelCoordinateArguments(indexedPng: SnesImage, x: number, y: number)
    {
        assertArgumentIsInteger('x', x);
        if (x >= indexedPng[widthSymbol])
        {
            throw new Error('The value of "x" must be less than the width of the image.');
        }

        assertArgumentIsInteger('y', y);
        if (y >= indexedPng[heightSymbol])
        {
            throw new Error('The value of "y" must be less than the height of the image.');
        }
    }

    function assertArgumentIsInteger(parameterName: string, value: number)
    {
        if (!Number.isInteger(value))
        {
            throw new Error(`The value of "${parameterName}" must be an integer.`);
        }
    }

    function getPixelValueIndex(snesImage: SnesImage, x: number, y: number)
    {
        return (snesImage[widthSymbol] * y) + x;
    }

    function fill(this: SnesImage, colorIndex: number)
    {
        this[pixelValuesSymbol].fill(colorIndex);
    }

    async function toPngBuffer(this: SnesImage): Promise<Buffer>
    {
        const bitDepth: IndexedBitDepth = calculateMinimumPossibleBitDepth(this.palette.length);

        const png = new IndexedPNG();
        png.writeHeader();
        png.writeIHDR(
        {
            width: this.getWidth(),
            height: this.getHeight(),
            bitDepth: bitDepth,
            colorType: 3,
            compressionMethod: 0,
            filterMethod: 0,
            interlaceMethod: 0
        });

        png.writeChunk('PLTE', createPLTE(this.palette));

        const lastTransparentColorIndex = findLastIndex(this.palette, c => c.isTransparent);
        if (lastTransparentColorIndex !== -1)
        {
            const paletteSlice = this.palette.slice(0, lastTransparentColorIndex + 1);
            png.writeTRNS(paletteSlice.map(c => c.isTransparent ? 0 : 0xFF));
        }

        const bytesPerLine = Math.ceil((this.getWidth() * bitDepth) / 8);
        const idatByteBuffer = convertValuesToBuffer(this, bitDepth, bytesPerLine);

        // indexed-png's writeIDAT() assumes each channel value will be a single byte (bit depth 8),
        // so we need to adjust the "width" that we pass to this method to make sure it doesn't grab
        // too many bytes for each line.
        await png.writeIDAT(idatByteBuffer, bytesPerLine, this.getHeight());

        png.writeIEND();

        return png.getData();
    }

    // indexed-png's createPLTE() function assumes palettes are 256 colors, so we need to
    // use our own method to have shorter palettes.
    function createPLTE(snesColorPalette: SnesColor[]): Buffer
    {
        const plteBuffer = Buffer.alloc(snesColorPalette.length * 3);
        for (let i = 0; i < snesColorPalette.length; i++)
        {
            const rgbaColor = snesColorPalette[i].toRgbaColor();
            plteBuffer[i * 3 + 0] = rgbaColor.red;
            plteBuffer[i * 3 + 1] = rgbaColor.green;
            plteBuffer[i * 3 + 2] = rgbaColor.blue;
        }

        return plteBuffer;
    }

    type IndexedBitDepth = 1 | 2 | 4 | 8;
    const validIndexedBitDepths: IndexedBitDepth[] = [1, 2, 4, 8];

    function calculateMinimumPossibleBitDepth(paletteLength: number): IndexedBitDepth
    {
        let maxPaletteLengthForBitDepth: number = 0;
        for (const bitDepth of validIndexedBitDepths)
        {
            maxPaletteLengthForBitDepth = Math.pow(2, bitDepth);
            if (maxPaletteLengthForBitDepth >= paletteLength)
            {
                return bitDepth;
            }
        }

        throw new Error(`A palette must not exceed ${maxPaletteLengthForBitDepth} colors`);
    }

    function convertValuesToBuffer(snesImage: SnesImage, bitDepth: IndexedBitDepth, bytesPerLine: number): Buffer
    {
        const pixelValues: number[] = snesImage.getPixelValues();
        const pixelValuesPerByte = 8 / bitDepth;

        const byteCount: number = bytesPerLine * snesImage.getHeight();
        const buffer: Buffer = Buffer.alloc(byteCount);

        let currentBufferOffset = 0;
        for (let lineY = 0; lineY < snesImage.getHeight(); ++lineY)
        {
            currentBufferOffset = bufferLine(
                snesImage,
                pixelValues,
                bitDepth,
                pixelValuesPerByte,
                buffer,
                currentBufferOffset,
                lineY);
        }

        return buffer;
    }

    function bufferLine(
        snesImage: SnesImage,
        pixelValues: number[],
        bitDepth: IndexedBitDepth,
        pixelValuesPerByte: number,
        buffer: Buffer,
        currentBufferOffset: number,
        lineY: number): number
    {
        const startIndex: number = getPixelValueIndex(snesImage, 0, lineY);
        const endIndex = startIndex + snesImage.getWidth();
        
        let byte = 0b0000_0000;
        let pixelValuesAddedToByte = 0;
        for (let i = startIndex; i < endIndex; ++i)
        {
            byte |= (pixelValues[i] ?? 0) << (8 - ((pixelValuesAddedToByte + 1) * bitDepth));
            ++pixelValuesAddedToByte;

            if (pixelValuesAddedToByte === pixelValuesPerByte)
            {
                buffer.writeUint8(byte, currentBufferOffset);
                ++currentBufferOffset;
                byte = 0b0000_0000;
                pixelValuesAddedToByte = 0;
            }
        }

        if (pixelValuesAddedToByte > 0)
        {
            buffer.writeUint8(byte, currentBufferOffset);
            ++currentBufferOffset;
        }

        return currentBufferOffset;
    }
}