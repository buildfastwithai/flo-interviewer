"use client";
import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { QuestionsDisplay, Question } from "./ui/questions-display";
import { FileInput } from "./ui/file-input";
import { Spinner } from "./ui/spinner";
import {
  Download,
  FileText,
  Zap,
  RefreshCw,
  ArrowRight,
  Clock,
  Sparkles,
  FileUp,
  PenLine,
  CheckCircle2,
} from "lucide-react";
import PDFDoc from "./PDFDocument";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { useRouter } from "next/navigation";
import { SkillLevel, Requirement } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { QuestionGenerationDialog } from "./ui/question-generation-dialog";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { motion } from "framer-motion";

// Form validation schema
const formSchema = z.object({
  jobRole: z.string().min(1, { message: "Job role is required" }),
  customInstructions: z.string().optional(),
  jobDescriptionFile: z.instanceof(File).optional(),
  jobDescriptionText: z.string().optional(),
  interviewLength: z.coerce
    .number()
    .min(15, { message: "Minimum interview length is 15 minutes" })
    .optional(),
});

export interface SkillWithMetadata {
  name: string;
  level: SkillLevel;
  requirement: Requirement;
  numQuestions: number;
  difficulty?: string;
  priority?: number;
}

type FormValues = z.infer<typeof formSchema>;

