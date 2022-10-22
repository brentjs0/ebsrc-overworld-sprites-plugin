import { expect } from 'chai';

import * as m from './apply-mod';
import { describeFunctionExport } from './test-helpers';
import PluginApi, { pluginName } from './mock-plugin-api';
import { project } from './mock-project';
import { SpriteGroupPalette } from './data/sprite-group-palette';
import { RgbaColor } from './data/rgba-color';
import { filePaths } from './plugin';
import { ColorScalingMethods } from './data/snes-color';

describe('apply-mod.ts', function ()
{
    describeFunctionExport<typeof m>('importSpriteGroupPalettes()', function ()
    {
        it(`Returns valid objects from a valid CoilSnake ${filePaths.spriteGroupPalettesYml} file.`, async function ()
        {
            const api = new PluginApi(project, pluginName, 'ebsrc-sprite-groups-plugin/src/test-assets/mod-coilsnake');
            const spriteGroupPalettes: SpriteGroupPalette[] = await m.importSpriteGroupPalettes(api);

            const expectation: SpriteGroupPalette[] = 
            [
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/0.pal',
                    'Palette':
                    [
                        RgbaColor(112, 112, 112, 255),
                        RgbaColor(248, 240, 240, 255),
                        RgbaColor(184, 200, 200, 255),
                        RgbaColor(152, 136, 152, 255),
                        RgbaColor(0, 176, 128, 255),
                        RgbaColor(0, 144, 112, 255),
                        RgbaColor(80, 112, 96, 255),
                        RgbaColor(168, 208, 240, 255),
                        RgbaColor(72, 152, 160, 255),
                        RgbaColor(88, 208, 216, 255),
                        RgbaColor(200, 0, 160, 255),
                        RgbaColor(120, 48, 80, 255),
                        RgbaColor(208, 176, 88, 255),
                        RgbaColor(184, 136, 0, 255),
                        RgbaColor(136, 112, 160, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/1.pal',
                    'Palette':
                    [
                        RgbaColor(168, 200, 128, 255),
                        RgbaColor(240, 240, 240, 255),
                        RgbaColor(208, 208, 208, 255),
                        RgbaColor(144, 160, 128, 255),
                        RgbaColor(0, 176, 128, 255),
                        RgbaColor(0, 144, 112, 255),
                        RgbaColor(96, 128, 104, 255),
                        RgbaColor(192, 176, 128, 255),
                        RgbaColor(192, 160, 104, 255),
                        RgbaColor(152, 120, 88, 255),
                        RgbaColor(240, 0, 96, 255),
                        RgbaColor(144, 0, 48, 255),
                        RgbaColor(224, 208, 32, 255),
                        RgbaColor(224, 152, 24, 255),
                        RgbaColor(80, 80, 200, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/2.pal',
                    'Palette':
                    [
                        RgbaColor(96, 152, 112, 255),
                        RgbaColor(240, 240, 240, 255),
                        RgbaColor(192, 192, 192, 255),
                        RgbaColor(152, 152, 152, 255),
                        RgbaColor(128, 128, 128, 255),
                        RgbaColor(80, 80, 80, 255),
                        RgbaColor(160, 192, 192, 255),
                        RgbaColor(104, 136, 136, 255),
                        RgbaColor(88, 112, 120, 255),
                        RgbaColor(56, 80, 80, 255),
                        RgbaColor(240, 0, 96, 255),
                        RgbaColor(144, 0, 48, 255),
                        RgbaColor(160, 136, 240, 255),
                        RgbaColor(112, 88, 224, 255),
                        RgbaColor(72, 40, 152, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/3.pal',
                    'Palette':
                    [
                        RgbaColor(216, 200, 80, 255),
                        RgbaColor(240, 240, 176, 255),
                        RgbaColor(192, 176, 128, 255),
                        RgbaColor(192, 160, 104, 255),
                        RgbaColor(152, 120, 88, 255),
                        RgbaColor(128, 96, 64, 255),
                        RgbaColor(80, 64, 40, 255),
                        RgbaColor(0, 176, 128, 255),
                        RgbaColor(0, 144, 112, 255),
                        RgbaColor(80, 112, 88, 255),
                        RgbaColor(240, 176, 144, 255),
                        RgbaColor(240, 144, 144, 255),
                        RgbaColor(240, 240, 240, 255),
                        RgbaColor(200, 200, 200, 255),
                        RgbaColor(240, 0, 96, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/4.pal',
                    'Palette':
                    [
                        RgbaColor(0, 0, 0, 255),
                        RgbaColor(192, 144, 120, 255),
                        RgbaColor(224, 176, 168, 255),
                        RgbaColor(144, 120, 104, 255),
                        RgbaColor(232, 200, 152, 255),
                        RgbaColor(208, 152, 72, 255),
                        RgbaColor(192, 136, 88, 255),
                        RgbaColor(168, 120, 32, 255),
                        RgbaColor(248, 200, 128, 255),
                        RgbaColor(248, 176, 128, 255),
                        RgbaColor(200, 136, 104, 255),
                        RgbaColor(168, 96, 64, 255),
                        RgbaColor(248, 232, 128, 255),
                        RgbaColor(168, 144, 88, 255),
                        RgbaColor(128, 128, 48, 255),
                        RgbaColor(64, 64, 64, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/5.pal',
                    'Palette':
                    [
                        RgbaColor(0, 176, 128, 255),
                        RgbaColor(240, 240, 240, 255),
                        RgbaColor(200, 200, 200, 255),
                        RgbaColor(144, 160, 128, 255),
                        RgbaColor(0, 176, 128, 255),
                        RgbaColor(0, 144, 112, 255),
                        RgbaColor(80, 112, 96, 255),
                        RgbaColor(240, 176, 144, 255),
                        RgbaColor(200, 152, 120, 255),
                        RgbaColor(240, 144, 144, 255),
                        RgbaColor(240, 0, 96, 255),
                        RgbaColor(144, 0, 48, 255),
                        RgbaColor(224, 208, 32, 255),
                        RgbaColor(240, 144, 0, 255),
                        RgbaColor(112, 112, 240, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/6.pal',
                    'Palette':
                    [
                        RgbaColor(144, 224, 128, 255),
                        RgbaColor(240, 240, 240, 255),
                        RgbaColor(200, 200, 200, 255),
                        RgbaColor(144, 160, 128, 255),
                        RgbaColor(0, 176, 128, 255),
                        RgbaColor(0, 144, 112, 255),
                        RgbaColor(80, 112, 96, 255),
                        RgbaColor(240, 176, 144, 255),
                        RgbaColor(200, 152, 120, 255),
                        RgbaColor(240, 144, 144, 255),
                        RgbaColor(240, 0, 96, 255),
                        RgbaColor(144, 0, 48, 255),
                        RgbaColor(224, 208, 32, 255),
                        RgbaColor(240, 144, 0, 255),
                        RgbaColor(112, 112, 240, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                },
                {
                    'Binary File Path': 'src/bin/US/overworld_sprites/7.pal',
                    'Palette':
                    [
                        RgbaColor(96, 104, 248, 255),
                        RgbaColor(240, 248, 248, 255),
                        RgbaColor(168, 168, 168, 255),
                        RgbaColor(136, 136, 136, 255),
                        RgbaColor(152, 120, 88, 255),
                        RgbaColor(240, 48, 64, 255),
                        RgbaColor(224, 208, 32, 255),
                        RgbaColor(240, 144, 0, 255),
                        RgbaColor(192, 128, 96, 255),
                        RgbaColor(0, 232, 128, 255),
                        RgbaColor(40, 160, 112, 255),
                        RgbaColor(80, 120, 96, 255),
                        RgbaColor(240, 240, 208, 255),
                        RgbaColor(192, 208, 152, 255),
                        RgbaColor(144, 152, 96, 255),
                        RgbaColor(48, 32, 32, 255)
                    ].map(rgba => rgba.toSnesColor(ColorScalingMethods.CoilSnake))
                }
            ];

            expect(spriteGroupPalettes).to.eql(expectation);
        });
    });
});