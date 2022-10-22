// An instance of PluginApi (below) is provided to all javascript plugins
import * as fs from 'fs-extra';
import { join as joinPath } from 'path';
import { Project } from './mock-project';
import * as utils from './utility';

// Filters files with optional prefix and suffix
function filterFiles(list: string[], prefix: string | undefined, suffix: string | undefined): string[]
{
    if (prefix !== undefined)
    {
        list = list.filter(item => item.startsWith(prefix));
    }
    if (suffix !== undefined)
    {
        list = list.filter(item => item.endsWith(suffix));
    }

    return list;
}

export const pluginName = 'EbsrcSpriteGroupsPlugin';

// Note throughout: all files paths, relative to either the mod folder or the
// ebsrc folder, as appropriate.
export default class PluginApi
{
    project: Project;

    mod: string | undefined;
    name: string;
    path: string;
    modFolderListing: Promise<string[]>;

    // Constructs the plugin writer.
    // project: project object ref
    // pluginName: the name of this plugin
    // mod: path to the mod. Will be undefined if this is in reference mode
    constructor(project: Project, pluginName: string, mod: string | undefined)
    {
        this.project = project;
        this.name = mod !== undefined ? mod + ':' + pluginName : pluginName;

        if (mod === undefined)
        {
            throw new Error('mod not provided to PluginApi constructor.');
        }

        this.mod = mod;
        this.path = joinPath(project.path, mod);
        // project already has a full listing of ebsrc, but make one of mod too
        // Note that this is a promise.
        this.modFolderListing = utils.listDir(this.path);
    }
  
    // Returns a list of all files in the mod folder.
    // If prefix is specified, limits to files with that prefix.
    // If suffix is specified, limits to files with that suffix (e.g. .yml)
    async listModFiles(prefix?: string, suffix?: string): Promise<string[]>
    {
        const files = await (this.modFolderListing);
        if (files === null)
        {
            return [];
        }

        return filterFiles(files, prefix, suffix);
    }
  
    // Returns this mod file's contents as a buffer
    async getModBin(path: string): Promise<Buffer>
    {
        return await fs.readFile(joinPath(this.path, path));
    }
  
    // Returns this mod file's contents as a string
    async getModText(path: string): Promise<string>
    {
        return await fs.readFile(joinPath(this.path, path), 'utf8');
    }
  
    // Returns a list of all files in the ebsrc folder.
    // If prefix is specified, limits to files with that prefix.
    // If suffix is specified, limits to files with that suffix (e.g. .asm)
    async listSourceFiles(prefix?: string, suffix?: string): Promise<string[]>
    {
        const files = await (this.project.ebsrcListing);

        return filterFiles(files, prefix, suffix);
    }
  
    // Returns this source file's contents as a buffer
    async getSourceBin(path: string): Promise<Buffer>
    {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path));
    }
  
    // Returns this source file's contents as a string
    async getSourceText(path: string): Promise<string>
    {
        return await fs.readFile(joinPath(this.project.ebsrcPath, path), 'utf8');
    }
  
    // Writes this file to the output directory (ebdest)
    // Contents can be either a Buffer or a string.
    // Throws an error if a different mod/plugin wrote to this file.
    async writeDest(path: string, contents: Buffer | string): Promise<void>
    {
        return await fs.outputFile(joinPath(this.project.ebdestPath, path), contents);
    }
      
    // Writes this file to the reference directory.
    // Contents can be either a Buffer or a string.
    // Throws an error if a different mod/plugin wrote to this file.
    async writeReference(path: string, contents: Buffer | string): Promise<void>
    {
        return await fs.outputFile(joinPath(this.project.referencePath, path), contents);
    }
}