export type Color15 =
{
    red: Color15.Component
    green: Color15.Component;
    blue: Color15.Component;
    toColor24: () => Color24;
};

export namespace Color15
{
    export function create(red: number, green: number, blue: number): Color15
    {
        checkComponentArgument('red', red);
        checkComponentArgument('green', green);
        checkComponentArgument('blue', blue);

        const color15: any =
        {
            red: red,
            green: green,
            blue: blue,
            toColor24: toColor24
        }

        return color15;
    }
    
    export type Component =
         0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |
         8 |  9 | 10 | 11 | 12 | 13 | 14 | 15 |
        16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
        24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

    function toColor24(this: Color15)
    {
        return Color24.create(
            eightBitValues[this.red],
            eightBitValues[this.green],
            eightBitValues[this.blue]);
    }

    export function isColor15(value: any): value is Color15
    {
        return typeof value === 'object' &&
            isComponent(value.red) &&
            isComponent(value.green) &&
            isComponent(value.blue) &&
            toColor24 === toColor24;
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

    function isComponent(value: any): value is Component
    {
        return Number.isInteger(value) && value >= 0 && value <= 31;
    }
}

export type Color24 =
{
    red: number;
    green: number;
    blue: number;
    
    toColor15: () => Color15;
};

export namespace Color24
{
    export function create(red: number, green: number, blue: number): Color24
    {
        checkComponentArgument('red', red);
        checkComponentArgument('green', green);
        checkComponentArgument('blue', blue);

        const color24: any =
        {
            red: red,
            green: green,
            blue: blue,
            toColor15: toColor15
        }

        return color24;
    }

    function toColor15(this: Color15)
    {
        return Color15.create(
            fiveBitValues[this.red],
            fiveBitValues[this.green],
            fiveBitValues[this.blue]);
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

      function checkComponentArgument(parameterName: 'red' | 'green' | 'blue', value: number): boolean
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