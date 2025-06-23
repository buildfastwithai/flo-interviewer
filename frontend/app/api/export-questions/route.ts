import { NextRequest, NextResponse } from "next/server";
import {
  exportToExcel,
  exportToCSV,
  createDownloadResponse,
  ExportQuestion,
} from "@/lib/export-utils";

export async function POST(request: NextRequest) {
  try {
    const { questions, format, filename } = await request.json();

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, error: "Questions array is required" },
        { status: 400 }
      );
    }

    if (!format || !["excel", "csv"].includes(format)) {
      return NextResponse.json(
        { success: false, error: "Format must be 'excel' or 'csv'" },
        { status: 400 }
      );
    }

    const exportQuestions: ExportQuestion[] = questions.map(
      (q: any, index: number) => ({
        slNo: index + 1,
        corpId: String(q.corpId || "").trim(),
        urlId: String(q.urlId || "").trim(),
        roundSequence: q.roundSequence || 1,
        skill: String(q.skillName || q.skill || "").trim(),
        questionTitle: "",
        questionDescription: String(
          q.question || q.questionDescription || ""
        ).trim(),
        candidateDescription: String(
          q.candidateDescription || q.question || q.questionDescription || ""
        ).trim(),
        candidateFacingDocUrl: String(q.candidateFacingDocUrl || "").trim(),
        tags:
          q.tags ||
          `${q.category || ""}, ${q.questionFormat || ""}`.replace(
            /^, |, $/,
            ""
          ) ||
          "",
        idealAnswer: String(q.answer || q.idealAnswer || "").trim(),
        coding:
          q.coding !== undefined
            ? q.coding
            : q.isCoding !== undefined
            ? q.isCoding
            : false,
        mandatory: String(q.mandatory || "No").trim(),
        hideInFloReport: String(q.hideInFloReport || "No").trim(),
        poolName: String(q.poolName || "").trim(),
      })
    );

    if (format === "excel") {
      const excelBuffer = exportToExcel(exportQuestions, filename);
      const defaultFilename =
        filename || `interview-questions-${Date.now()}.xlsx`;

      return createDownloadResponse(
        excelBuffer,
        defaultFilename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } else if (format === "csv") {
      const csvData = exportToCSV(exportQuestions);
      const defaultFilename =
        filename || `interview-questions-${Date.now()}.csv`;

      return createDownloadResponse(csvData, defaultFilename, "text/csv");
    }

    return NextResponse.json(
      { success: false, error: "Invalid format" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error exporting questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to export questions",
      },
      { status: 500 }
    );
  }
}
