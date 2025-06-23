import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { resumeUrl } = await req.json();

    if (!resumeUrl) {
      return NextResponse.json(
        { error: "Resume URL is required" },
        { status: 400 }
      );
    }

    // Download the PDF file from URL
    const response = await axios.get(resumeUrl, {
      responseType: "arraybuffer",
    });
    const pdfBuffer = Buffer.from(response.data);

    // Create a Blob from the buffer
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    // Use WebPDFLoader to extract text
    const loader = new WebPDFLoader(pdfBlob);

    // Load and extract content from the PDF
    const docs = await loader.load();

    // Extract the content from the documents
    const content = docs.map((doc) => doc.pageContent).join(" ");

    return NextResponse.json({
      success: true,
      content: content,
    });
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Error extracting PDF text: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