// Motion animations
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function JDQnaForm() {
  // States
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extractingSkills, setExtractingSkills] = useState(false);
  const [pdfContent, setPdfContent] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [skills, setSkills] = useState<SkillWithMetadata[]>([]);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<"file" | "text">("file");
  const [questionGenerationDialogOpen, setQuestionGenerationDialogOpen] =
    useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    title: "Auto-Generating",
    description:
      "Creating skills and interview questions from your job description...",
    showProgress: true,
    progressValue: 0,
    progressText: "",
  });
  const [formProgress, setFormProgress] = useState(0);

  const router = useRouter();

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobRole: "",
      customInstructions: "",
      jobDescriptionText: "",
      interviewLength: 60, // Default to 60 minutes
    },
  });

  // Update form progress based on filled fields
  useEffect(() => {
    const watchJobRole = form.watch("jobRole");
    const watchInterviewLength = form.watch("interviewLength");
    const hasJobDescription = pdfContent || form.watch("jobDescriptionText");

    let progress = 0;
    if (watchJobRole) progress += 33;
    if (watchInterviewLength) progress += 33;
    if (hasJobDescription) progress += 34;

    setFormProgress(progress);
  }, [form, pdfContent]);

  // Handle file upload and content extraction
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setFileName(file.name);

    try {
      // Upload the file to get URL
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      const {
        file: { url },
      } = await uploadResponse.json();

      // Extract content from the PDF
      toast.info("Extracting content from PDF...", {
        duration: 3000,
      });

      const extractResponse = await fetch("/api/pdf-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeUrl: url }),
      });

      if (!extractResponse.ok) {
        throw new Error("Failed to extract PDF content");
      }

      const { content } = await extractResponse.json();
      setPdfContent(content);
      toast.success("PDF content extracted successfully", {
        description: "Your job description is ready for processing.",
        duration: 4000,
      });
    } catch (error) {
      console.error("Error uploading or extracting file:", error);
      toast.error("Error processing file. Please try again.", {
        description:
          "There was an issue with your PDF. Try a different file or paste text directly.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Extract skills from job description
  const extractSkills = async () => {
    const jobDescription =
      inputMethod === "file" ? pdfContent : form.getValues().jobDescriptionText;

    if (!jobDescription) {
      toast.error("Please provide a job description first");
      return;
    }

    setExtractingSkills(true);

    try {
      toast.info("Analyzing job description...", {
        description: "Extracting key skills and requirements.",
        duration: 5000,
      });

      const response = await fetch("/api/extract-skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription: jobDescription,
          jobTitle: form.getValues().jobRole,
          interviewLength: Number(form.getValues().interviewLength),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract skills");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to extract skills");
      }

      // Set the recordId and open skills dialog instead of navigating
      if (data.recordId) {
        setRecordId(data.recordId);
        setSkills(data.analysis.skills || []);
        router.push(`/jd-qna/records/${data.recordId}`);
        toast.success("Skills extracted successfully!", {
          description: `Identified ${data.analysis.skills?.length || 0} key skills for the role.`,
          duration: 5000,
        });
      } else {
        throw new Error("No record ID was returned from the API");
      }
    } catch (error) {
      console.error("Error extracting skills:", error);
      toast.error("Error extracting skills. Please try again.", {
        description:
          "We couldn't process the job description. Please check your input and try again.",
      });
    } finally {
      setExtractingSkills(false);
    }
  };

  // Generate questions based on selected skills
  const generateQuestions = async () => {
    const jobDescription =
      inputMethod === "file" ? pdfContent : form.getValues().jobDescriptionText;

    if (!jobDescription || skills.length === 0) {
      toast.error("Please extract skills first", {
        description:
          "We need to analyze the job description before generating questions.",
      });
      return;
    }

    setLoading(true);

    try {
      // Assign priorities to skills based on requirement and user's ordering
      const prioritizedSkills = [...skills].map((skill, index) => ({
        ...skill,
        priority: index + 1, // Default priority based on current order
      }));

      // Filter mandatory skills for question generation
      const mandatorySkills = prioritizedSkills
        .filter((skill) => skill.requirement === "MANDATORY")
        .map((skill) => skill.name);

      // Calculate total questions based on interview length
      const interviewLength = form.getValues().interviewLength || 60;
      const totalAvailableTime = interviewLength - 10; // Reserve 10 min for intro/wrap-up
      const avgTimePerQuestion = 4; // Average 4 minutes per question
      const maxQuestions = Math.floor(totalAvailableTime / avgTimePerQuestion);

      toast.info("Generating interview questions...", {
        description: `Creating up to ${maxQuestions} questions based on ${skills.length} identified skills.`,
        duration: 5000,
      });

      // Include all skills in the request for reference
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobRole: form.getValues().jobRole,
          jobDescription: jobDescription,
          skills: prioritizedSkills,
          recordId: recordId,
          interviewLength: Number(interviewLength),
          maxQuestions: maxQuestions,
          customInstructions: `Focus on these specific skills: ${mandatorySkills.join(
            ", "
          )}. Consider the skill level (Beginner/Intermediate/Professional) when generating questions. 
          Generate up to ${maxQuestions} questions in total, prioritizing mandatory skills. 
          ${form.getValues().customInstructions || ""}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate questions");
      }

      setQuestions(data.questions);
      setSkillsDialogOpen(false);
      toast.success("Questions generated successfully!", {
        description: `Created ${data.questions.length} personalized interview questions.`,
        duration: 5000,
      });

      // If record was created, navigate to the record page to edit skills
      if (recordId) {
        router.push(`/jd-qna/records/${recordId}`);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Error generating questions. Please try again.", {
        description:
          "There was an issue creating interview questions. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset the form and start over
  const handleReset = () => {
    form.reset();
    setPdfContent(null);
    setQuestions([]);
    setFileName(null);
    setSkills([]);
    toast.info("Form has been reset", {
      description: "You can start the process again.",
    });
  };

  // Generate and download PDF
  const handleGeneratePDF = async () => {
    if (!questions.length) return;

    setPdfLoading(true);
    try {
      const jobRole = form.getValues().jobRole;
      const fileName = `interview-questions-${jobRole
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`;

      toast.info("Preparing PDF document...", {
        duration: 3000,
      });

      const blob = await pdf(
        <PDFDoc jobRole={jobRole} questions={questions as any} />
      ).toBlob();

      saveAs(blob, fileName);
      toast.success("PDF downloaded successfully", {
        description: "Your interview questions are ready to use.",
        duration: 4000,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF. Please try again.", {
        description: "There was an issue creating the PDF document.",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  // Watch for file changes
  const fileWatch = form.watch("jobDescriptionFile");

  // When file changes, upload it
  React.useEffect(() => {
    if (fileWatch && fileWatch instanceof File) {
      handleFileUpload(fileWatch);
    }
  }, [fileWatch]);

  // Auto-generate both skills and questions in one go
  const autoGenerateSkillsAndQuestions = async () => {
    const jobDescription =
      inputMethod === "file" ? pdfContent : form.getValues().jobDescriptionText;

    if (!form.getValues().jobRole) {
      toast.error("Please enter a job role first", {
        description: "We need to know what position you're interviewing for.",
      });
      return;
    }

    if (!jobDescription) {
      toast.error("Please provide a job description first", {
        description: "Upload a PDF or paste the job description text.",
      });
      return;
    }

    setLoading(true);
    setQuestionGenerationDialogOpen(true);
    setGenerationProgress({
      title: "Auto-Generating Skills & Questions",
      description:
        "Analyzing your job description and creating comprehensive interview content...",
      showProgress: true,
      progressValue: 10,
      progressText: "Extracting skills from job description...",
    });

    try {
      const response = await fetch("/api/auto-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobRole: form.getValues().jobRole,
          jobDescription: jobDescription,
          interviewLength: Number(form.getValues().interviewLength || 60),
          customInstructions: form.getValues().customInstructions || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to auto-generate skills and questions");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to auto-generate");
      }

      if (data.recordId) {
        toast.success("Skills and questions generated successfully!", {
          description: "Your interview content is ready to review.",
          duration: 5000,
        });
        // Navigate directly to the record page
        router.push(`/jd-qna/records/${data.recordId}`);
      } else {
        throw new Error("No record ID was returned from the API");
      }
    } catch (error) {
      console.error("Error auto-generating:", error);
      toast.error(
        "Error auto-generating skills and questions. Please try again.",
        {
          description: "There was an issue processing your request.",
        }
      );
    } finally {
      setLoading(false);
      setQuestionGenerationDialogOpen(false);
    }
  };

  // Handle form submission - now extracts skills
  const onSubmit = (values: FormValues) => {
    extractSkills();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto p-4">
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <Card className="shadow-md border border-border hover:shadow-lg transition-shadow duration-300 h-full">
          <CardHeader className="space-y-2 border-b border-border/40 bg-card/70">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl font-serif text-foreground">
                Job Description Details
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Upload a job description PDF or paste text to extract skills and
              generate interview questions.
            </CardDescription>

            <div className="pt-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>Form completion</span>
                <span>{formProgress}%</span>
              </div>
              <Progress value={formProgress} className="h-1 bg-muted/50" />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobRole"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-medium flex items-center">
                          <Badge
                            variant="outline"
                            className="mr-2 bg-primary/5 text-primary border-primary/20"
                          >
                            Required
                          </Badge>
                          Job Role
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Senior Frontend Developer"
                            className="focus:ring-2 focus:ring-ring/30 transition-all shadow-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-destructive text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interviewLength"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-medium flex items-center">
                          <Badge
                            variant="outline"
                            className="mr-2 bg-primary/5 text-primary border-primary/20"
                          >
                            Required
                          </Badge>
                          Interview Length
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              min="15"
                              max="240"
                              placeholder="60"
                              className="focus:ring-2 focus:ring-ring/30 transition-all shadow-sm pl-8"
                              {...field}
                            />
                          </FormControl>
                          <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                            minutes
                          </div>
                        </div>
                        <FormMessage className="text-destructive text-sm" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customInstructions"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="font-medium flex items-center">
                        <Badge
                          variant="outline"
                          className="mr-2 bg-secondary/20 text-muted-foreground border-secondary/20"
                        >
                          Optional
                        </Badge>
                        Custom Instructions
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any specific focus areas or question types you'd like to include"
                          className="min-h-20 focus:ring-2 focus:ring-ring/30 transition-all resize-y shadow-sm"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground italic">
                        E.g., &quot;Focus on system design questions&quot; or
                        &quot;Include behavioral questions about teamwork&quot;
                      </p>
                      <FormMessage className="text-destructive text-sm" />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                      Step 2
                    </Badge>
                    <h3 className="text-sm font-medium text-foreground">
                      Provide Job Description
                    </h3>
                  </div>

                  <Tabs
                    defaultValue="file"
                    onValueChange={(value) =>
                      setInputMethod(value as "file" | "text")
                    }
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-2 w-full mb-2 px-2 bg-muted/50 border border-border/50 rounded-md h-12">
                      <TabsTrigger
                        value="file"
                        className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                      >
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload PDF
                      </TabsTrigger>
                      <TabsTrigger
                        value="text"
                        className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                      >
                        <PenLine className="mr-2 h-4 w-4" />
                        Paste Text
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="pt-2">
                      <FormField
                        control={form.control}
                        name="jobDescriptionFile"
                        render={({
                          field: { value, onChange, ...fieldProps },
                        }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-medium">
                              Job Description PDF
                            </FormLabel>
                            <FormControl>
                              <FileInput
                                accept=".pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onChange(file);
                                  }
                                }}
                                className="w-full border border-input rounded-md p-2 focus:ring-2 focus:ring-ring/30 shadow-sm"
                                {...fieldProps}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Supported format: PDF
                            </p>
                            <FormMessage className="text-destructive text-sm" />
                          </FormItem>
                        )}
                      />

                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-md animate-pulse">
                          <Spinner size="sm" className="text-primary" />
                          <span>Uploading and processing file...</span>
                        </div>
                      )}

                      {fileName && !uploading && pdfContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 border border-border/50 rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors"
                        >
                          <h3 className="font-medium mb-2 flex items-center text-foreground">
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            Uploaded PDF
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {fileName}
                          </p>
                          <div className="text-sm text-primary flex items-center">
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md flex items-center">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              PDF content extracted successfully!
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </TabsContent>

                    <TabsContent value="text" className="pt-2">
                      <FormField
                        control={form.control}
                        name="jobDescriptionText"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-medium">
                              Paste Job Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Paste your job description here..."
                                className="min-h-64 resize-y focus:ring-2 focus:ring-ring/30 transition-all shadow-sm"
                              />
                            </FormControl>
                            <FormMessage className="text-destructive text-sm" />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="flex items-center justify-center h-11 hover:bg-primary/5 hover:text-primary transition-colors shadow-sm"
                    disabled={
                      loading ||
                      (inputMethod === "file"
                        ? uploading || !pdfContent
                        : !form.getValues().jobDescriptionText)
                    }
                    onClick={autoGenerateSkillsAndQuestions}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Auto-Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Auto-Generate Questions
                      </>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 flex items-center justify-center shadow-sm bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                    disabled={
                      extractingSkills ||
                      (inputMethod === "file"
                        ? uploading || !pdfContent
                        : !form.getValues().jobDescriptionText)
                    }
                  >
                    {extractingSkills ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Extracting Skills...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Extract Skills & Continue
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground/70 pt-2">
                  <p className="flex items-center">
                    <Zap className="h-3 w-3 mr-1 inline" />
                    <span>
                      <strong>Auto-Generate:</strong> Creates both skills and
                      questions in one step
                    </span>
                  </p>
                  <p className="flex items-center mt-1">
                    <ArrowRight className="h-3 w-3 mr-1 inline" />
                    <span>
                      <strong>Extract Skills:</strong> Lets you review skills
                      before generating questions
                    </span>
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {questions.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="space-y-6"
        >
          <Card className="shadow-md border border-border hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-accent/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-serif text-foreground flex items-center">
                    <Sparkles className="h-5 w-5 text-accent mr-2" />
                    {form.getValues().jobRole} - Interview Questions
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {questions.length} questions generated (
                    {form.getValues().interviewLength} minute interview)
                  </CardDescription>
                </div>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={pdfLoading}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                >
                  {pdfLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Preparing PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <QuestionsDisplay questions={questions} />
            </CardContent>
            <CardFooter className="border-t border-border/40 pt-4 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                These questions are tailored based on the provided job
                description and skills
              </p>
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {/* Question Generation Dialog */}
      <QuestionGenerationDialog
        open={questionGenerationDialogOpen}
        title={generationProgress.title}
        description={generationProgress.description}
        showProgress={generationProgress.showProgress}
        progressValue={generationProgress.progressValue}
        progressText={generationProgress.progressText}
      />
    </div>
  );
}
