export type Color =
{
    red: number
    green: number;
    blue: number
}

export namespace Color
{
    const eightBitValuesByFiveBitValue: number[] =
    [
          0,   8,  16,  24,  32,  40,  48,  56, 
         64,  72,  80,  88,  96, 104, 112, 120, 
        128, 136, 144, 152, 160, 168, 176, 184,
        192, 200, 208, 216, 224, 232, 240, 248
    ];

    export function convertComponentTo8Bit(fiveBitColorComponent: number): number
    {
        if (fiveBitColorComponent < 0 || fiveBitColorComponent > 31)
        {
            throw new Error('A 5-bit color component value must be a number from 0 to 31.');
        }

        return eightBitValuesByFiveBitValue[fiveBitColorComponent];
    }

    const fiveBitValuesByEightBitValue: number[] =
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

      export function convertComponentTo5Bit(eightBitColorComponent: number): number
      {
          if (eightBitColorComponent < 0 || eightBitColorComponent > 255)
          {
              throw new Error('An 8-bit color component value must be a number from 0 to 255.');
          }
  
          return fiveBitValuesByEightBitValue[eightBitColorComponent];
      }
}