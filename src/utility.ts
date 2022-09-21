import * as jsYaml from 'js-yaml';
import upperFirst from 'lodash/upperFirst';
import words from 'lodash/words';

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