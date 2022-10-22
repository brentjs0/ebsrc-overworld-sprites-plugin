import { listDir } from './utility';

export type Project =
{
    path: string;
    ebsrcPath: string;
    ebsrcListing: Promise<string[]>;
    ebdestPath: string;
    referencePath: string;
}

async function getEbsrcListing(): Promise<string[]>
{
    return listDir('C:/Users/brent/source/repos/ebsrc-project/ebsrc');
}

export const project: Project = 
{
    path: 'C:/Users/brent/source/repos/ebsrc-project',
    ebsrcPath: 'C:/Users/brent/source/repos/ebsrc-project/ebsrc',
    ebsrcListing: getEbsrcListing(),
    referencePath: 'C:/Users/brent/source/repos/ebsrc-project/reference',
    ebdestPath: 'C:/Users/brent/source/repos/ebsrc-project/ebdest'
};