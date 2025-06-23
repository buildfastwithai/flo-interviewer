import fs from "fs";
import path from "path";
import axios from "axios";
import { promisify } from "util";
import { pipeline } from "stream";
import { randomUUID } from "crypto";

// Variables to hold the SDK exports
let PDFServices: any = null;
let ServicePrincipalCredentials: any = null;
let MimeType: any = null;
let ExtractPDFParams: any = null;
let ExtractElementType: any = null;
let ExtractPDFJob: any = null;
let ExtractPDFResult: any = null;

const streamPipeline = promisify(pipeline);

// Initialize the SDK
async function initializeAdobeSDK() {
  if (PDFServices !== null) return true;

  try {
    if (typeof window === "undefined") {
      // Mock log4js before importing Adobe SDK
      // @ts-ignore
      global.log4js = {
        getLogger: () => ({
          debug: (...args: any[]) => console.debug(...args),
          info: (...args: any[]) => console.log(...args),
          warn: (...args: any[]) => console.warn(...args),
          error: (...args: any[]) => console.error(...args),
          fatal: (...args: any[]) => console.error(...args),
          isDebugEnabled: () => false,
          isInfoEnabled: () => true,
          isWarnEnabled: () => true,
          isErrorEnabled: () => true,
          isFatalEnabled: () => true,
        }),
        configure: () => {},
      };

      console.log("Importing Adobe PDF Services SDK");
      const sdk = await import("@adobe/pdfservices-node-sdk");

      PDFServices = sdk.PDFServices;
      ServicePrincipalCredentials = sdk.ServicePrincipalCredentials;
      MimeType = sdk.MimeType;
      ExtractPDFParams = sdk.ExtractPDFParams;
      ExtractElementType = sdk.ExtractElementType;
      ExtractPDFJob = sdk.ExtractPDFJob;
      ExtractPDFResult = sdk.ExtractPDFResult;

      console.log("Adobe PDF Services SDK initialized successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to initialize Adobe PDF Services SDK:", error);
    return false;
  }
}

async function extractTextFromZip(zipPath: string, unzipper: any) {
  return new Promise((resolve, reject) => {
    const extractedContent = { elements: [] };

    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on("entry", async (entry: any) => {
        const fileName = entry.path;

        if (fileName.endsWith("structuredData.json")) {
          const content = await entry.buffer();
          const jsonContent = JSON.parse(content.toString());
          extractedContent.elements = jsonContent.elements.filter(
            (element: any) => element.Text && element.Text.trim() !== ""
          );
        } else {
          entry.autodrain();
        }
      })
      .on("error", reject)
      .on("close", () => resolve(extractedContent));
  });
}

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  // Dynamically import unzipper to avoid Next.js bundling issues
  const unzipper = await import("unzipper");

  // Load the Adobe SDK
  const sdkLoaded = await initializeAdobeSDK();
  if (!sdkLoaded) {
    throw new Error("Adobe PDF Services SDK could not be loaded");
  }

  const tempDirName = randomUUID();
  const tempDir = path.join(process.cwd(), tempDirName + Date.now().toString());
  const inputPath = path.join(tempDir, "input.pdf");
  const outputPath = path.join(tempDir, "output.zip");

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let readStream;
  try {
    console.log("Starting PDF extraction for URL:", pdfUrl);

    // Download PDF file
    const response = await axios({
      method: "GET",
      url: pdfUrl,
      responseType: "stream",
    });

    // Save PDF to temp file
    await streamPipeline(response.data, fs.createWriteStream(inputPath));
    console.log("PDF downloaded successfully to:", inputPath);

    // Initialize Adobe PDF Services
    const credentials = new ServicePrincipalCredentials({
      clientId: "7fc3fb5379df4175921e7d9720a7be6e",
      clientSecret: "p8e-4KAw2hZVzLEX5FVSu2DuImcog5r51oG4",
    });

    const pdfServices = new PDFServices({ credentials });

    // Create input stream and upload
    readStream = fs.createReadStream(inputPath);
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF,
    });
    console.log("PDF uploaded to Adobe services");

    // Set up extraction parameters
    const params = new ExtractPDFParams({
      elementsToExtract: [ExtractElementType.TEXT],
    });

    // Create and submit job
    const job = new ExtractPDFJob({ inputAsset, params });
    const pollingURL = await pdfServices.submit({ job });
    console.log("PDF extraction job submitted");

    // Get job result
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult,
    });
    console.log("PDF extraction job completed");

    if (!pdfServicesResponse?.result?.resource) {
      throw new Error("No resource found in the result");
    }

    // Get and save content
    const resultAsset = pdfServicesResponse.result.resource;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    // Save zip file
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(outputPath);
      streamAsset.readStream.pipe(writeStream);
      writeStream.on("finish", () => resolve(null));
      writeStream.on("error", reject);
    });
    console.log("Extraction results saved to zip file");

    // Extract and parse the ZIP content
    const extractedContent: any = await extractTextFromZip(
      outputPath,
      unzipper
    );

    if (
      !extractedContent ||
      !extractedContent.elements ||
      extractedContent.elements.length === 0
    ) {
      throw new Error("No text elements found in the PDF");
    }

    // Combine all text elements into a single string
    const fullText = extractedContent.elements
      .map((element: any) => element.Text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    console.log(
      "Text extraction successful, extracted",
      fullText.length,
      "characters"
    );

    return fullText;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  } finally {
    // Clean up
    if (readStream) {
      readStream.destroy();
    }

    // Clean up temp files
    try {
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      // Clean up temp directory if it exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      console.log("Temporary files cleaned up");
    } catch (cleanupError) {
      console.warn("Error cleaning up temporary files:", cleanupError);
    }
  }
}
