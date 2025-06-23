"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart3 } from "lucide-react";
import { RegenerationDialog } from "@/components/RegenerationDialog";
import { RegenerationFeedback } from "@/components/RegenerationFeedback";
import { RegenerationAnalytics } from "@/components/RegenerationAnalytics";
import { Question } from "@/types/dashboard";

export default function RegenerationDemoPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [regenerationId, setRegenerationId] = useState("");

  // Example question for demo
  const exampleQuestion: Question = {
    id: "demo-question-1",
    content: JSON.stringify({
      question: "Explain the difference between REST and GraphQL APIs",
      answer:
        "REST uses multiple endpoints while GraphQL uses a single endpoint...",
      category: "Technical",
      difficulty: "Medium",
      questionFormat: "Open-ended",
    }),
    skillId: "demo-skill-1",
    recordId: "demo-record-1",
    liked: "NONE",
  };

  const handleRegenerationSuccess = (
    newQuestion: any,
    regenerationId: string
  ) => {
    console.log("Regeneration successful:", { newQuestion, regenerationId });
    setRegenerationId(regenerationId);
    setShowDialog(false);
    setShowFeedback(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Question Regeneration System Demo
        </h1>
        <p className="text-gray-600 mb-8">
          Explore the comprehensive question regeneration system with tracking,
          feedback, and analytics.
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Smart Regeneration
            </CardTitle>
            <CardDescription>
              AI-powered question regeneration with context awareness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Reason-based regeneration</li>
              <li>• Context-aware improvements</li>
              <li>• Multiple question formats</li>
              <li>• Feedback integration</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics & Tracking
            </CardTitle>
            <CardDescription>
              Comprehensive analytics for regeneration patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Regeneration frequency tracking</li>
              <li>• User satisfaction metrics</li>
              <li>• Skill-based insights</li>
              <li>• Trend analysis</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Loop</CardTitle>
            <CardDescription>
              Continuous improvement through user feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Like/dislike ratings</li>
              <li>• Detailed feedback capture</li>
              <li>• Quality improvement insights</li>
              <li>• Learning from patterns</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Demo Components */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Try the Regeneration System</CardTitle>
            <CardDescription>
              Click the buttons below to see different components in action
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={() => setShowDialog(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Open Regeneration Dialog
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowFeedback(!showFeedback)}
                disabled={!regenerationId}
              >
                {showFeedback ? "Hide" : "Show"} Feedback Component
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                {showAnalytics ? "Hide" : "Show"} Analytics Dashboard
              </Button>
            </div>

            {showFeedback && regenerationId && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Regeneration Feedback
                </h3>
                <RegenerationFeedback
                  regenerationId={regenerationId}
                  onFeedbackSubmitted={() => {
                    console.log("Feedback submitted for demo");
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {showAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle>Regeneration Analytics Dashboard</CardTitle>
              <CardDescription>
                Real-time analytics and insights (demo data)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegenerationAnalytics />
            </CardContent>
          </Card>
        )}
      </div>

      {/* API Endpoints Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Available endpoints for the regeneration system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded p-4">
              <h4 className="font-semibold text-green-600">
                POST /api/questions/[id]/regenerate
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Regenerate a question with optional reason and feedback
              </p>
              <pre className="text-xs bg-gray-100 p-2 mt-2 rounded">
                {`{
  "reason": "Question is too easy",
  "userFeedback": "Need more technical depth"
}`}
              </pre>
            </div>

            <div className="border rounded p-4">
              <h4 className="font-semibold text-blue-600">
                PATCH /api/regenerations/[id]/feedback
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Update feedback for a regeneration
              </p>
              <pre className="text-xs bg-gray-100 p-2 mt-2 rounded">
                {`{
  "liked": "LIKED",
  "userFeedback": "Much better question quality"
}`}
              </pre>
            </div>

            <div className="border rounded p-4">
              <h4 className="font-semibold text-purple-600">
                GET /api/analytics/regenerations
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Get regeneration analytics with optional filters
              </p>
              <pre className="text-xs bg-gray-100 p-2 mt-2 rounded">
                ?recordId=xxx&skillId=yyy&limit=10
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regeneration Dialog */}
      <RegenerationDialog
        question={exampleQuestion}
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={handleRegenerationSuccess}
      />
    </div>
  );
}
