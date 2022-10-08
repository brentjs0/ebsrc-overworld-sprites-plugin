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
    export function create(red: number, green: number, blue: number, isTransparent: boolean = false): SnesColor
    {
        checkComponentArgument('red', red);
        checkComponentArgument('green', green);
        checkComponentArgument('blue', blue);

        const snesColor: any = {
            red: red,
            green: green,
            blue: blue,
            isTransparent: isTransparent,
            toRgbaColor: toRgbaColor
        };

        return snesColor;
    }

    export type Component =
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
        8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
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

    export function isSnesColor(value: any): value is SnesColor
    {
        return typeof value === 'object' &&
            isComponent(value.red) &&
            isComponent(value.green) &&
            isComponent(value.blue) &&
            toRgbaColor === toRgbaColor;
    }

    const eightBitValues: number[] = [
        0x00,
        0x01,
        0x03,
        0x06,
        0x0a,
        0x0f,
        0x15,
        0x1c,
        0x24,
        0x2d,
        0x37,
        0x42,
        0x4e,
        0x5b,
        0x69,
        0x78,
        0x88,
        0x90,
        0x98,
        0xa0,
        0xa8,
        0xb0,
        0xb8,
        0xc0,
        0xc8,
        0xd0,
        0xd8,
        0xe0,
        0xe8,
        0xf0,
        0xf8,
        0xff // 31 -> 255 (+7)
    ];

    function checkComponentArgument(parameterName: 'red' | 'green' | 'blue', value: number): value is Component
    {
        if (!isComponent(value))
        {
            throw new Error(`The value of "${parameterName}" must be an integer from 0 to 31.`);
        }

        return true;
    }

    function isComponent(value: any): value is Component
    {
        return Number.isInteger(value) && value >= 0 && value <= 31;
    }
}
