"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  Users,
  Star,
  Video,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/navbar";
import { useTheme } from "next-themes";
import { MagicCard } from "@/components/magicui/magic-card";
import { Meteors } from "@/components/magicui/meteors";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import WorkflowSectionDark from "@/components/InterviewProcess";
import { MarqueeDemo } from "@/components/marquee";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.215, 0.61, 0.355, 1.0],
    },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.215, 0.61, 0.355, 1.0],
    },
  },
};

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <main className="pt-5 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white font-sans relative min-h-screen overflow-hidden">
      {/* <Pointer /> */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 px-6 min-h-[90vh] flex items-center overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-pink-600/20 opacity-30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        <Meteors />

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400/60 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-purple-400/60 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-pink-400/40 rounded-full animate-bounce"></div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
          <motion.div
            className="flex-1 space-y-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, x: -60 },
              visible: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.8, ease: "easeOut" },
              },
            }}
          >
            <BoxReveal>
              <div className="space-y-4">
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-200">
                    AI-Powered Interview Platform
                  </span>
                </motion.div>

                <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                  Hire{" "}
                  <span className="relative">
                    <AnimatedGradientText className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Any Talent
                    </AnimatedGradientText>
                    <motion.div
                      className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 1, duration: 0.8 }}
                    />
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    10x faster, smarter at scale
                  </span>
                </h1>
              </div>
            </BoxReveal>

            <BoxReveal>
              <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
                Empower your hiring process with our interview-as-a-service
                solution. Conduct technical interviews outsourcing by our
                seasoned experts.
                <span className="text-blue-400 font-semibold">
                  {" "}
                  Scale effortlessly
                </span>{" "}
                with
                <span className="text-purple-400 font-semibold">
                  {" "}
                  24x7x365 availability
                </span>
                .
              </p>
            </BoxReveal>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <InteractiveHoverButton className="group bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-full px-8 py-4 text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-orange-500/40 transform hover:-translate-y-1">
                <span className="flex items-center gap-2">
                  Request Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </InteractiveHoverButton>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative flex-1 max-w-lg"
            initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative">
              {/* Glowing border effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-[3rem] opacity-20 blur-xl animate-pulse"></div>

              <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-[2.5rem] p-4 border border-gray-700/50">
                <Image
                  src="/people.png"
                  alt="Developer"
                  width={500}
                  height={500}
                  className="rounded-[2rem] shadow-2xl w-full h-auto"
                />

                {/* Floating Stats Cards */}
                <motion.div
                  className="absolute -bottom-4 -left-4 bg-gradient-to-br from-green-500/90 to-emerald-600/90 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-green-400/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-lg">96% Match</p>
                      <p className="text-xs text-green-100">
                        Interview Scorecard
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute -top-4 -right-4 bg-gradient-to-br from-blue-500/90 to-purple-600/90 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-blue-400/20"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-lg">24/7</p>
                      <p className="text-xs text-blue-100">AI Available</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-24 bg-gradient-to-br from-gray-950/50 via-gray-900/30 to-gray-950/50 backdrop-blur-sm relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-500/20 backdrop-blur-sm mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-200">
                AI-Powered Solutions
              </span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Supercharge Hiring with
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Intelligence
              </span>
            </h2>

            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Transform your recruitment process with cutting-edge AI technology
              that delivers precision, speed, and unbiased evaluation.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.2 } },
            }}
          >
            {[
              {
                title: "JD Question Generator",
                description:
                  "Upload a Job Description and instantly generate custom interview questions using our Gen AI engine trained on 10K+ JDs.",
                icon: <Users className="w-8 h-8" />,
                gradient: "from-blue-500 to-cyan-500",
                bgGradient: "from-blue-500/20 to-cyan-500/20",
                link: "/jd-qna",
                launch: true,
                self: true,
              },

              {
                title: "AI Interviewer",
                description:
                  "Simulates real-time technical interviews with contextual follow-ups and live coding evaluation — freeing up your internal team.",
                icon: <Video className="w-8 h-8" />,
                gradient: "from-orange-500 to-red-500",
                bgGradient: "from-orange-500/20 to-red-500/20",
                link: "/create-interview",
                launch: true,
                self: true,
              },
              {
                title: "AI Interview Evaluation",
                description:
                  "Get automated, unbiased scoring and detailed feedback on candidate performance powered by our AI evaluation framework.",
                icon: <Star className="w-8 h-8" />,
                gradient: "from-green-500 to-emerald-500",
                bgGradient: "from-green-500/20 to-emerald-500/20",
                link: "https://interview-evaluation-jpnua.ondigitalocean.app",
                launch: false,
                self: false,
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                custom={i}
                className="group relative"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Glowing background effect */}
                <div
                  className={`absolute -inset-2 bg-gradient-to-r ${feature.bgGradient} rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`}
                />

                <MagicCard className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl overflow-hidden rounded-3xl shadow-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500">
                  <CardContent className="p-8 space-y-6 relative z-10">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl text-white shadow-lg`}
                    >
                      {feature.icon}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-white group-hover:text-blue-100 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                        {feature.description}
                      </p>
                    </div>

                    {feature.launch ? (
                      <Link
                        href={feature.link}
                        target={feature.self ? "_self" : "_blank"}
                        className="flex items-center gap-2 text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        Learn more <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Coming Soon
                      </span>
                    )}
                  </CardContent>
                </MagicCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Button
              size="lg"
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                Try AI Interview Suite
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>

        <motion.div
          className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10 px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
        >
          {[
            {
              count: "6.1K+",
              label: "Clients",
              gradient: "from-blue-400 to-cyan-400",
            },
            {
              count: "24Hr",
              label: "Turnaround",
              gradient: "from-green-400 to-emerald-400",
            },
            {
              count: "70%",
              label: "Hiring Accuracy",
              gradient: "from-orange-400 to-red-400",
            },
            {
              count: "700K+",
              label: "Interviews",
              gradient: "from-purple-400 to-pink-400",
            },
          ].map(({ count, label, gradient }, i) => (
            <motion.div
              key={i}
              custom={i}
              className="group relative"
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
                <p
                  className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-2`}
                >
                  {count}
                </p>
                <p className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                  {label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Workflow */}
      <WorkflowSectionDark />

      {/* Testimonials/Marquee */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"></div>
        <MarqueeDemo />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Delivering Leading
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Interview-as-a-Service Experience
              </span>
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {[
              {
                icon: <Clock className="w-8 h-8" />,
                title: "Automation",
                description:
                  "Streamline your entire interview process with intelligent automation that reduces manual effort by 90%.",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Expert Interviewers",
                description:
                  "Access our global network of 500+ certified technical interviewers available around the clock.",
                gradient: "from-green-500 to-emerald-500",
              },
              {
                icon: <CheckCircle className="w-8 h-8" />,
                title: "24/7 Support",
                description:
                  "Round-the-clock assistance ensuring your hiring process never stops, regardless of timezone.",
                gradient: "from-orange-500 to-red-500",
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Smart Structuring",
                description:
                  "AI-powered interview structuring that adapts to role requirements and candidate experience levels.",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                icon: <Video className="w-8 h-8" />,
                title: "Advanced Proctoring",
                description:
                  "Comprehensive monitoring and evaluation tools ensuring fair and unbiased interview experiences.",
                gradient: "from-indigo-500 to-blue-500",
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Analytics & Dashboard",
                description:
                  "Real-time insights and comprehensive analytics to optimize your hiring decisions and processes.",
                gradient: "from-teal-500 to-cyan-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                custom={i}
                className="group"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 hover:border-gray-600/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500">
                  <CardContent className="p-8 space-y-4 relative">
                    <div
                      className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-xl text-white shadow-lg mb-4`}
                    >
                      {feature.icon}
                    </div>

                    <h3 className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors">
                      {feature.title}
                    </h3>

                    <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                      {feature.description}
                    </p>

                    <motion.div
                      className="flex items-center gap-2 text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-2"
                      whileHover={{ x: 5 }}
                    >
                      <span className="text-sm">Explore feature</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Button
              size="lg"
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/25 transform hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                Start Interview as a Service
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
