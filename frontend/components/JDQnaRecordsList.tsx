"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChevronRight,
  Briefcase,
  Clock,
  BarChart3,
  Database,
  Sparkles,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

type RecordItem = {
  id: string;
  jobTitle: string;
  createdAt: string | Date;
  _count: {
    skills: number;
    questions: number;
  };
};

export default function JDQnaRecordsList({
  records,
}: {
  records: RecordItem[];
}) {
  return (
    <div className="min-h-screen bg-white p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>

      <div className="p-4 relative z-10">
        <div className="mb-10 space-y-6">
          <motion.div className="w-full flex justify-center mb-6 space-x-3">
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

          <div className="space-y-2 text-center justify-center mb-10 flex flex-col items-center">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-[#2663FF]" />
              <span className="text-sm font-medium">
                AI-Powered Job Skill Records
              </span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1D244F] text-center justify-center">
              Job Skill Records
            </h1>
            <p className="text-xl text-[#5B5F79] max-w-2xl  text-center justify-center mx-auto">
              View and manage your saved job skill records
            </p>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {records.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-[#5B5F79] mb-6 text-lg">
                No job records found.
              </p>
              <Button
                asChild
                className="group bg-[#f7a828] hover:bg-[#f7a828]/90 shadow-2xl hover:shadow-[#f7a828]/25 transform hover:-translate-y-1 transition-all duration-300 text-white"
              >
                <Link href="/jd-qna">Create Your First Record</Link>
              </Button>
            </div>
          ) : (
            records.map((record) => (
              <motion.div
                key={record.id}
                variants={item}
                className="group"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="relative bg-white border border-[#F7F7FA] hover:border-[#2663FF]/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

                  <CardHeader className="relative z-10">
                    <CardTitle className="text-xl font-bold text-[#1D244F] truncate">
                      {record.jobTitle}
                    </CardTitle>
                    <CardDescription className="text-[#5B5F79]">
                      Created{" "}
                      {formatDistanceToNow(new Date(record.createdAt), {
                        addSuffix: true,
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex justify-between text-sm mb-6">
                      <div className="flex items-center gap-2 text-[#5B5F79]">
                        <Briefcase className="w-4 h-4" />
                        <span className="font-medium">
                          {record._count.skills}
                        </span>{" "}
                        Skills
                      </div>
                      <div className="flex items-center gap-2 text-[#5B5F79]">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">
                          {record._count.questions}
                        </span>{" "}
                        Questions
                      </div>
                    </div>
                    <Button
                      asChild
                      className="w-full group bg-[#f7a828] hover:bg-[#f7a828]/90 text-white shadow-lg hover:shadow-xl hover:shadow-[#f7a828]/20 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <Link
                        href={`/jd-qna/records/${record.id}`}
                        className="flex items-center justify-center"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
