import { expect } from 'chai';
import getPixels from 'get-pixels';
import { promisify } from 'util';

import { SnesColor } from './data/snes-color';
import { SnesImage } from './snes-image';

const getPixelsPromise = promisify(getPixels);

describe('snes-image', function ()
{
    describe('SnesImage()', function ()
    {
        it('Sets the width, height, and palette.', function ()
        {
            const paletteArgument: SnesColor[] = 
            [
                SnesColor(1, 2, 3),
                SnesColor(4, 5, 6),
                SnesColor(7, 8, 9)
            ];

            const snesImage = SnesImage(5, 10, [...paletteArgument]);
            expect(snesImage.getWidth()).to.equal(5);
            expect(snesImage.getHeight()).to.equal(10);
            expect(snesImage.palette).to.eql(paletteArgument);

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
                const snesImage = SnesImage(width, height);
                expect(snesImage.getPixelValues().some(v => v !== 0)).to.be.false;
                expect(snesImage.getPixelValues().length).to.equal(width * height);
            }
        });
    });

    describe('SnesImage.setPixelValue()', function ()
    {
        it('Sets the correct value in the correct location.', function ()
        {
            const snesImage: SnesImage = SnesImage(3, 3, [SnesColor(0, 0, 0), SnesColor(31, 31, 31)]);
            snesImage.setPixelValue(1, 1, 1);

            expect(snesImage.getPixelValues()).to.eql(
                [
                    0, 0, 0,
                    0, 1, 0,
                    0, 0, 0
                ]);
        });

        it('Throws an error when coordinates are out of bounds.', function ()
        {
            const snesImage: SnesImage = SnesImage(3, 3, [SnesColor(0, 0, 0), SnesColor(31, 31, 31)]);
            expect(() => snesImage.setPixelValue(1, 3, 1)).to.throw();
            expect(() => snesImage.setPixelValue(4, 1, 1)).to.throw();
        });

        it('Throws an error when coordinates are not integers.', function ()
        {
            const snesImage: SnesImage = SnesImage(10, 10, [SnesColor(0, 0, 0), SnesColor(31, 31, 31)]);
            expect(() => snesImage.setPixelValue(1, 5.6, 1)).to.throw();
            expect(() => snesImage.setPixelValue(4.1, 1, 1)).to.throw();
        });
    });

    describe('SnesImage.fill()', function ()
    {
        it('Sets every pixel with the specified value.', function ()
        {
            const snesImage: SnesImage = SnesImage(10, 10, [SnesColor(0, 0, 0), SnesColor(31, 31, 31)]);
            snesImage.fill(1);

            expect(snesImage.getPixelValues().some(v => v !== 1)).to.be.false;
        });
    });

    describe('SnesImage.getPaletteColorIndex()', function ()
    {
        const snesImage: SnesImage = SnesImage(
            1,
            1,
            [
                SnesColor(0, 0, 0),
                SnesColor(1, 1, 1),
                SnesColor(2, 2, 2),
                SnesColor(3, 3, 3),
                SnesColor(4, 4, 4),
                SnesColor(5, 5, 5),
                SnesColor(6, 6, 6),
                SnesColor(7, 7, 7),
                SnesColor(8, 8, 8),
                SnesColor(9, 9, 9),
                SnesColor(10, 10, 10),
                SnesColor(11, 11, 11),
                SnesColor(12, 12, 12),
                SnesColor(13, 13, 13),
                SnesColor(14, 14, 14),
                SnesColor(15, 15, 15)
            ]);

        it('Returns the correct index when the color is present.', function ()
        {
            for (let i = 0; i < snesImage.palette.length; ++i)
            {
                expect(snesImage.getPaletteColorIndex(SnesColor(i, i, i))).to.equal(i);
            }
        });

        it('Returns -1 when the color is not present.', function ()
        {
            for (let i = 0; i < snesImage.palette.length; ++i)
            {
                expect(snesImage.getPaletteColorIndex(SnesColor(1, 2, 3))).to.equal(-1);
            }
        });
    });

    describe('SnesImage.toPngBuffer()', function ()
    {
        it('Creates a readable PNG buffer containing correct pixel data.', async function ()
        {
            const snesImage: SnesImage = SnesImage(3, 3, [SnesColor(0, 0, 0, true), SnesColor(31, 31, 31)]);
            snesImage.fill(1);
            snesImage.setPixelValue(1, 1, 0);

            const pixelData: Uint8Array = (await getPixelsPromise(await snesImage.toPngBuffer(), 'image/png')).data;
            expect([...pixelData]).to.eql(
                [
                    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
                    0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF,
                    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
                ]);
        });

        it('Creates a readable PNG buffer without transparency.', async function ()
        {
            const snesImage: SnesImage = SnesImage(5, 5, [SnesColor(7, 7, 7, false)]);

            snesImage.fill(0);

            const pixelData: Uint8Array = (await getPixelsPromise(await snesImage.toPngBuffer(), 'image/png')).data;
            for (let i = 3; i < pixelData.length; i += 4)
            {
                expect(pixelData[i]).to.equal(0xFF);
            }
        });

        it('Creates a readable PNG buffer with pixels that have the correct transparency.', async function ()
        {
            const snesImage: SnesImage = SnesImage(
                8,
                1,
                [
                    SnesColor(7, 7, 7, true), 
                    SnesColor(6, 6, 6, false),
                    SnesColor(5, 5, 5, true),
                    SnesColor(4, 4, 4, false),
                    SnesColor(3, 3, 3, true),
                    SnesColor(2, 2, 2, false),
                    SnesColor(1, 1, 1, true),
                    SnesColor(0, 0, 0, false),
                ]);

            for (let i = 0; i < snesImage.palette.length; ++i)
            {
                snesImage.setPixelValue(i, 0, i);
            }

            const pixelData: Uint8Array = (await getPixelsPromise(await snesImage.toPngBuffer(), 'image/png')).data;
            for (let i = 0; i < snesImage.palette.length; ++i)
            {
                expect(pixelData[(i * 4) + 3]).to.equal(i % 2 === 0 ? 0x00 : 0xFF);
            }
        });
    });
});