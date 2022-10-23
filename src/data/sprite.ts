import { isNullish, isNullishOrEmpty, returnOrThrowErrorMessage, toTitleCase } from '../utility';

export type Sprite =
{
    binaryFilePath: string;
    binaryLabel: string;
    flipGraphicsHorizontally: boolean;
    swimFlag: boolean;
}

export type SpriteKey = keyof Sprite;

export function validateExtractedSprite(value: Partial<Sprite>, throwOnError: boolean, validateBinaryFilePath: boolean): string | undefined
{
    if (isNullishOrEmpty(value.binaryLabel))
    {
        return returnMissingPropMessageOrThrow('binaryLabel', throwOnError);
    }

    if (isNullish(value.flipGraphicsHorizontally))
    {
        return returnMissingPropMessageOrThrow('flipGraphicsHorizontally', throwOnError);
    }

    if (isNullish(value.swimFlag))
    {
        return returnMissingPropMessageOrThrow('swimFlag', throwOnError);
    }

    if (!validateBinaryFilePath)
    {
        return undefined;
    }

    if (isNullishOrEmpty(value.binaryFilePath))
    {
        return returnMissingPropMessageOrThrow('binaryFilePath', throwOnError);
    }

    return undefined;
}

function returnMissingPropMessageOrThrow(propertyName: SpriteKey, throwError: boolean): string
{
    return returnOrThrowErrorMessage(
        `Sprite data without a(n) "${toTitleCase(propertyName)}" value was encountered.`,
        throwError);
}