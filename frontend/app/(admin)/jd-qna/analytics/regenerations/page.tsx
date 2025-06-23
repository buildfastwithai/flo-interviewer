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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegenerationAnalytics } from "@/components/RegenerationAnalytics";
import { BarChart3, Download, Filter } from "lucide-react";

export default function RegenerationAnalyticsPage() {
  const [selectedRecord, setSelectedRecord] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Regeneration Analytics</h1>
              <p className="text-gray-600">
                Insights into question regeneration patterns and user feedback
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter analytics by specific records or skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select
                  value={selectedRecord}
                  onValueChange={setSelectedRecord}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by record" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Records</SelectItem>
                    {/* Add dynamic record options here */}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Skills</SelectItem>
                    {/* Add dynamic skill options here */}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRecord("");
                  setSelectedSkill("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <RegenerationAnalytics
        recordId={selectedRecord || undefined}
        skillId={selectedSkill || undefined}
      />

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Understanding Regeneration Metrics</CardTitle>
            <CardDescription>
              How to interpret the analytics data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  Total Regenerations
                </h4>
                <p className="text-sm text-gray-600">
                  The total number of times questions have been regenerated.
                  Higher numbers may indicate issues with initial question
                  quality for specific skills.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  Average per Question
                </h4>
                <p className="text-sm text-gray-600">
                  Average regenerations per question. Values above 1.0 suggest
                  systematic issues that need addressing.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  Satisfaction Rate
                </h4>
                <p className="text-sm text-gray-600">
                  Percentage of regenerations that users rated as better than
                  the original. Higher rates indicate successful improvements.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">
                  Most Regenerated Skills
                </h4>
                <p className="text-sm text-gray-600">
                  Skills with the highest regeneration counts may need prompt
                  engineering improvements or additional training data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
