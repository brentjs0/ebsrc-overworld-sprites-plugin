import { SnesColor } from './snes-color';

export type ColorScalingMethod = 'default' | 'CoilSnake';

export type RgbaColor =
{
    red: number;
    green: number;
    blue: number;
    alpha: number;
    toSnesColor: (scalingMethod?: ColorScalingMethod) => SnesColor;
};

export namespace RgbaColor
{
    export function create(red: number, green: number, blue: number, alpha: number): RgbaColor
    {
        checkComponentArgument('red', red);
        checkComponentArgument('green', green);
        checkComponentArgument('blue', blue);
        checkComponentArgument('alpha', alpha);

        const rgbaColor: any =
        {
            red: red,
            green: green,
            blue: blue,
            alpha: alpha,
            toSnesColor: toSnesColor
        }

        return rgbaColor;
    }

    function toSnesColor(this: RgbaColor, scalingMethod: ColorScalingMethod = 'default')
    {
        if (scalingMethod === 'default')
        {
            return SnesColor.create(
                fiveBitValues[this.red],
                fiveBitValues[this.green],
                fiveBitValues[this.blue],
                this.alpha === 0)
        }

        return SnesColor.create(
            this.red >>> 3,
            this.green >>> 3,
            this.blue >>> 3,
            this.alpha === 0);
    }

    const fiveBitValues: number[] =
    [
        0, 
        1, 1, 
        2, 2, 
        3, 3, 3, 3, 
        4, 4, 4, 4, 
        5, 5, 5, 5, 5, 5, 
        6, 6, 6, 6, 6, 6, 
        7, 7, 7, 7, 7, 7, 7, 7, 
        8, 8, 8, 8, 8, 8, 8, 8, 
        9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 
        10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 
        11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 
        12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 
        13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 
        14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 
        15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 
        16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 
        17, 17, 17, 17, 17, 17, 17, 17, 
        18, 18, 18, 18, 18, 18, 18, 18, 
        19, 19, 19, 19, 19, 19, 19, 19, 
        20, 20, 20, 20, 20, 20, 20, 20, 
        21, 21, 21, 21, 21, 21, 21, 21, 
        22, 22, 22, 22, 22, 22, 22, 22, 
        23, 23, 23, 23, 23, 23, 23, 23, 
        24, 24, 24, 24, 24, 24, 24, 24, 
        25, 25, 25, 25, 25, 25, 25, 25, 
        26, 26, 26, 26, 26, 26, 26, 26, 
        27, 27, 27, 27, 27, 27, 27, 27, 
        28, 28, 28, 28, 28, 28, 28, 28, 
        29, 29, 29, 29, 29, 29, 29, 29, 
        30, 30, 30, 30, 30, 30, 30, 
        31, 31, 31, 31
    ];

    function checkComponentArgument(parameterName: 'red' | 'green' | 'blue' | 'alpha', value: number): boolean
    {
        if (!isValidComponent(value))
        {
            throw new Error(`The value of "${parameterName}" must be an integer from 0 to 255.`);
        }

        return true;
    }
  
    function isValidComponent(value: number): boolean
    {
        return Number.isInteger(value) && value >= 0 && value <= 255;
    }
}