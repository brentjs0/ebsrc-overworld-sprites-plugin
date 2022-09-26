import * as fs from 'fs-extra';
import * as path from 'path';
import { PNG } from '@camoto/pngjs';

import { getPngPalette } from './apply-mod';

import { IncompleteSpriteGroup, SpriteGroup } from './data/sprite-group';
import { IncompleteSpriteGroupPalette, SpriteGroupPalette } from './data/sprite-group-palette';
import
{
    extractBank03,
    extractBanks11to15,
    extractPaletteBinaries,
    extractSpriteGroupBinaries,
    extractSpriteGroupingData,
    extractSpriteGroupingPointers,
} from './extract-reference';

const joinPath = path.join;

export const filePaths =
{
    spriteGroupingPointersASM: 'src/data/sprite_grouping_pointers.asm',
    spriteGroupingDataASM: 'src/data/sprite_grouping_data.asm',
    bank11ASM: 'src/bankconfig/US/bank11.asm',
    bank12ASM: 'src/bankconfig/US/bank12.asm',
    bank13ASM: 'src/bankconfig/US/bank13.asm',
    bank14ASM: 'src/bankconfig/US/bank14.asm',
    bank15ASM: 'src/bankconfig/US/bank15.asm',
    bank03ASM: 'src/bankconfig/US/bank03.asm',
    spriteGroupsYML: 'sprite_groups.yml',
    spriteGroupPalettesYML: 'sprite_group_palettes.yml',
    spriteGroupPalettesPNG: 'sprite_group_palettes.png',
    spriteGroupsDirectory: 'SpriteGroups/'
} as const;

const api: PluginApi =
{
    path: 'C:/Users/brent/source/repos/ebsrc-project/mod',
    project:
    {
        ebsrcPath: 'C:/Users/brent/source/repos/ebsrc-project/ebsrc',
        referencePath: 'C:/Users/brent/source/repos/ebsrc-project/reference',
        ebdestPath: 'C:/Users/brent/source/repos/ebsrc-project/ebdest'
    },
    async getModBin(path: string): Promise<Buffer>
    {
        return await fs.readFile(joinPath(this.path, path));
    },
    async getModText(path: string): Promise<string>
    {
        return await fs.readFile(joinPath(this.path, path), 'utf8');
    },
    async getSourceBin(path: string): Promise<Buffer>
    {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path));
    },
    async getSourceText(path: string): Promise<string>
    {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path), 'utf8');
    },
    async writeDest(path: string, contents: any): Promise<void>
    {
        return await fs.outputFile(joinPath(this.project.ebdestPath, path), contents);
    },
    async writeReference(path: string, contents: any): Promise<void>
    {
        return await fs.outputFile(joinPath(this.project.referencePath, path), contents);
    }
}

async function extractReference(api: PluginApi)
{
    const incompleteSpriteGroupPalettes: IncompleteSpriteGroupPalette[] = await extractBank03(api);
    const spriteGroupPalettes: SpriteGroupPalette[] = await extractPaletteBinaries(api, incompleteSpriteGroupPalettes);

    const spriteGroupingDataLabels: string[] = await extractSpriteGroupingPointers(api);
    const incompleteSpriteGroups: IncompleteSpriteGroup[] = await extractSpriteGroupingData(api, spriteGroupingDataLabels);
    const spriteGroups: SpriteGroup[] = await extractBanks11to15(api, incompleteSpriteGroups);

    await extractSpriteGroupBinaries(api, spriteGroups, spriteGroupPalettes);
}

async function applyMod(api: PluginApi)
{
    // await getPngPalette(PNG.sync.read(await api.getModBin('test-reference.png')));
    // await getPngPalette(PNG.sync.read(await api.getModBin('test-mspaint.png')));
    // await getPngPalette(PNG.sync.read(await api.getModBin('test-coilsnake.png')));
}

export type PluginApi =
{
    path: string;
    project:
    {
        ebsrcPath: string;
        referencePath: string;
        ebdestPath: string;
    };
    getModBin(path: string): Promise<Buffer>;
    getModText(path: string): Promise<string>;
    getSourceBin(path: string): Promise<Buffer>;
    getSourceText(path: string): Promise<string>;
    writeDest(path: string, contents: any): Promise<void>;
    writeReference(path: string, contents: any): Promise<void>;
};

extractReference(api);
//applyMod(api);

module.exports =
{
    name: 'EbsrcSpriteGroupsPlugin',
    applyMod: applyMod,
    extractReference: extractReference,
};
