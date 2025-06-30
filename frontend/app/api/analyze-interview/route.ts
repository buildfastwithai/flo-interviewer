export const maxDuration = 299;

import { OpenAI } from 'openai';
import * as pdfjs from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// Initialize PDF.js worker
// @ts-ignore - The worker import path is correct but TypeScript doesn't recognize it
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Enums matching the backend
enum SkillLevel {
  BEGINNER = "Beginner",
  INTERMEDIATE = "Intermediate",
  ADVANCED = "Advanced",
  EXPERT = "Expert",
  NOT_DEMONSTRATED = "Not Demonstrated"
}

enum GradeLevel {
  EXCELLENT = "Excellent",
  GOOD = "Good",
  AVERAGE = "Average",
  BELOW_AVERAGE = "Below Average",
  POOR = "Poor"
}

// Interfaces matching the backend models
interface SkillAssessment {
  skill: string;
  level: SkillLevel;
  confidence_score: number;
  evidence: string;
  recommendations: string;
}

interface QuestionAnswer {
  question: string;
  answer: string;
  grade: GradeLevel;
  score: number;
  feedback: string;
  key_points_covered: string[];
  areas_for_improvement: string[];
}

interface InterviewInsights {
  overall_performance_score: number;
  communication_clarity: number;
  technical_depth: number;
  problem_solving_ability: number;
  confidence_level: number;
  strengths: string[];
  weaknesses: string[];
  key_achievements_mentioned: string[];
  red_flags: string[];
  interview_duration_analysis: string;
  speech_patterns: string;
  engagement_level: string;
  cultural_fit_indicators: string[];
  hiring_recommendation: string;
  next_steps: string[];
}

