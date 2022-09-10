import { CA65Line } from './ca65';

export class CA65BlockError extends Error
{
    messageSummary: string;
    blockLines: CA65Line[];
    errorLine: CA65Line | undefined;

    constructor(
        messageSummary: string,
        fileName: string,
        blockLines: CA65Line[],
        errorLine: CA65Line | undefined = undefined)
    {
        super(createCA65SourceErrorMessage(messageSummary, fileName, blockLines, errorLine));
        this.messageSummary = messageSummary;
        this.blockLines = blockLines;
        this.errorLine = errorLine;
    }
}

export class CA65LineError extends Error
{
    messageSummary: string;
    line: CA65Line;

    constructor(
        messageSummary: string,
        fileName: string,
        line: CA65Line)
    {
        super(createCA65SourceErrorMessage(messageSummary, fileName, [line], line));
        this.messageSummary = messageSummary;
        this.line = line;
    }
}

function createCA65SourceErrorMessage(
    messageSummary: string,
    fileName: string, 
    blockLines: CA65Line[],
    errorLine: CA65Line | undefined = undefined): string
{        
    let message = `${messageSummary}\n` +
        `File: ${fileName}\n`;

    if (errorLine?.lineNumber !== undefined)
    {
        message += `Line Number: ${errorLine.lineNumber}\n`;
    }

    return message + createCodeDisplayForErrorMessage(blockLines, errorLine);
}

function createCodeDisplayForErrorMessage(blockLines: CA65Line[], errorLine: CA65Line | undefined): string
{
    const lineNumberPadding: number = Math.max(...blockLines.map(l => l.lineNumber)).toString().length;
    const displayLines: string[] = blockLines.map(l => createDisplayLineForErrorMessage(l, lineNumberPadding, errorLine));
    const longestLineLength: number = Math.max(...displayLines.map(dl => dl.length));
    const delimiterLine: string = '`'.repeat(longestLineLength);

    return `${delimiterLine}\n` +
        `${displayLines.join('\n')}\n` +
        `${delimiterLine}\n`;
}

function createDisplayLineForErrorMessage(line: CA65Line, lineNumberPadding: number, errorLine: CA65Line | undefined): string
{
    const separator: string = line.lineNumber === errorLine?.lineNumber ? '>' : '|';
    const paddedLineNumber: string = line.lineNumber.toString().padStart(lineNumberPadding, ' ');

    return ` ${paddedLineNumber} ${separator} ${line.sourceExpressionText.replace('\t', '    ')}`;
}