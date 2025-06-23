declare module "pdf-parse" {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    IsCollectionPresent?: boolean;
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: string | boolean | undefined;
  }

  interface PDFMetadata {
    "dc:format"?: string;
    "pdf:producer"?: string;
    "pdf:encrypted"?: boolean;
    "xmp:createdate"?: string;
    "xmp:modifydate"?: string;
    [key: string]: string | boolean | undefined;
  }

  interface PageData {
    pageIndex: number;
    pageNumber: number;
    width: number;
    height: number;
    content: string;
  }

  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    // @ts-expect-error - PDF info can contain various metadata fields
    info: Record<string, any>;
    // @ts-expect-error - PDF metadata can contain various fields
    metadata: Record<string, any>;
    version: string;
  }

  function PDFParse(
    dataBuffer: Buffer,
    options?: {
      // @ts-expect-error - pageData can contain various PDF page data
      pagerender?: (pageData: any) => string;
      max?: number;
    }
  ): Promise<PDFData>;

  export default PDFParse;
}
