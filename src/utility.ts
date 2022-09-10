import * as jsYaml from 'js-yaml';

export function stringEqualsIgnoreCase(string1: string, string2: string): boolean
{
    return string1.localeCompare(string2, 'en', { sensitivity: 'base' }) == 0
}

export function isString(value: any): value is string
{
    return typeof value === 'string';
}

export function substringByLength(str: string, start: number, length: number | undefined = undefined)
{
    length = length ?? str.length - start;
    return str.substring(start, start + length);
}

export function isOptionalString(value: any): value is string | undefined
{
    const typeName: string = typeof value;
    return typeName === 'undefined' || typeName === 'string';
}

export function isNullish(value: any): value is undefined | null
{
    return value === undefined || value === null;
}

export function isNullishOrEmpty(value: any): value is undefined | null | ''
{
    return isNullish(value) || (isString(value) && value.trim() === '');
}

export function splitAndTrimCSV(str: string): string[]
{
    return str.split(',').map(s => s.trim());
}

export function firstItem<T>(arrayLike: ArrayLike<T>): T | undefined
{
    return arrayLike.length > 0
        ? arrayLike[0]
        : undefined;
}

export function lastItem<T>(arrayLike: ArrayLike<T>): T | undefined
{
    return arrayLike.length > 0
        ? arrayLike[arrayLike.length - 1]
        : undefined;
}

/**
 * Return an array of objects as YAML with unquoted numeric keys
 * at the top level for each index.
 * @param objects - An array of objects to serialize as YAML.
 * @returns An array of objects as YAML with unquoted numeric keys.
 */
export function dumpArrayAsYAMLWithNumericKeys(objects: object[], options: jsYaml.DumpOptions | undefined = undefined): string
{
  let nodes = [];
  for (let i = 0; i < objects.length; ++i)
  {
    let node = `${i}:\n  `;
    node += jsYaml.dump(objects[i], options).trim().split('\n').join('\n  ');
    nodes.push(node);
  }
  
  return `${nodes.join('\n')}\n`;
}