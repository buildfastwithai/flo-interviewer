"use client";

import { useState, useEffect } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { useRegeneration } from "@/hooks/useRegeneration";

interface RegenerationAnalyticsProps {
  recordId?: string;
  skillId?: string;
}

export function RegenerationAnalytics({
  recordId,
  skillId,
}: RegenerationAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  const { getRegenerationAnalytics } = useRegeneration();

  useEffect(() => {
    fetchAnalytics();
  }, [recordId, skillId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getRegenerationAnalytics({
        recordId,
        skillId,
        limit: 10,
      });
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No regeneration data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const satisfactionRate =
    analytics.userSatisfaction.liked + analytics.userSatisfaction.disliked > 0
      ? (analytics.userSatisfaction.liked /
          (analytics.userSatisfaction.liked +
            analytics.userSatisfaction.disliked)) *
        100
      : 0;

  const pieData = [
    {
      name: "Liked",
      value: analytics.userSatisfaction.liked,
      color: "#10B981",
    },
    {
      name: "Disliked",
      value: analytics.userSatisfaction.disliked,
      color: "#EF4444",
    },
    {
      name: "Neutral",
      value: analytics.userSatisfaction.neutral,
      color: "#6B7280",
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Regenerations
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.totalRegenerations}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.summary.totalQuestions} questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg per Question
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.averageRegenerationsPerQuestion}
            </div>
            <p className="text-xs text-muted-foreground">
              Regenerations per question
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Satisfaction Rate
            </CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {satisfactionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of rated regenerations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Issue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {analytics.regenerationReasons[0]?.reason || "No data"}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.regenerationReasons[0]?.count || 0} occurrences
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Regenerated Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Most Regenerated Skills</CardTitle>
            <CardDescription>
              Skills that require the most question regenerations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.mostRegeneratedSkills}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="skillName"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="regenerationCount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Satisfaction */}
        <Card>
          <CardHeader>
            <CardTitle>User Satisfaction</CardTitle>
            <CardDescription>
              How users rate regenerated questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent || 0).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Regeneration Trends */}
      {analytics.regenerationTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Regeneration Trends</CardTitle>
            <CardDescription>
              Daily regeneration activity over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.regenerationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip labelFormatter={(label) => `Date: ${label}`} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Regeneration Reasons */}
      {analytics.regenerationReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Regeneration Reasons</CardTitle>
            <CardDescription>
              Most common reasons users give for regenerating questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.regenerationReasons}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="reason"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={150}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Regenerations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Regenerations</CardTitle>
          <CardDescription>Latest regeneration activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentRegenerations.map((regen: any) => (
              <div
                key={regen.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{regen.skillName}</div>
                  <div className="text-sm text-gray-500">
                    {regen.reason || "No reason provided"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(regen.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {regen.liked === "LIKED" && (
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                  )}
                  {regen.liked === "DISLIKED" && (
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                  )}
                  {regen.hasUserFeedback && (
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      title="Has feedback"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