interface ComprehensiveAnalysisResponse {
  filename?: string;
  raw_transcript: string;
  formatted_transcript: string;
  ai_provider: string;
  file_chunks?: number;
  skill_assessments: SkillAssessment[];
  questions_and_answers: QuestionAnswer[];
  interview_insights: InterviewInsights;
  analysis_summary: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility functions matching the backend
async function extractTextFromPdf(fileContent: ArrayBuffer): Promise<string> {
  try {
    // Load the PDF document
    const loadingTask = pdfjs.getDocument(new Uint8Array(fileContent));
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Extract text items and join them
      const pageText = content.items
        .map(item => (item as TextItem).str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    // Basic cleanup
    fullText = fullText.replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines
    fullText = fullText.replace(/\s{2,}/g, ' ');    // Remove excessive whitespace
    
    return fullText.trim();
  } catch (e) {
    console.error('Failed to extract text from PDF:', e);
    throw new Error(`Failed to extract text from PDF: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function validateTranscriptQuality(transcript: string): [boolean, string] {
  if (!transcript || transcript.trim().length < 50) {
    return [false, "Transcript too short for meaningful analysis"];
  }
  
  // Helper function to escape regex special characters
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
  
  // Check for common transcription errors
  const errorIndicators = ["[inaudible]", "[unclear]", "???", "..."];
  const errorCount = errorIndicators.reduce(
    (count, indicator) => {
      try {
        return count + (transcript.toLowerCase().match(new RegExp(escapeRegExp(indicator), 'g')) || []).length;
      } catch (e) {
        console.warn(`Invalid regex pattern: ${indicator}`, e);
        return count;
      }
    },
    0
  );
  
  if (errorCount > transcript.split(' ').length * 0.1) {  // More than 10% errors
    return [false, "Transcript quality too poor for reliable analysis"];
  }
  
  // Check if it looks like an interview (has questions or dialogue markers)
  const questionIndicators = [
    "?", "tell me", "describe", "explain", "what is", "how do", "why", 
    "Interviewer:", "interviewer:", "Candidate:", "candidate:"
  ];
  const hasQuestions = questionIndicators.some(indicator => 
    transcript.toLowerCase().includes(indicator.toLowerCase())
  );
  
  // Look for conversation patterns - alternating speakers
  const lines = transcript.split("\n");
  let speakerPattern = false;
  
  for (let i = 1; i < lines.length; i++) {
    if ((lines[i].startsWith("Interviewer:") && lines[i-1].startsWith("Candidate:")) ||
        (lines[i].startsWith("Candidate:") && lines[i-1].startsWith("Interviewer:"))) {
      speakerPattern = true;
      break;
    }
  }
  
  // Accept either question indicators or speaker patterns
  if (!(hasQuestions || speakerPattern)) {
    return [false, "Content does not appear to be an interview format"];
  }
  
  return [true, "Transcript quality acceptable"];
}

async function formatWithOpenAI(transcript: string, prompt: string): Promise<string> {
  try {
    // Check if transcript is already in a dialog format
    const isDialogFormat = transcript.split('\n').some(line => 
      line.trim().startsWith("Interviewer:") || line.trim().startsWith("Candidate:")
    );
    
    let systemMessage: string;
    let modifiedPrompt: string;
    
    if (isDialogFormat) {
      systemMessage = "You are a helpful assistant that formats interview transcripts while preserving the dialog structure.";
      modifiedPrompt = `Format this interview transcript maintaining the Interviewer/Candidate structure. Keep all content, just improve the formatting for readability:\n\n${transcript}`;
    } else {
      systemMessage = "You are a helpful assistant that formats and summarizes video transcripts.";
      modifiedPrompt = `${prompt}\n\nTranscript:\n${transcript}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: modifiedPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content || "";
  } catch (e) {
    console.error("OpenAI API error:", e);
    throw new Error(`OpenAI API error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function assessSkillsWithOpenAI(transcript: string, skills: string[], jobRole: string = "Software Developer"): Promise<SkillAssessment[]> {
  try {
    // Validate inputs
    if (!skills || skills.length === 0) {
      throw new Error("No skills provided for assessment");
    }
    
    if (skills.length > 20) {
      console.warn("Too many skills requested. Limiting to first 20 skills.");
      skills = skills.slice(0, 20);
    }
    
    const skillsText = skills.join(", ");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert technical interviewer analyzing a ${jobRole} interview transcript. 
                    Assess each skill based on evidence in the transcript. Be thorough but fair in your assessment.
                    If a skill is not mentioned or demonstrated, mark it as 'Not Demonstrated'.
                    Provide specific evidence and actionable recommendations.
                    
                    You MUST return a JSON response with the following structure:
                    {
                      "assessments": [
                        {
                          "skill": "Skill Name",
                          "level": "Beginner|Intermediate|Advanced|Expert|Not Demonstrated",
                          "confidence_score": 75,
                          "evidence": "Evidence from the transcript supporting this assessment",
                          "recommendations": "Specific recommendations for improvement"
                        }
                      ]
                    }`
        },
        {
          role: "user",
          content: `Please assess the following skills based on this interview transcript: ${skillsText}

For each skill, provide:
1. Skill level (Beginner/Intermediate/Advanced/Expert/Not Demonstrated)
2. Confidence score (0-100)
3. Specific evidence from the transcript
4. Recommendations for improvement

IMPORTANT: Your response MUST be a valid JSON object with an "assessments" array containing assessment objects for each skill.

Example response format:
{
  "assessments": [
    {
      "skill": "JavaScript",
      "level": "Intermediate",
      "confidence_score": 75,
      "evidence": "Candidate demonstrated understanding of closures and async/await, but struggled with prototype inheritance",
      "recommendations": "Practice more advanced JavaScript concepts like prototype chains and functional programming patterns"
    },
    {
      "skill": "React",
      "level": "Advanced",
      "confidence_score": 85,
      "evidence": "Candidate showed deep knowledge of React hooks, context API, and performance optimization",
      "recommendations": "Consider exploring more advanced state management patterns beyond context"
    }
  ]
}

IMPORTANT: Use the transcript to assess the skills. Do not make up any information.

Transcript starts here:
${transcript}
Transcript ends here`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("Skill assessment result:", JSON.stringify(result, null, 2).substring(0, 200) + "...");
    
    if (!result.assessments || !Array.isArray(result.assessments)) {
      console.error("Invalid response format. Got:", JSON.stringify(result, null, 2).substring(0, 500));
      throw new Error("Invalid response format from OpenAI API");
    }
    
    // Convert to SkillAssessment objects
    return result.assessments as SkillAssessment[];
  } catch (e) {
    console.error("Skill assessment error:", e);
    throw new Error(`Skill assessment error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function extractQAWithOpenAI(transcript: string, jobRole: string = "Software Developer"): Promise<QuestionAnswer[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert technical interviewer analyzing a ${jobRole} interview transcript.
                    Extract all question-answer pairs and grade each answer objectively.
                    Focus on technical accuracy, communication clarity, and completeness of answers.
                    
                    You MUST return a JSON response with the following structure:
                    {
                      "qa_pairs": [
                        {
                          "question": "The exact question asked",
                          "answer": "The candidate's complete answer",
                          "grade": "Excellent|Good|Average|Below Average|Poor",
                          "score": 85,
                          "feedback": "Detailed feedback on the answer",
                          "key_points_covered": ["Point 1", "Point 2"],
                          "areas_for_improvement": ["Area 1", "Area 2"]
                        }
                      ]
                    }`
        },
        {
          role: "user",
          content: `Please extract all interview questions and answers from this transcript and grade each answer.

For each Q&A pair, provide:
1. The exact question asked
2. The candidate's complete answer
3. Grade (Excellent/Good/Average/Below Average/Poor)
4. Numerical score (0-100)
5. Detailed feedback
6. Key points the candidate covered well
7. Areas for improvement

IMPORTANT: Your response MUST be a valid JSON object with a "qa_pairs" array containing Q&A objects.

Example response format:
{
  "qa_pairs": [
    {
      "question": "Can you explain how React's virtual DOM works?",
      "answer": "React's virtual DOM is an in-memory representation of the real DOM...",
      "grade": "Good",
      "score": 80,
      "feedback": "The candidate provided a clear explanation of the virtual DOM concept...",
      "key_points_covered": [
        "In-memory representation",
        "Diffing algorithm",
        "Performance benefits"
      ],
      "areas_for_improvement": [
        "Could explain reconciliation process in more detail",
        "Did not mention keys and their importance"
      ]
    }
  ]
}

IMPORTANT: Use the transcript to assess the Q&A pairs. Do not make up any information.

Transcript starts here:
${transcript}
Transcript ends here:
`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("QA extraction result:", JSON.stringify(result, null, 2).substring(0, 200) + "...");
    
    if (!result.qa_pairs || !Array.isArray(result.qa_pairs)) {
      console.error("Invalid QA response format. Got:", JSON.stringify(result, null, 2).substring(0, 500));
      throw new Error("Invalid response format from OpenAI API");
    }
    
    return result.qa_pairs as QuestionAnswer[];
  } catch (e) {
    console.error("Q&A extraction error:", e);
    throw new Error(`Q&A extraction error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function generateInterviewInsightsWithOpenAI(transcript: string, jobRole: string = "Software Developer"): Promise<InterviewInsights> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a senior HR professional and technical interview expert analyzing a ${jobRole} interview.
                    Provide comprehensive insights covering all aspects of the candidate's performance.
                    Be objective, constructive, and provide actionable feedback.
                    
                    You MUST return a JSON response with the following structure:
                    {
                      "overall_performance_score": 82,
                      "communication_clarity": 85,
                      "technical_depth": 80,
                      "problem_solving_ability": 78,
                      "confidence_level": 75,
                      "strengths": ["Strength 1", "Strength 2"],
                      "weaknesses": ["Weakness 1", "Weakness 2"],
                      "key_achievements_mentioned": ["Achievement 1", "Achievement 2"],
                      "red_flags": ["Red flag 1", "Red flag 2"],
                      "interview_duration_analysis": "Analysis of interview duration",
                      "speech_patterns": "Analysis of speech patterns",
                      "engagement_level": "Analysis of engagement level",
                      "cultural_fit_indicators": ["Indicator 1", "Indicator 2"],
                      "hiring_recommendation": "Detailed hiring recommendation",
                      "next_steps": ["Next step 1", "Next step 2"]
                    }`
        },
        {
          role: "user",
          content: `Please provide a comprehensive analysis of this interview transcript including:

1. Overall performance metrics (0-100 scores)
2. Strengths and weaknesses
3. Communication and technical analysis
4. Cultural fit indicators
5. Red flags or concerns
6. Hiring recommendation
7. Next steps

IMPORTANT: Your response MUST be a valid JSON object with all the required fields.

Example response format:
{
  "overall_performance_score": 82,
  "communication_clarity": 85,
  "technical_depth": 80,
  "problem_solving_ability": 78,
  "confidence_level": 75,
  "strengths": [
    "Strong understanding of React fundamentals",
    "Clear communication style",
    "Good problem-solving approach"
  ],
  "weaknesses": [
    "Limited experience with backend technologies",
    "Some hesitation when discussing system design"
  ],
  "key_achievements_mentioned": [
    "Led frontend development for e-commerce project",
    "Contributed to open-source React library"
  ],
  "red_flags": [
    "Inconsistent answers about past experience",
    "Showed frustration with certain questions"
  ],
  "interview_duration_analysis": "The interview lasted approximately 45 minutes with good pacing throughout",
  "speech_patterns": "Candidate speaks clearly with occasional pauses when considering technical concepts",
  "engagement_level": "Candidate showed high engagement throughout, asking clarifying questions when needed",
  "cultural_fit_indicators": [
    "Expressed interest in collaborative environments",
    "Values continuous learning",
    "Mentioned preference for agile methodologies"
  ],
  "hiring_recommendation": "Recommend moving forward to the next round with focus on testing backend knowledge",
  "next_steps": [
    "Technical assessment focusing on full-stack capabilities",
    "Team culture interview",
    "Reference check from previous employment"
  ]
}

IMPORTANT: Use the transcript to assess the interview insights. Do not make up any information.

Transcript starts here:
${transcript}
Transcript ends here:
`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("Interview insights result:", JSON.stringify(result, null, 2).substring(0, 200) + "...");
    
    // Validate required fields
    const requiredFields = [
      "overall_performance_score", "communication_clarity", "technical_depth",
      "problem_solving_ability", "confidence_level", "strengths", "weaknesses",
      "key_achievements_mentioned", "red_flags", "interview_duration_analysis",
      "speech_patterns", "engagement_level", "cultural_fit_indicators",
      "hiring_recommendation", "next_steps"
    ];
    
    const missingFields = requiredFields.filter(field => !(field in result));
    if (missingFields.length > 0) {
      console.error("Missing fields in interview insights:", missingFields);
      console.error("Got:", JSON.stringify(result, null, 2).substring(0, 500));
      throw new Error(`Invalid response format: missing fields ${missingFields.join(', ')}`);
    }
    
    return result as InterviewInsights;
  } catch (e) {
    console.error("Interview insights generation error:", e);
    throw new Error(`Interview insights generation error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function generateAnalysisSummaryWithOpenAI(
  skillAssessments: SkillAssessment[],
  qaAnswers: QuestionAnswer[],
  insights: InterviewInsights,
  jobRole: string = "Software Developer",
  transcript: string
): Promise<string> {
  try {
    // Calculate averages
    const avgSkillScore = skillAssessments.length > 0
      ? skillAssessments.reduce((sum, sa) => sum + sa.confidence_score, 0) / skillAssessments.length
      : 0;
      
    const avgQAScore = qaAnswers.length > 0
      ? qaAnswers.reduce((sum, qa) => sum + qa.score, 0) / qaAnswers.length
      : 0;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert HR analyst creating an executive summary for a ${jobRole} interview analysis.
                   Your summary should be concise, professional, and highlight the most important aspects of the candidate's performance.
                   Focus on providing actionable insights that would be valuable to a hiring manager.`
        },
        {
          role: "user",
          content: `Create a comprehensive executive summary based on this interview analysis:

Average Skill Assessment Score: ${avgSkillScore.toFixed(1)}/100
Average Q&A Performance Score: ${avgQAScore.toFixed(1)}/100
Overall Performance Score: ${insights.overall_performance_score}/100

Key Strengths: ${insights.strengths.slice(0, 3).join(', ')}
Key Weaknesses: ${insights.weaknesses.slice(0, 3).join(', ')}
Hiring Recommendation: ${insights.hiring_recommendation}

Please provide a 2-3 paragraph executive summary suitable for hiring managers. Focus on being clear, concise, and actionable.

IMPORTANT: Use the transcript to assess the interview insights. Do not make up any information.

Transcript starts here:
${transcript}
Transcript ends here:
`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    console.log("Summary generation result:", 
      (response.choices[0].message.content || "").substring(0, 200) + "...");
    
    return response.choices[0].message.content || "Summary generation failed";
  } catch (e) {
    console.error("Summary generation error:", e);
    return `Summary generation failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Check if file is provided (required)
    const file = formData.get("file");
    if (!file) {
      return Response.json(
        { detail: "Transcript file is required" },
        { status: 400 }
      );
    }

    // Get skills to assess - use what's provided or fall back to defaults
    let skills_to_assess = formData.get("skills_to_assess") || "";
    
    // If skills are empty, use default skills
    if (!skills_to_assess) {
      skills_to_assess = "Communication, Technical Knowledge, Problem Solving, Collaboration, Leadership";
    }
    
    console.log("Skills to assess:", skills_to_assess);
    
    const job_role = formData.get("job_role")?.toString() || "Software Engineer";
    const company_name = formData.get("company_name")?.toString() || "Company";
    const ai_provider = formData.get("ai_provider")?.toString() || "openai";

    // Parse skills list
    const skills_list = skills_to_assess.toString()
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    // Validate skills list
    if (skills_list.length === 0) {
      skills_list.push("Communication", "Technical Knowledge", "Problem Solving");
      console.log("No valid skills provided, using defaults:", skills_list);
    }

    // Validate AI provider
    if (ai_provider !== "openai") {
      console.log("Warning: Only OpenAI is supported, switching to OpenAI");
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { detail: "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    // Extract file content
    let raw_transcript = "";
    
    try {
      if (file instanceof Blob) {
        if (file.name?.toLowerCase().endsWith('.pdf')) {
          // For PDF files, we need to extract text
          const arrayBuffer = await file.arrayBuffer();
          raw_transcript = await extractTextFromPdf(arrayBuffer);
        } else {
          // For text files, just read the content
          raw_transcript = await file.text();
        }
        
        console.log(`File content length: ${raw_transcript.length} characters`);
        console.log(`File content preview: ${raw_transcript.substring(0, 200)}...`);
      } else {
        return Response.json(
          { detail: "Invalid file format" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error extracting file content:", error);
      return Response.json(
        { detail: `Error extracting file content: ${error instanceof Error ? error.message : String(error)}` },
        { status: 400 }
      );
    }

    // Make sure we have content to analyze
    if (!raw_transcript || raw_transcript.trim().length < 50) {
      return Response.json(
        { detail: "Transcript is too short or empty. Please provide a valid interview transcript." },
        { status: 400 }
      );
    }

    // Step 1: Validate transcript quality
    const [is_valid, validation_message] = validateTranscriptQuality(raw_transcript);
    if (!is_valid) {
      console.log(`Warning: Transcript quality issue: ${validation_message}, proceeding anyway`);
      // Continue processing instead of returning an error
    }

    // Step 2: Format transcript
    console.log("Formatting transcript...");
    let formatted_transcript;
    try {
      formatted_transcript = await formatWithOpenAI(
        raw_transcript,
        `Please format this ${job_role} interview transcript for ${company_name} into a clear, well-structured format with proper paragraphs and speaker identification where possible. Don't include any other text in the response, just the formatted transcript. Don't use markdown formatting.`
      );
    } catch (error) {
      console.error("Error formatting transcript:", error);
      // If formatting fails, continue with raw transcript
      formatted_transcript = raw_transcript;
    }

    // Step 3: Parallel analysis
    console.log("Performing comprehensive analysis...");
    
    // Run analyses one at a time to avoid overwhelming the API
    let skill_assessments: SkillAssessment[] = [];
    let questions_and_answers: QuestionAnswer[] = [];
    let interview_insights: InterviewInsights | null = null;
    
    try {
      skill_assessments = await assessSkillsWithOpenAI(raw_transcript, skills_list, job_role);
    } catch (error) {
      console.error("Error assessing skills:", error);
      // Continue with empty skills
      skill_assessments = skills_list.map(skill => ({
        skill,
        level: SkillLevel.NOT_DEMONSTRATED,
        confidence_score: 0,
        evidence: "Error during skill assessment",
        recommendations: "Try again with a more detailed transcript"
      }));
    }
    
    try {
      questions_and_answers = await extractQAWithOpenAI(raw_transcript, job_role);
    } catch (error) {
      console.error("Error extracting Q&A pairs:", error);
      // Continue with empty Q&A
      questions_and_answers = [];
    }
    
    try {
      interview_insights = await generateInterviewInsightsWithOpenAI(raw_transcript, job_role);
    } catch (error) {
      console.error("Error generating interview insights:", error);
      // Create a default insights object
      interview_insights = {
        overall_performance_score: 50,
        communication_clarity: 50,
        technical_depth: 50,
        problem_solving_ability: 50,
        confidence_level: 50,
        strengths: ["Unable to determine strengths"],
        weaknesses: ["Unable to determine weaknesses"],
        key_achievements_mentioned: [],
        red_flags: [],
        interview_duration_analysis: "Unable to analyze interview duration",
        speech_patterns: "Unable to analyze speech patterns",
        engagement_level: "Unable to analyze engagement level",
        cultural_fit_indicators: [],
        hiring_recommendation: "Unable to provide hiring recommendation due to analysis error",
        next_steps: ["Review transcript manually", "Consider re-running analysis"]
      };
    }

    // Step 4: Generate executive summary
    console.log("Generating analysis summary...");
    let analysis_summary;
    try {
      analysis_summary = await generateAnalysisSummaryWithOpenAI(
        skill_assessments,
        questions_and_answers,
        interview_insights!,
        job_role,
        raw_transcript
      );
    } catch (error) {
      console.error("Error generating summary:", error);
      analysis_summary = "Unable to generate analysis summary due to an error during processing.";
    }

    // Step 5: Return comprehensive response
    const response: ComprehensiveAnalysisResponse = {
      filename: file instanceof File ? file.name : undefined,
      raw_transcript,
      formatted_transcript,
      ai_provider: "openai", // Always use OpenAI
      file_chunks: 1, // Since we're not chunking the transcript
      skill_assessments,
      questions_and_answers,
      interview_insights: interview_insights!,
      analysis_summary
    };

    return Response.json(response);
  } catch (error) {
    console.error("API route error:", error);
    return Response.json(
      { detail: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}