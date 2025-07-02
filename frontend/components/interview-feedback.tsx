import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Brain,
  Award,
  Download,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface InterviewFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: any;
  candidateName?: string;
  loading?: boolean;
}

const InterviewFeedback: React.FC<InterviewFeedbackProps> = ({
  isOpen,
  onClose,
  feedback,
  candidateName = "Candidate",
  loading = false,
}) => {
  if (!feedback && !loading) return null;

  // Function to determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100 border-green-200";
    if (score >= 80) return "bg-emerald-100 border-emerald-200";
    if (score >= 70) return "bg-blue-100 border-blue-200";
    if (score >= 60) return "bg-yellow-100 border-yellow-200";
    if (score >= 50) return "bg-orange-100 border-orange-200";
    return "bg-red-100 border-red-200";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-0 rounded-xl">
        <div className="sticky top-0 z-10 bg-white">
          <DialogHeader className="bg-gradient-to-r from-[#1D244F] to-[#2663FF] text-white p-6 rounded-t-xl">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Award className="h-6 w-6 text-[#f7a828]" />
              Your Interview Feedback
            </DialogTitle>
            <DialogDescription className="text-gray-100 opacity-90">
              AI-generated insights based on your performance
            </DialogDescription>
          </DialogHeader>

          {/* Personalized Header */}
          <div className="bg-gradient-to-r from-[#1D244F]/10 to-[#2663FF]/10 p-4 border-b">
            <div className="flex justify-between items-center">
              <div className="font-medium text-[#1D244F]">
                Hello, {candidateName}!
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Your overall score:</span>
                <Badge 
                  className={`${getScoreBgColor(feedback?.overall_score || 0)} ${getScoreColor(feedback?.overall_score || 0)} px-3 py-1`}
                >
                  {feedback?.overall_score || "N/A"}/100
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2663FF] mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating your feedback...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Overall Score */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#1D244F]/5 to-[#2663FF]/5 p-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Star className="h-5 w-5 text-[#f7a828]" /> 
                    Performance Overview
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Overall Score</span>
                        <span className={`text-sm font-medium ${getScoreColor(feedback?.overall_score || 0)}`}>
                          {feedback?.overall_score || 0}/100
                        </span>
                      </div>
                      <Progress value={feedback?.overall_score || 0} className="h-2" />
                    </div>
                    
                    <div className="pt-2 text-sm leading-relaxed text-gray-700">
                      {feedback?.specific_feedback || "No specific feedback available."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Strengths and Areas for Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="bg-green-50 p-4">
                    <h3 className="text-lg font-medium text-green-700 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" /> 
                      Your Strengths
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {feedback?.strengths && feedback.strengths.length > 0 ? (
                        feedback.strengths.map((strength: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No strengths identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 10 }} 
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="bg-blue-50 p-4">
                    <h3 className="text-lg font-medium text-blue-700 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" /> 
                      Areas for Improvement
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {feedback?.areas_for_improvement && feedback.areas_for_improvement.length > 0 ? (
                        feedback.areas_for_improvement.map((area: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{area}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No areas for improvement identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Next Steps */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="bg-purple-50 p-4">
                  <h3 className="text-lg font-medium text-purple-700 flex items-center gap-2">
                    <Brain className="h-5 w-5" /> 
                    Recommended Next Steps
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {feedback?.next_steps && feedback.next_steps.length > 0 ? (
                      feedback.next_steps.map((step: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">No next steps provided</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        <DialogFooter className="border-t p-4 bg-gray-50">
          <Button onClick={onClose} className="bg-[#f7a828] hover:bg-[#f7a828]/90">
            Close
          </Button>
          {/* <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> 
            Download Feedback
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewFeedback;
