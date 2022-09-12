import { createPNG } from 'indexed-png';
import { Color15, Color24 } from './data/color';

const pngPaletteSymbol: unique symbol = Symbol();
const pngDataSymbol: unique symbol = Symbol();
const widthSymbol: unique symbol = Symbol();
const heightSymbol: unique symbol = Symbol();

export type IndexedPng =
{
    [pngPaletteSymbol]: number[];
    [pngDataSymbol]: number[];
    [widthSymbol]: number;
    [heightSymbol]: number;
    getPaletteColor: (index: number, color15: Color15) => Color15 | undefined;
    setPaletteColor: (index: number, color15: Color15) => void;
    getPaletteColorIndex: (color15: Color15) => number;
    setPixelIndex: (x: number, y: number, colorIndex: number) => void;
    setPixelColor: (x: number, y: number, color15: Color15) => void;
    fillWithIndex: (colorIndex: number) => void;
    fillWithColor: (color15: Color15) => void;
    toBuffer: () => Promise<Buffer>;
}

export namespace IndexedPng
{
    export function create(width: number, height: number, palette: Color15[] | undefined = undefined)
    {
        const indexedPng: IndexedPng = 
        {
            [pngPaletteSymbol]: palette?.map(c => convertColor15ToPngColor(c)) ?? [],
            [pngDataSymbol]: Array(width * height),
            [widthSymbol]: width,
            [heightSymbol]: height,
            getPaletteColor: getPaletteColor,
            setPaletteColor: setPaletteColor,
            getPaletteColorIndex: getPaletteColorIndex,
            setPixelIndex: setPixelIndex,
            setPixelColor: setPixelColor,
            fillWithIndex: fillWithIndex,
            fillWithColor: fillWithColor,
            toBuffer: toBuffer
        };
        
        return indexedPng;
    }

    function getPaletteColor(this: IndexedPng, index: number, color15: Color15): Color15 | undefined
    {
        const pngColor: number | undefined = this[pngPaletteSymbol][index];
        if (pngColor !== undefined)
        {
            return convertPngColorToColor15(pngColor);
        }
        
        return undefined;
    }

    function setPaletteColor(this: IndexedPng, index: number, color15: Color15)
    {
        this[pngPaletteSymbol][index] = convertColor15ToPngColor(color15);
    }

    function getPaletteColorIndex(this: IndexedPng, color15: Color15): number
    {
        const pngColor = convertColor15ToPngColor(color15);
        const pngPalette = this[pngPaletteSymbol];

        return pngPalette.indexOf(pngColor);
    }

    function setPixelIndex(this: IndexedPng, x: number, y: number, colorIndex: number)
    {
        checkPixelCoordinateArguments(this, x, y);
        const dataIndex = getDataIndex(this, x, y);
        this[pngDataSymbol][dataIndex] = colorIndex;
    }

    function setPixelColor(this: IndexedPng, x: number, y: number, color15: Color15)
    {
        checkPixelCoordinateArguments(this, x, y);
        const dataIndex = getDataIndex(this, x, y);
        const colorIndex = this.getPaletteColorIndex(color15);
        if (colorIndex === -1)
        {
            throw new Error('The value of "color15" must be a color currently in the palette.');
        }
        this[pngDataSymbol][dataIndex] = colorIndex;
    }

    function fillWithIndex(this: IndexedPng, colorIndex: number)
    {
        this[pngDataSymbol].fill(colorIndex);
    }

    function fillWithColor(this: IndexedPng, color15: Color15)
    {
        const colorIndex = this.getPaletteColorIndex(color15);
        if (colorIndex === -1)
        {
            throw new Error('The value of "color15" must be a color currently in the palette.');
        }
        this[pngDataSymbol].fill(colorIndex);
    }

    async function toBuffer(this: IndexedPng): Promise<Buffer>
    {
        return createPNG(Buffer.from(this[pngDataSymbol]), this[pngPaletteSymbol], [0], this[widthSymbol]);
    }

    function getDataIndex(indexedPng: IndexedPng, x: number, y: number)
    {
        return (indexedPng[widthSymbol] * y) + x;
    }

    function checkPixelCoordinateArguments(indexedPng: IndexedPng, x: number, y: number)
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

    function convertPngColorToColor15(pngColor: number): Color15
    {
        const color24 = Color24.create(
            pngColor >>> 16,
            (pngColor & 0b0000_0000_1111_1111_0000_0000) >>> 8,
            (pngColor & 0b0000_0000_0000_0000_1111_1111));
        
        return color24.toColor15();
    }

    function convertColor15ToPngColor(color15: Color15): number
    {
        const color24 = color15.toColor24();
        return (color24.red << 16) | (color24.green << 8) | color24.blue ;
    }
}