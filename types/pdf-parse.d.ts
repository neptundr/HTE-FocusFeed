declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<{ numpages: number; numrender: number; info: unknown; metadata: unknown; text: string; version: string }>;
  export = pdfParse;
}
