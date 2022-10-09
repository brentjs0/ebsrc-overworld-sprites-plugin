import { objectHasKey } from '../utility';
import { ColorScalingMethod, RgbaColor } from './rgba-color';

export type SnesColor =
{
    red: SnesColor.Component
    green: SnesColor.Component;
    blue: SnesColor.Component;
    isTransparent: boolean;
    toRgbaColor: (scalingMethod?: ColorScalingMethod) => RgbaColor;
};

export namespace SnesColor
{
    export function create(red: number, green: number, blue: number, isTransparent = false): SnesColor
    {
        if (checkComponentArgument('red', red) &&
            checkComponentArgument('green', green) &&
            checkComponentArgument('blue', blue))
        {
            const snesColor: SnesColor =
            {
                red: red,
                green: green,
                blue: blue,
                isTransparent: isTransparent,
                toRgbaColor: toRgbaColor
            };

            return snesColor;
        }

        throw new Error('An SnesColor object could not be created from the provided values.');
    }

    export type Component =
         0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |
         8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 |
        16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
        24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

    function toRgbaColor(this: SnesColor, scalingMethod: ColorScalingMethod = 'default')
    {
        if (scalingMethod === 'default')
        {
            return RgbaColor.create(
                eightBitValues[this.red],
                eightBitValues[this.green],
                eightBitValues[this.blue],
                this.isTransparent ? 0 : 255);
        }

        return RgbaColor.create(
            this.red << 3,
            this.green << 3,
            this.blue << 3,
            this.isTransparent ? 0 : 255);
    }

    export function isSnesColor(value: unknown): value is SnesColor
    {
        return typeof value === 'object' &&
            value !== null &&
            'red' in value &&
            objectHasKey(value, 'red') &&
            isComponent(value.red) &&
            objectHasKey(value, 'green') &&
            isComponent(value.green) &&
            objectHasKey(value, 'blue') &&
            isComponent(value.blue) &&
            toRgbaColor === toRgbaColor;
    }

    const eightBitValues: number[] =
    [
        0x00, //  0 ->   0
        0x01, //  1 ->   1 (+1)
        0x03, //  2 ->   3 (+2)
        0x06, //  3 ->   6 (+3)
        0x0a, //  4 ->  10 (+4)
        0x0f, //  5 ->  15 (+5)
        0x15, //  6 ->  21 (+6)
        0x1c, //  7 ->  28 (+7)
        0x24, //  8 ->  36 (+8)
        0x2d, //  9 ->  45 (+9)
        0x37, // 10 ->  55 (+10)
        0x42, // 11 ->  66 (+11)
        0x4e, // 12 ->  78 (+12)
        0x5b, // 13 ->  91 (+13)
        0x69, // 14 -> 105 (+14)
        0x78, // 15 -> 120 (+15)
        0x88, // 16 -> 136 (+16)
        0x90, // 17 -> 144 (+8)
        0x98, // 18 -> 152 (+8)
        0xa0, // 19 -> 160 (+8)
        0xa8, // 20 -> 168 (+8)
        0xb0, // 21 -> 176 (+8)
        0xb8, // 22 -> 184 (+8)
        0xc0, // 23 -> 192 (+8)
        0xc8, // 24 -> 200 (+8)
        0xd0, // 25 -> 208 (+8)
        0xd8, // 26 -> 216 (+8)
        0xe0, // 27 -> 224 (+8)
        0xe8, // 28 -> 232 (+8)
        0xf0, // 29 -> 240 (+8)
        0xf8, // 30 -> 248 (+8)
        0xff  // 31 -> 255 (+7)
    ];

    function checkComponentArgument(parameterName: 'red' | 'green' | 'blue', value: number): value is Component
    {
        if (!isComponent(value))
        {
            throw new Error(`The value of "${parameterName}" must be an integer from 0 to 31.`);
        }

        return true;
    }

    function isComponent(value: unknown): value is Component
    {
        return typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= 0 && 
            value <= 31;
    }
}
