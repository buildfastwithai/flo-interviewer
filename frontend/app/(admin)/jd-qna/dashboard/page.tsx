"use client";

import { useState } from "react";
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
  Search,
  Filter,
  Sparkles,
  Database,
} from "lucide-react";
import Link from "next/link";
import { useDashboard } from "@/hooks/useDashboard";
import { Question, Skill } from "@/types/dashboard";
import { motion } from "framer-motion";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const COLORS = {
  primary: "#2663FF",
  secondary: "#1D244F",
  accent: "#f7a828",
  success: "#10B981",
  error: "#EF4444",
  muted: "#5B5F79",
  background: "#F7F7FA"
};

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2663FF]"></div>
          <p className="text-[#1D244F] font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Card className="w-96 border-red-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#5B5F79]">{error}</p>
            <Button 
              onClick={refetch} 
              className="w-full bg-[#2663FF] hover:bg-[#2663FF]/90 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
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
    <div className="container mx-auto p-6 space-y-8 bg-white min-h-screen">
      <motion.div 
            className="w-full flex justify-center mb-6 space-x-3 text-center justify-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-[#2663FF]" />
                JD QnA
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna/dashboard" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-[#2663FF]" />
                Dashboard
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/create-interview" className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-[#2663FF]" />
                Create Interview
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/interview-evaluation" className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-[#2663FF]" />
                Interview Evaluation
              </Link>
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="border-[#2663FF]/20 hover:bg-[#2663FF]/5 transition-all duration-300"
            >
              <Link href="/jd-qna/records" className="flex items-center">
                <Database className="h-4 w-4 mr-2 text-[#2663FF]" />
                View Saved Records
              </Link>
            </Button>
          </motion.div>
      {/* Header */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-center gap-4 mb-8"
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-1 text-center justify-center">
          <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-[#2663FF]" />
              <span className="text-sm font-medium">AI-Powered Interview Analytics</span>
            </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1D244F]">Analytics Dashboard</h1>
          <p className="text-[#5B5F79]">
            Comprehensive overview of your JD analysis and question generation metrics
          </p>
        </div>
        {/* <div className="flex items-center gap-3">
          <Button 
            onClick={refetch}
            variant="outline" 
            className="border-[#2663FF] text-[#2663FF] hover:bg-[#2663FF]/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/jd-qna">
            <Button 
              variant="default"
              className="bg-[#2663FF] hover:bg-[#2663FF]/90 text-white"
            >
              Back to Home
            </Button>
          </Link>
        </div> */}
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {[
          {
            title: "Job Descriptions",
            value: statistics.totalRecords,
            icon: FileText,
            description: "Total JDs analyzed",
            color: "bg-gradient-to-br from-[#2663FF] to-[#1D244F]"
          },
          {
            title: "Questions Generated",
            value: statistics.totalQuestions,
            icon: MessageSquare,
            description: "Total questions created",
            color: "bg-gradient-to-br from-[#f7a828] to-[#f7a828]/80"
          },
          {
            title: "Feedback Received",
            value: statistics.totalFeedbacks,
            icon: Target,
            description: "Total feedback entries",
            color: "bg-gradient-to-br from-[#2663FF] to-[#1D244F]"
          },
          {
            title: "Regenerations",
            value: statistics.totalRegenerations || 0,
            icon: RefreshCw,
            description: "Question improvements",
            color: "bg-gradient-to-br from-[#f7a828] to-[#f7a828]/80"
          }
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="group"
            whileHover={{ y: -4 }}
          >
            <Card className="border border-[#F7F7FA] shadow-md hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className={`p-3 rounded-xl ${stat.color} w-fit`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-[#5B5F79]">
                        {stat.title}
                      </h3>
                      <p className="text-2xl font-bold text-[#1D244F]">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <div className="hidden group-hover:block">
                    <Badge 
                      variant="secondary"
                      className="bg-[#F7F7FA] text-[#5B5F79] text-xs"
                    >
                      {stat.description}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Regeneration Analytics Section */}
      {statistics.totalRegenerations > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border border-[#F7F7FA] shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#F7F7FA] pb-6">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-[#1D244F]">
                  <RefreshCw className="h-5 w-5 text-[#2663FF]" />
                  Question Regeneration Analytics
                </CardTitle>
                <CardDescription className="text-[#5B5F79]">
                  Insights into question regeneration patterns and quality improvements
                </CardDescription>
              </div>
              <Badge 
                variant="secondary" 
                className="bg-[#F7F7FA] text-[#2663FF] border border-[#2663FF]/20"
              >
                {statistics.totalRegenerations} Total Regenerations
              </Badge>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Regeneration Summary */}
                <motion.div 
                  className="space-y-4"
                >
                  <h4 className="text-sm font-medium text-[#5B5F79]">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-[#F7F7FA] rounded-xl bg-gradient-to-br from-[#2663FF]/5 to-transparent">
                      <div className="text-2xl font-bold text-[#2663FF]">
                        {statistics.totalRegenerations}
                      </div>
                      <div className="text-xs text-[#5B5F79]">
                        Total Regenerations
                      </div>
                    </div>
                    <div className="p-4 border border-[#F7F7FA] rounded-xl bg-gradient-to-br from-[#f7a828]/5 to-transparent">
                      <div className="text-2xl font-bold text-[#f7a828]">
                        {statistics.regenerationStats?.averageRegenerationsPerQuestion || 0}
                      </div>
                      <div className="text-xs text-[#5B5F79]">
                        Avg per Question
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Most Regenerated Skills */}
                <motion.div 
                  className="space-y-4"
                >
                  <h4 className="text-sm font-medium text-[#5B5F79]">Top Regenerated Skills</h4>
                  <div className="space-y-3">
                    {statistics.regenerationStats?.mostRegeneratedSkills
                      ?.slice(0, 4)
                      .map((skill, index) => (
                        <motion.div
                          key={index}
                          className="flex justify-between items-center p-3 bg-[#F7F7FA] rounded-xl hover:bg-[#2663FF]/5 transition-colors duration-200"
                          whileHover={{ x: 5 }}
                        >
                          <span className="text-sm font-medium text-[#1D244F] truncate max-w-[70%]">
                            {skill.skillName}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-white border-[#2663FF] text-[#2663FF] text-xs font-semibold"
                          >
                            {skill.regenerationCount} regenerations
                          </Badge>
                        </motion.div>
                      )) || (
                      <p className="text-sm text-[#5B5F79] text-center py-4">
                        No data available
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
