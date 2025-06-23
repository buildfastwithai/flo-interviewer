"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExcelQuestion {
  slNo: number;
  skill: string;
  questionTitle: string;
  questionDescription: string;
  idealAnswer: string;
}

interface ExcelQuestionSet {
  id: string;
  jobTitle: string;
  experienceRange: string;
  totalQuestions: number;
  skillsExtracted: string[];
  questions: ExcelQuestion[];
  createdAt: string;
  updatedAt: string;
}

export default function ExcelQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [questionSet, setQuestionSet] = useState<ExcelQuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "csv" | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuestions();
    }
  }, [id]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/excel-questions/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch questions");
      }

      setQuestionSet(data.data);
    } catch (error: any) {
      console.error("Error fetching questions:", error);
      toast.error(error.message || "Failed to fetch questions");
      router.push("/jd-qna");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: "excel" | "csv") => {
    if (!questionSet?.questions) {
      toast.error("No questions to download");
      return;
    }

    setExporting(format);

    try {
      const filename = `${questionSet.jobTitle
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}.${
        format === "excel" ? "xlsx" : "csv"
      }`;

      const response = await fetch("/api/export-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions: questionSet.questions,
          format,
          filename,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export questions");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(
        `Questions exported as ${format.toUpperCase()} successfully!`
      );
    } catch (error: any) {
      console.error("Error exporting questions:", error);
      toast.error(error.message || "Failed to export questions");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading questions...</span>
        </div>
      </div>
    );
  }

  if (!questionSet) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Question set not found.</p>
            <Button
              variant="outline"
              onClick={() => router.push("/jd-qna")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/jd-qna")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{questionSet.jobTitle}</h1>
            <p className="text-muted-foreground">
              Excel Interview Questions - Generated on{" "}
              {new Date(questionSet.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Question Summary</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("csv")}
                disabled={exporting === "csv"}
              >
                {exporting === "csv" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Download CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("excel")}
                disabled={exporting === "excel"}
              >
                {exporting === "excel" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Download Excel
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Interview questions optimized for candidates with{" "}
            {questionSet.experienceRange} of experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">
              Total Questions: {questionSet.totalQuestions}
            </Badge>
            <Badge variant="secondary">
              Skills: {questionSet.skillsExtracted.length}
            </Badge>
            <Badge variant="secondary">
              Experience: {questionSet.experienceRange}
            </Badge>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">Skills Covered:</h4>
            <div className="flex flex-wrap gap-2">
              {questionSet.skillsExtracted.map((skill, index) => (
                <Badge key={index} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table - Desktop */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle>Generated Questions</CardTitle>
            <CardDescription>
              Scenario-based technical questions with ideal answers in
              CKEditor-compatible HTML format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table
                className="table-fixed w-full"
                style={{ tableLayout: "fixed" }}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[8%] text-center">Sl No</TableHead>
                    <TableHead className="w-[12%]">Skill</TableHead>
                    <TableHead className="w-[20%]">Question Title</TableHead>
                    <TableHead className="w-[30%]">
                      Question Description
                    </TableHead>
                    <TableHead className="w-[30%]">Ideal Answer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionSet.questions.map((question) => (
                    <TableRow
                      key={question.slNo}
                      className="align-top border-b border-gray-100"
                    >
                      <TableCell className="font-medium text-center py-6 px-4">
                        {question.slNo}
                      </TableCell>
                      <TableCell className="align-top max-w-[150px] py-6 px-4">
                        <Badge variant="outline" className="whitespace-normal">
                          {question.skill}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top max-w-[300px] py-6 px-4">
                        <div className="font-medium text-sm leading-relaxed overflow-x-auto whitespace-nowrap max-w-[280px] pb-2">
                          {question.questionTitle}
                        </div>
                      </TableCell>
                      <TableCell className="align-top max-w-[450px] py-6 px-4">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {question.questionDescription}
                        </div>
                      </TableCell>
                      <TableCell className="align-top max-w-[500px] py-6 px-4">
                        <div className="max-h-40 overflow-y-auto">
                          <div
                            className="text-sm leading-relaxed prose prose-sm max-w-none break-words
                            prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2
                            prose-p:mb-2 prose-p:leading-relaxed prose-p:break-words
                            prose-ul:mb-2 prose-ul:pl-4 prose-li:mb-1 prose-li:break-words
                            prose-ol:mb-2 prose-ol:pl-4
                            prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded prose-pre:text-xs
                            prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words
                            prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-xs prose-code:break-words
                            [&_br]:content-[''] [&_br]:block [&_br]:mb-1
                            [&_ul]:list-disc [&_ol]:list-decimal
                            [&_pre]:max-w-full [&_pre]:break-words
                            [&_pre]:border [&_pre]:border-gray-200"
                            dangerouslySetInnerHTML={{
                              __html: question.idealAnswer
                                .replace(/\\n/g, "\n")
                                .replace(/<br\s*\/?>/gi, "<br>"),
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Generated Questions</h2>
          <p className="text-sm text-muted-foreground">
            {questionSet.questions.length} questions
          </p>
        </div>

        {questionSet.questions.map((question) => (
          <Card key={question.slNo} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      #{question.slNo}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.skill}
                    </Badge>
                  </div>
                  <CardTitle className="text-base leading-6">
                    {question.questionTitle}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                  Question Description:
                </h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {question.questionDescription}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                  Ideal Answer:
                </h4>
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none
                    prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2
                    prose-p:mb-2 prose-p:leading-relaxed
                    prose-ul:mb-2 prose-ul:pl-4 prose-li:mb-1
                    prose-ol:mb-2 prose-ol:pl-4
                    prose-pre:bg-gray-100 prose-pre:p-3 prose-pre:rounded prose-pre:text-xs
                    prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap
                    prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-xs
                    [&_br]:content-[''] [&_br]:block [&_br]:mb-1
                    [&_ul]:list-disc [&_ol]:list-decimal
                    [&_pre]:max-w-full [&_pre]:break-words
                    [&_pre]:border [&_pre]:border-gray-200"
                  dangerouslySetInnerHTML={{
                    __html: question.idealAnswer
                      .replace(/\\n/g, "\n")
                      .replace(/<br\s*\/?>/gi, "<br>"),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
