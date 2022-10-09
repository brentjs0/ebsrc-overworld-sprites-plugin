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
} from './extract-reference';

const joinPath = path.join;

export const referenceYmlHeader = '# File Format: ebsrc-sprite-groups-plugin v1.0.0';

export const filePaths =
{
    spriteGroupingPointersAsm: 'src/data/sprite_grouping_pointers.asm',
    spriteGroupingDataAsm: 'src/data/sprite_grouping_data.asm',
    bank11Asm: 'src/bankconfig/US/bank11.asm',
    bank12Asm: 'src/bankconfig/US/bank12.asm',
    bank13Asm: 'src/bankconfig/US/bank13.asm',
    bank14Asm: 'src/bankconfig/US/bank14.asm',
    bank15Asm: 'src/bankconfig/US/bank15.asm',
    bank03Asm: 'src/bankconfig/US/bank03.asm',
    spriteGroupsYml: 'sprite_groups.yml',
    spriteGroupPalettesYml: 'sprite_group_palettes.yml',
    spriteGroupPalettesPng: 'sprite_group_palettes.png',
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
    /* eslint-disable @typescript-eslint/no-explicit-any */
    async writeDest(path: string, contents: any): Promise<void>
    {
        return await fs.outputFile(joinPath(this.project.ebdestPath, path), contents);
    },
    async writeReference(path: string, contents: any): Promise<void>
    {
        return await fs.outputFile(joinPath(this.project.referencePath, path), contents);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
};

async function extractReference(api: PluginApi)
{
    const incompleteSpriteGroupPalettes: IncompleteSpriteGroupPalette[] = await extractBank03(api);
    const spriteGroupPalettes: SpriteGroupPalette[] = await extractPaletteBinaries(api, incompleteSpriteGroupPalettes);

    const spriteGroupingDataLabels: string[] = await extractSpriteGroupingPointers(api);
    const incompleteSpriteGroups: IncompleteSpriteGroup[] = await extractSpriteGroupingData(api, spriteGroupingDataLabels);
    const spriteGroups: SpriteGroup[] = await extractBanks11to15(api, incompleteSpriteGroups);

    await extractSpriteGroupBinaries(api, spriteGroups, spriteGroupPalettes);
}

// async function applyMod(api: PluginApi)
// {
//     // await getPngPalette(PNG.sync.read(await api.getModBin('test-reference.png')));
//     // await getPngPalette(PNG.sync.read(await api.getModBin('test-mspaint.png')));
//     // await getPngPalette(PNG.sync.read(await api.getModBin('test-coilsnake.png')));
// }

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
    /* eslint-disable @typescript-eslint/no-explicit-any */
    writeDest(path: string, contents: any): Promise<void>;
    writeReference(path: string, contents: any): Promise<void>;
    /* eslint-enable @typescript-eslint/no-explicit-any */
};

extractReference(api);
//applyMod(api);

module.exports =
{
    name: 'EbsrcSpriteGroupsPlugin',
    //applyMod: applyMod,
    extractReference: extractReference,
};
