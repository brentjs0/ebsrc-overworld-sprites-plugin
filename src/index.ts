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

import { listDir } from './utility';

import PluginApi, { Project } from './mock-plugin-api';
import { importSpriteGroupPalettes } from './apply-mod';

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


async function getEbsrcListing(): Promise<string[]>
{
    return listDir('C:/Users/brent/source/repos/ebsrc-project/ebsrc');
}

const project: Project = 
{
    path: 'C:/Users/brent/source/repos/ebsrc-project',
    ebsrcPath: 'C:/Users/brent/source/repos/ebsrc-project/ebsrc',
    ebsrcListing: getEbsrcListing(),
    referencePath: 'C:/Users/brent/source/repos/ebsrc-project/reference',
    ebdestPath: 'C:/Users/brent/source/repos/ebsrc-project/ebdest'
};

const api: PluginApi = new PluginApi(project, 'EbsrcSpriteGroupsPlugin', 'mod');

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
    const sgps = await importSpriteGroupPalettes(api);
}

//extractReference(api);
applyMod(api);

module.exports =
{
    name: 'EbsrcSpriteGroupsPlugin',
    applyMod: applyMod,
    extractReference: extractReference,
};
