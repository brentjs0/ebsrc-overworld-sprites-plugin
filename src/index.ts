import * as fs from 'fs-extra';
import * as path from 'path';

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
} from './extract';

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

const writtenPaths: string[] = [];

const api: PluginApi =
{
    project:
    {
        ebsrcPath: 'C:/Users/brent/source/repos/ebsrc-project/ebsrc',
        referencePath: 'C:/Users/brent/source/repos/ebsrc-project/reference',
    },
    async getSourceBin(path: string): Promise<Buffer>
    {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path));
    },
    async getSourceText(path: string): Promise<string>
    {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path), 'utf8');
    },
    async writeReference(path: string, contents: any): Promise<void>
    {
        const fullPath = joinPath(this.project.referencePath, path);
        writtenPaths.push(fullPath);

        return await fs.outputFile(fullPath, contents);
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

export type PluginApi =
{
    project:
    {
        ebsrcPath: string;
        referencePath: string;
    };
    getSourceBin(path: string): Promise<Buffer>;
    getSourceText(path: string): Promise<string>;
    writeReference(path: string, contents: any): Promise<void>;
};

extractReference(api);

module.exports =
{
    name: 'EbsrcOverworldSpritesPlugin',
    applyMod: async function (api: any) { },
    extractReference: extractReference,
};
