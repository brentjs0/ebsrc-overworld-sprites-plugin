import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

import { extractBank11, extractSpriteGroupingData, extractSpriteGroupingPointers, extractSpriteGroupPalettePNGFromBinaries as extractPaletteBinaries, extractSpriteGroupPalettesFromBank03 } from './extract';
import { spriteKeyDisplayOrder } from './sprite';
import { SpriteGroupPalette, spriteGroupPaletteKeyDisplayOrder } from './sprite-group-palette';
import { IncompleteSpriteGroup, SpriteGroup, spriteGroupKeyDisplayOrder } from './sprite-group';
import { dumpArrayAsYAMLWithNumericKeys } from './utility';

const joinPath = path.join;

export const filePaths =
{
    spriteGroupingPointersASM: 'src/data/sprite_grouping_pointers.asm',
    spriteGroupingDataASM: 'src/data/sprite_grouping_data.asm',
    bank11ASM: 'src/bankconfig/US/bank11.asm',
    bank03ASM: 'src/bankconfig/US/bank03.asm',
    spriteGroupsYML: 'sprite_groups.yml',
    spriteGroupPalettesYML: 'sprite_group_palettes.yml',
    spriteGroupPalettesPNG: 'sprite_group_palettes.png',
    spriteGroupsDirectory: 'SpriteGroups/'
} as const;

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
        return await fs.outputFile(joinPath(this.project.referencePath, path), contents);
    }
}

async function extractReference(api: PluginApi)
{
    const spriteGroupingDataLabels: string[] = await extractSpriteGroupingPointers(api);
    const incompleteSpriteGroups: IncompleteSpriteGroup[] = await extractSpriteGroupingData(api, spriteGroupingDataLabels);

    const palettes: SpriteGroupPalette[] = await extractSpriteGroupPalettesFromBank03(api);
    api.writeReference(filePaths.spriteGroupPalettesYML, dumpArrayAsYAMLWithNumericKeys(palettes, { sortKeys: sortYAMLKeys }));
    await extractPaletteBinaries(api, palettes);

    const spriteGroups: SpriteGroup[] = await extractBank11(api, incompleteSpriteGroups);
    api.writeReference(filePaths.spriteGroupsYML, dumpArrayAsYAMLWithNumericKeys(spriteGroups, { sortKeys: sortYAMLKeys }));
    
}

function sortYAMLKeys(key1: any, key2: any): number
{
    if (typeof key1 !== 'string' || typeof key2 !== 'string')
    {
        return 0;
    }

    const keyOrderLists =
    [
        spriteGroupKeyDisplayOrder as string[],
        spriteKeyDisplayOrder as string[],
        spriteGroupPaletteKeyDisplayOrder as string[],
    ];

    for (const keyOrderList of keyOrderLists)
    {
        if (keyOrderList.includes(key1) && keyOrderList.includes(key2))
        {
            return keyOrderList.indexOf(key1) - keyOrderList.indexOf(key2) ;
        }
    }

    return 0;
}

function replacer(key: string, value: any): any
{
    if (Array.isArray(value) || typeof value === 'object')
    {
        return value;
    }

    return `${value} # comment`;
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
