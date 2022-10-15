import { Suite, describe } from 'mocha';

export const describeExport: <T extends object>(exportName: string & keyof T, testFn: (this: Suite) => void) => Suite = describe;
export const describeFunctionExport: <T extends object>(functionExportName: `${string & keyof T}()`, testFn: (this: Suite) => void) => Suite = describe;