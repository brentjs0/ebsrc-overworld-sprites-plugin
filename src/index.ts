import * as fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

import { extractBank11, extractSpriteGroupingData, extractSpriteGroupingPointers } from './extract';
import { spriteKeyDisplayOrder } from './sprite';
import { IncompleteSpriteGrouping, spriteGroupingKeyDisplayOrder } from './sprite-grouping';

const joinPath = path.join;

export const filePaths = {
    sourceSpriteGroupingPointers: 'src/data/sprite_grouping_pointers.asm',
    sourceSpriteGroupingData: 'src/data/sprite_grouping_data.asm',
    sourceSpriteBinaryDataDefault: 'src/bankconfig/US/bank11.asm',
    sourceSpriteGroupPaletteDataDefault: 'src/bankconfig/US/bank03.asm',
    referenceSpriteGroupings: 'overworld_sprites/sprite_groupings.yml',
    referenceSpriteGraphics: 'overworld_sprites/'
} as const;

const api: PluginApi =
{
    project: {
        ebsrcPath: 'C:/Users/brent/source/repos/ebsrc-project/ebsrc',
        referencePath: 'C:/Users/brent/source/repos/ebsrc-project/reference',
    },

    async getSourceBin(path: string): Promise<Buffer> {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path));
    },

    async getSourceText(path: string): Promise<string> {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path), 'utf8');
    },

    async writeReference(path: string, contents: any): Promise<void> {
        return await fs.outputFile(joinPath(this.project.referencePath, path), contents);
    }
}

async function extractReference(api: PluginApi) {
    const spriteGroupingDataLabels: string[] = await extractSpriteGroupingPointers(api);
    const incompleteSpriteGroupings: IncompleteSpriteGrouping[] = await extractSpriteGroupingData(api, spriteGroupingDataLabels);
    const spriteGroupings = await extractBank11(api, incompleteSpriteGroupings);
    api.writeReference(filePaths.referenceSpriteGroupings, jsYaml.dump(spriteGroupings, {sortKeys: sortYAMLKeys}));
}

function sortYAMLKeys(key1: any, key2: any): number {
    if (typeof key1 !== 'string' || typeof key2 !== 'string') {
        return 0;
    }

    const keyOrderLists = [
        spriteGroupingKeyDisplayOrder as string[],
        spriteKeyDisplayOrder as string[]
    ];

    for (const keyOrderList of keyOrderLists) {
        if (keyOrderList.includes(key1) && keyOrderList.includes(key2)) {
            return keyOrderList.indexOf(key1) - keyOrderList.indexOf(key2) ;
        }
    }

    return 0;
}

export type PluginApi = {
    project: {
        ebsrcPath: string;
        referencePath: string;
    };
    getSourceBin(path: string): Promise<Buffer>;
    getSourceText(path: string): Promise<string>;
    writeReference(path: string, contents: any): Promise<void>;
};

extractReference(api);

module.exports = {
    name: 'EbsrcSpriteGroupingPlugin',
    applyMod: async function (api: any) { },
    extractReference: extractReference,
};
