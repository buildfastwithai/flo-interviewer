"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ThumbsUp,
  ThumbsDown,
  FileText,
  Brain,
  MessageSquare,
  Target,
  TrendingUp,
  Clock,
  Users,
  Activity,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useDashboard } from "@/hooks/useDashboard";
import { Question, Skill } from "@/types/dashboard";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={refetch} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { statistics, skillRecords, recentActivity } = data;

  // Prepare chart data
  const questionLikesData = [
    { name: "Liked", value: statistics.questionLikes.liked, color: "#10B981" },
    {
      name: "Disliked",
      value: statistics.questionLikes.disliked,
      color: "#EF4444",
    },
    {
      name: "Neutral",
      value: statistics.questionLikes.neutral,
      color: "#6B7280",
    },
  ];

  const skillLevelData = statistics.skillLevelDistribution.map((item: any) => ({
    level: item.level.charAt(0) + item.level.slice(1).toLowerCase(),
    count: item.count!,
  }));

  const skillCategoryData = statistics.skillCategoryDistribution.map(
    (item: any) => ({
      category:
        (item.category?.charAt(0) ?? "") +
          (item.category?.slice(1).toLowerCase() ?? "") || "Unknown",
      count: item.count!,
    })
  );

  // Calculate dislike ratio data
  const totalFeedback =
    statistics.questionLikes.liked +
    statistics.questionLikes.disliked +
    statistics.questionLikes.neutral;
  const likedAndNeutral =
    statistics.questionLikes.liked + statistics.questionLikes.neutral;
  const dislikedCount = statistics.questionLikes.disliked;

  const dislikeRatio =
    totalFeedback > 0 ? (dislikedCount / totalFeedback) * 100 : 0;
  const positiveRatio =
    totalFeedback > 0 ? (likedAndNeutral / totalFeedback) * 100 : 0;

  const dislikeRatioData = [
    { name: "Positive/Neutral", value: positiveRatio, color: "#10B981" },
    { name: "Disliked", value: dislikeRatio, color: "#EF4444" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your skills, questions, and feedback
          </p>
        </div>
        <Link href="/jd-qna">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Job Description Generated
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              Job description records
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSkills}</div>
            <p className="text-xs text-muted-foreground">Extracted skills</p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Questions
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalQuestions}
            </div>
            <p className="text-xs text-muted-foreground">Generated questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Feedback
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalFeedbacks}
            </div>
            <p className="text-xs text-muted-foreground">Feedback entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Regenerations
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalRegenerations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Question regenerations
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Regenerations
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.regenerationStats?.averageRegenerationsPerQuestion ||
                0}
            </div>
            <p className="text-xs text-muted-foreground">Per question</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Regeneration Analytics Section */}
      {statistics.totalRegenerations > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Question Regeneration Analytics
              </CardTitle>
              <CardDescription>
                Insights into question regeneration patterns and quality
                improvements
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Regeneration Summary */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Quick Stats
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {statistics.totalRegenerations}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Regenerations
                    </div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.regenerationStats
                        ?.averageRegenerationsPerQuestion || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg per Question
                    </div>
                  </div>
                </div>
              </div>

              {/* Most Regenerated Skills */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Top Regenerated Skills
                </h4>
                <div className="space-y-2">
                  {statistics.regenerationStats?.mostRegeneratedSkills
                    ?.slice(0, 4)
                    .map((skill, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm font-medium truncate">
                          {skill.skillName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold"
                        >
                          {skill.regenerationCount}
                        </Badge>
                      </div>
                    )) || (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Question Likes Chart */}
        {/* <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Question Feedback</CardTitle>
            <CardDescription>
              Distribution of question likes/dislikes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={questionLikesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {questionLikesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-2">
              {questionLikesData.map((entry, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card> */}

        {/* Dislike Ratio Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Question Feedback</CardTitle>
            <CardDescription>
              Percentage of dislikes vs positive feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dislikeRatioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dislikeRatioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    `${typeof value === "number" ? value.toFixed(1) : value}%`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-2 mt-2">
              {dislikeRatioData.map((entry, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">
                    {entry.name}: {entry.value.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="text-center mt-2">
              <div className="text-lg font-semibold text-red-600">
                {dislikeRatio.toFixed(1)}% Dislike Rate
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skill Level Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Skill Levels</CardTitle>
            <CardDescription>Distribution by skill level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={skillLevelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Category Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Skill Categories</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={skillCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Regeneration Insights Chart */}
        {statistics.totalRegenerations > 0 &&
          statistics.regenerationStats?.mostRegeneratedSkills && (
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Most Regenerated Skills
                </CardTitle>
                <CardDescription>
                  Skills requiring the most question regenerations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={statistics.regenerationStats.mostRegeneratedSkills.slice(
                      0,
                      5
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="skillName"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="regenerationCount" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Higher regeneration counts may indicate opportunities for
                  question quality improvement
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Skill Records</TabsTrigger>
          <TabsTrigger value="questions">Questions & Feedback</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          {statistics.totalRegenerations > 0 && (
            <TabsTrigger value="regenerations">Regenerations</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Skill Records</CardTitle>
              <CardDescription>
                Complete list of job description records and their extracted
                skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Skills Count</TableHead>
                    <TableHead>Questions Count</TableHead>
                    <TableHead>Interview Length</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.jobTitle}
                      </TableCell>
                      <TableCell>{record.skills.length}</TableCell>
                      <TableCell>{record.questions.length}</TableCell>
                      <TableCell>
                        {record.interviewLength
                          ? `${record.interviewLength} min`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/jd-qna/records/${record.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Questions & Feedback</CardTitle>
              <CardDescription>
                All generated questions with their feedback status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillRecords.flatMap((record) =>
                    record.questions.map((question: Question) => (
                      <TableRow key={question.id}>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={question.content}>
                            {question.content}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.skills.find(
                            (s: Skill) => s.id === question.skillId
                          )?.name || "N/A"}
                        </TableCell>
                        <TableCell>{record.jobTitle}</TableCell>
                        <TableCell>
                          {question.feedback ? (
                            <div
                              className="max-w-xs truncate"
                              title={question.feedback}
                            >
                              {question.feedback}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No feedback
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {question.liked === "LIKED" && (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Liked
                            </Badge>
                          )}
                          {question.liked === "DISLIKED" && (
                            <Badge variant="destructive">
                              <ThumbsDown className="w-3 h-3 mr-1" />
                              Disliked
                            </Badge>
                          )}
                          {question.liked === "NONE" && (
                            <Badge variant="secondary">Neutral</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates and modifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg"
                  >
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{record.jobTitle}</span>
                        <Badge variant="outline">
                          {record.skills.length} skills
                        </Badge>
                        <Badge variant="outline">
                          {record._count.questions} questions
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Updated {new Date(record.updatedAt).toLocaleString()}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {record.skills
                          .slice(0, 3)
                          .map((skill, index: number) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill.name}
                            </Badge>
                          ))}
                        {record.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{record.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link href={`/records/${record.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regenerations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Question Regeneration Overview
              </CardTitle>
              <CardDescription>
                Comprehensive view of question regeneration activity and
                insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Regeneration Statistics Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.totalRegenerations}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Regenerations
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.regenerationStats
                      ?.averageRegenerationsPerQuestion || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg per Question
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {statistics.regenerationStats?.mostRegeneratedSkills
                      ?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Skills with Regenerations
                  </div>
                </div>

                {/* <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {statistics.totalQuestions > 0
                      ? (
                          (statistics.totalRegenerations /
                            statistics.totalQuestions) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Regeneration Rate
                  </div>
                </div> */}
              </div>

              {/* Top Regenerated Skills Table */}
              {statistics.regenerationStats?.mostRegeneratedSkills && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Most Regenerated Skills
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Skill Name</TableHead>
                          <TableHead className="text-center">
                            Regeneration Count
                          </TableHead>
                          <TableHead className="text-center">
                            Regeneration Rate
                          </TableHead>
                          {/* <TableHead>Impact</TableHead> */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.regenerationStats.mostRegeneratedSkills
                          .slice(0, 5)
                          .map((skill, index) => {
                            const regenerationRate =
                              statistics.totalRegenerations > 0
                                ? (
                                    (skill.regenerationCount /
                                      statistics.totalRegenerations) *
                                    100
                                  ).toFixed(1)
                                : 0;
                            const impact =
                              skill.regenerationCount > 3
                                ? "High"
                                : skill.regenerationCount > 1
                                ? "Medium"
                                : "Low";
                            const impactColor =
                              impact === "High"
                                ? "text-red-600"
                                : impact === "Medium"
                                ? "text-yellow-600"
                                : "text-green-600";

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {skill.skillName}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline">
                                    {skill.regenerationCount}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {regenerationRate}%
                                </TableCell>
                                {/* <TableCell>
                                  <span
                                    className={`font-medium ${impactColor}`}
                                  >
                                    {impact}
                                  </span>
                                </TableCell> */}
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {/* <div className="flex gap-3 pt-4">
                <Link href="/jd-qna/analytics/regenerations">
                  <Button className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    View Detailed Analytics
                  </Button>
                </Link>
                <Link href="/jd-qna/regeneration-demo">
                  <Button variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Regeneration Demo
                  </Button>
                </Link>
              </div> */}

              {/* Insights and Recommendations */}
              {/* <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">
                  💡 Insights & Recommendations
                </h4>
                <div className="text-sm text-blue-800 space-y-1">
                  {statistics.totalRegenerations === 0 ? (
                    <p>
                      No regenerations yet. This indicates good initial question
                      quality.
                    </p>
                  ) : (
                    <>
                      <p>
                        •{" "}
                        {statistics.regenerationStats
                          ?.averageRegenerationsPerQuestion > 1
                          ? "High regeneration rate suggests opportunities for improving initial question generation."
                          : "Low regeneration rate indicates good question quality."}
                      </p>
                      <p>
                        • Focus on improving questions for skills with highest
                        regeneration counts.
                      </p>
                      <p>
                        • Use regeneration feedback to enhance AI prompts and
                        question templates.
                      </p>
                    </>
                  )}
                </div>
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
