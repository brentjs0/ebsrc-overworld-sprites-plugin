import { expect } from 'chai';
import { describeFunctionExport as describeFunctionExport } from './test-helpers';

import * as m from './utility';

describe('utility.ts', function ()
{
    describeFunctionExport<typeof m>('stringEqualsIgnoreCase()', function ()
    {
        it('Returns true for equal strings.', function ()
        {
            const equalPairs: [string, string][] = 
            [
                ['abc', 'abc'],
                ['aBc', 'AbC'],
                ['ABC', 'abc'],
                ['abc', 'ABC'],
                ['', ''],
                ['i', 'I'],
            ];

            for (const [string1, string2] of equalPairs)
            {
                expect(m.stringEqualsIgnoreCase(string1, string2)).to.be.true;
            }
        });

        it('Returns false for unequal strings.', function ()
        {
            const unequalPairs: [string, string][] = 
            [
                ['abc', 'abd'],
                ['abb', 'abc'],
                ['ABC', 'ABCD'],
                ['aabc', ''],
                ['', 'a'],
                ['á', 'a'],
            ];

            for (const [string1, string2] of unequalPairs)
            {
                expect(m.stringEqualsIgnoreCase(string1, string2)).to.be.false;
            }
        });
    });
});