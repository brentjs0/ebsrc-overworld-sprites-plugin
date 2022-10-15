import * as fs from 'fs-extra';
import * as path from 'path';
import * as jsYaml from 'js-yaml';
import upperFirst from 'lodash/upperFirst';
import words from 'lodash/words';

export function objectHasKey<O extends object, K extends string>(obj: O, keyName: K): obj is O & Record<K, unknown>
{
    return keyName in obj;
}

export function stringEqualsIgnoreCase(string1: string, string2: string): boolean
{
    return string1.toUpperCase() === string2.toUpperCase();
}

export function isString(value: unknown): value is string
{
    return typeof value === 'string';
}

export function substringByLength(str: string, start: number, length: number | undefined = undefined)
{
    length = length ?? str.length - start;

    return str.substring(start, start + length);
}

export function isOptionalString(value: unknown): value is string | undefined
{
    const typeName: string = typeof value;

    return typeName === 'undefined' || typeName === 'string';
}

export function isNullish(value: unknown): value is undefined | null
{
    return value === undefined || value === null;
}

export function isNullishOrEmpty(value: unknown): value is undefined | null | ''
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
    const nodes = [];
    for (let i = 0; i < objects.length; ++i)
    {
        let node = `${i}:\n  `;
        node += jsYaml.dump(objects[i], options).trim().split('\n').join('\n  ');
        nodes.push(node);
    }
    
    return `${nodes.join('\n')}\n`;
}

export function toTitleCase(str: string): string 
{
    const wordStrings = words(str);
    const lastIndex = wordStrings.length - 1;

    return wordStrings
        .map((w, i) => applyTitleCaseToWord(w, i === 0 || i === lastIndex))
        .join(' ');
}

function applyTitleCaseToWord(word: string, isFirstOrLastWord: boolean): string
{
    const lowercaseWord = word.toLowerCase();
    switch (lowercaseWord)
    {
        case 'atm':
            return 'ATM';
        case 'ii':
            return 'II';
        case 'amid':
        case 'and':
        case 'as':
        case 'at':
        case 'but':
        case 'by':
        case 'down':
        case 'for':
        case 'from':
        case 'in':
        case 'into':
        case 'like':
        case 'near':
        case 'next':
        case 'nor':
        case 'of':
        case 'off':
        case 'on':
        case 'onto':
        case 'or':
        case 'out':
        case 'over':
        case 'past':
        case 'per':
        case 'plus':
        case 'save':
        case 'so':
        case 'than':
        case 'till':
        case 'to':
        case 'up':
        case 'upon':
        case 'via':
        case 'with':
        case 'yet':
            return isFirstOrLastWord ? upperFirst(lowercaseWord) : lowercaseWord;
        default:
            return upperFirst(lowercaseWord);
    }
}

export function removePrefix(str: string, prefix: string)
{
    if (str.startsWith(prefix))
    {
        return str.substring(prefix.length);
    }

    return str;
}

export function splitWhere(str: string, splitCondition: (characterIndex: number) => boolean): string[]
{
    const substrings = [];
    let substringStart = 0;

    for (let i = 0; i < str.length; ++i)
    {
        if (splitCondition(i))
        {
            substrings.push(str.substring(substringStart, i));
            substringStart = i;
        }
    }

    substrings.push(str.substring(substringStart, str.length));

    return substrings;
}

export function unpackErrorMessage(caughtValue: unknown, fallbackErrorMessage: string) : string
{
    if (caughtValue instanceof Error)
    {
        return caughtValue.message;
    }

    if (typeof caughtValue === 'string')
    {
        return caughtValue;
    }

    return fallbackErrorMessage;
}

export function filterToType<T, U extends T>(arr: T[], typePredicate: (item: T) => item is U): U[]
{
    return arr.filter(typePredicate);
}

export function union<T>(array1: T[], array2: T[], ...otherArrays: T[][]): T[]
{
    const set = new Set<T>(array1);
    const arrays = [...otherArrays];
    arrays.unshift(array2);
    for (const array of arrays)
    {
        for (const t of array)
        {
            set.add(t);
        }
    }

    return [...set];
}

export async function listDir(dirPath: string): Promise<string[]>
{
    let list: string[] = [];

    const fileAndDirNames: string[] = await fs.readdir(dirPath);
    for (const fileOrDirName of fileAndDirNames)
    {
        const fullPathToFileOrDir = path.join(dirPath, fileOrDirName);
        if ((await fs.lstat(fullPathToFileOrDir)).isDirectory())
        {
            const subDirList = await listDir(fullPathToFileOrDir);
            list.push(`${fileOrDirName}/`);
            list = union(list, subDirList.map(x => `${fileOrDirName}/${x}`));
        }
        else
        {
            list.push(fileOrDirName);
        }
    }

    return list;
}