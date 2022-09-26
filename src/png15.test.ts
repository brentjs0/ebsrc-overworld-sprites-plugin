import { expect } from 'chai';
import getPixels from 'get-pixels';
import { promisify } from 'util';

import { Color15 } from './data/color';
import { Png15 } from './png15';

const getPixelsPromise = promisify(getPixels);

describe('Png15', function ()
{
    describe('create()', function ()
    {
        it('Sets the width, height, and palette.', function ()
        {
            const paletteArgument: Color15[] = 
            [
                Color15.create(1, 2, 3),
                Color15.create(4, 5, 6),
                Color15.create(7, 8, 9)
            ];

            const png15 = Png15.create(5, 10, [...paletteArgument]);
            expect(png15.getWidth()).to.equal(5);
            expect(png15.getHeight()).to.equal(10);
            expect(png15.palette).to.eql(paletteArgument);

        });

        it('Pre-fills pixel values with width × height zeroes.', function ()
        {
            const dimensions = 
            [
                [1, 1],
                [5, 1],
                [7, 9],
                [4, 19]
            ];

            for (const [width, height] of dimensions)
            {
                const png15 = Png15.create(width, height);
                expect(png15.getPixelValues().some(v => v !== 0)).to.be.false;
                expect(png15.getPixelValues().length).to.equal(width * height);
            }
        });
    });

    describe('setPixelValue()', function ()
    {
        it('Sets the correct value in the correct location.', function ()
        {
            const png15: Png15 = Png15.create(3, 3, [Color15.create(0, 0, 0), Color15.create(31, 31, 31)]);
            png15.setPixelValue(1, 1, 1);

            expect(png15.getPixelValues()).to.eql(
            [
                0, 0, 0,
                0, 1, 0,
                0, 0, 0
            ])
        });

        it('Throws an error when coordinates are out of bounds.', function ()
        {
            const png15: Png15 = Png15.create(3, 3, [Color15.create(0, 0, 0), Color15.create(31, 31, 31)]);
            expect(() => png15.setPixelValue(1, 3, 1)).to.throw();
            expect(() => png15.setPixelValue(4, 1, 1)).to.throw();
        });

        it('Throws an error when coordinates are not integers.', function ()
        {
            const png15: Png15 = Png15.create(10, 10, [Color15.create(0, 0, 0), Color15.create(31, 31, 31)]);
            expect(() => png15.setPixelValue(1, 5.6, 1)).to.throw();
            expect(() => png15.setPixelValue(4.1, 1, 1)).to.throw();
        });
    })

    describe('fill()', function ()
    {
        it('Sets every pixel with the specified value.', function ()
        {
            const png15: Png15 = Png15.create(10, 10, [Color15.create(0, 0, 0), Color15.create(31, 31, 31)]);
            png15.fill(1);

            expect(png15.getPixelValues().some(v => v !== 1)).to.be.false;
        });
    })

    describe('getPaletteColorIndex()', function ()
    {
        const png15: Png15 = Png15.create(1, 1,
        [
           Color15.create(0, 0, 0),
           Color15.create(1, 1, 1),
           Color15.create(2, 2, 2),
           Color15.create(3, 3, 3),
           Color15.create(4, 4, 4),
           Color15.create(5, 5, 5),
           Color15.create(6, 6, 6),
           Color15.create(7, 7, 7),
           Color15.create(8, 8, 8),
           Color15.create(9, 9, 9),
           Color15.create(10, 10, 10),
           Color15.create(11, 11, 11),
           Color15.create(12, 12, 12),
           Color15.create(13, 13, 13),
           Color15.create(14, 14, 14),
           Color15.create(15, 15, 15)
        ]);

        it('Returns the correct index when the color is present.', function ()
        {
            for (let i = 0; i < png15.palette.length; ++i)
            {
                expect(png15.getPaletteColorIndex(Color15.create(i, i, i))).to.equal(i);
            }
        });

        it('Returns -1 when the color is not present.', function ()
        {
            for (let i = 0; i < png15.palette.length; ++i)
            {
                expect(png15.getPaletteColorIndex(Color15.create(1, 2, 3))).to.equal(-1);
            }
        });
    });

    describe('toBuffer()', function ()
    {
        it('Creates a readable PNG buffer containing correct pixel data.', async function ()
        {
            const png15: Png15 = Png15.create(3, 3, [Color15.create(0, 0, 0, true), Color15.create(31, 31, 31)]);
            png15.fill(1);
            png15.setPixelValue(1, 1, 0);

            const pixelData: Uint8Array = (await getPixelsPromise(await png15.toBuffer(), 'image/png')).data;
            expect([...pixelData]).to.eql(
            [
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF,
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
            ]);
        });

        it('Creates a readable PNG buffer without transparency.', async function ()
        {
            const png15: Png15 = Png15.create(5, 5,
            [
                Color15.create(7, 7, 7, false),
            ]);

            png15.fill(0);

            const pixelData: Uint8Array = (await getPixelsPromise(await png15.toBuffer(), 'image/png')).data;
            for (let i = 3; i < pixelData.length; i += 4)
            {
                expect(pixelData[i]).to.equal(0xFF);
            }
        })

        it('Creates a readable PNG buffer with pixels that have the correct transparency.', async function ()
        {
            const png15: Png15 = Png15.create(8, 1,
            [
                Color15.create(7, 7, 7, true), 
                Color15.create(6, 6, 6, false),
                Color15.create(5, 5, 5, true),
                Color15.create(4, 4, 4, false),
                Color15.create(3, 3, 3, true),
                Color15.create(2, 2, 2, false),
                Color15.create(1, 1, 1, true),
                Color15.create(0, 0, 0, false),
            ]);

            for (let i = 0; i < png15.palette.length; ++i)
            {
                png15.setPixelValue(i, 0, i);
            }

            const pixelData: Uint8Array = (await getPixelsPromise(await png15.toBuffer(), 'image/png')).data;
            for (let i = 0; i < png15.palette.length; ++i)
            {
                expect(pixelData[(i * 4) + 3]).to.equal(i % 2 === 0 ? 0x00 : 0xFF)
            }
        })
    });
});