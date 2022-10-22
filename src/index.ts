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

import PluginApi, { pluginName } from './mock-plugin-api';
import { importSpriteGroupPalettes } from './apply-mod';
import { project } from './mock-project';

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

const api: PluginApi = new PluginApi(project, pluginName, 'mod');
//extractReference(api);
applyMod(api);

// module.exports =
// {
//     name: 'EbsrcSpriteGroupsPlugin',
//     applyMod: applyMod,
//     extractReference: extractReference,
// };
