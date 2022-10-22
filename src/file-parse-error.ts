export class FileParseError extends Error
{
    messageSummary: string;

    constructor(messageSummary: string, fileName: string)
    {
        super(createFileParseErrorMessage(messageSummary, fileName));
        this.messageSummary = messageSummary;
    }
}

function createFileParseErrorMessage(
    messageSummary: string,
    fileName: string): string
{        
    return `${messageSummary}\nFile: ${fileName}\n`;
}