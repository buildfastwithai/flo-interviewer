"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Meteors } from "@/components/magicui/meteors";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { MagicCard } from "@/components/magicui/magic-card";
import Navbar from "@/components/navbar";

const WorkflowPage = () => {
  return (
    <main className="min-h-screen bg-white text-[#1D244F] font-sans relative">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
        <Meteors />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* <BoxReveal> */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30 backdrop-blur-sm mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="w-4 h-4 text-[#2663FF]" />
                <span className="text-sm font-medium">Application Workflow</span>
              </motion.div>

              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Complete Process Flow of the{" "}
                <span className="relative">
                  <AnimatedGradientText className="bg-gradient-to-r from-[#1D244F] via-[#2663FF] to-[#2663FF] bg-clip-text text-transparent">
                    Interview System
                  </AnimatedGradientText>
                  <motion.div
                    className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#2663FF] to-[#1D244F] rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 1, duration: 0.8 }}
                  />
                </span>
              </h1>
           {/*  </BoxReveal> */}
          </motion.div>

          {/* Main Workflow Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative bg-white rounded-2xl shadow-xl border border-[#F7F7FA] overflow-hidden"
          >
            <div className="overflow-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-[#2663FF]/20 scrollbar-track-[#F7F7FA]">
              <div className="p-8 min-w-max">
                <Image
                  src="/flocareer-flo.svg"
                  alt="Application Workflow Diagram"
                  width={1000}
                  height={1000}
                  className="max-w-none h-auto"
                  priority
                />
              </div>
            </div>

            {/* Controls */}
            <div className="border-t border-[#F7F7FA] bg-white/90 backdrop-blur-sm px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-[#5B5F79]">
                  <ArrowRight className="w-4 h-4" />
                  Use scroll or drag to navigate the diagram
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      const container = document.querySelector(".overflow-auto");
                      if (container) {
                        container.scrollTo({
                          left: 0,
                          top: 0,
                          behavior: "smooth",
                        });
                      }
                    }}
                    variant="outline"
                    className="flex items-center gap-2 border-[#2663FF]/20 hover:bg-[#2663FF]/5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset View
                  </Button>
                  <Button
                    onClick={() => {
                      const img = document.querySelector(
                        'img[alt="Application Workflow Diagram"]'
                      ) as HTMLImageElement;
                      if (img) {
                        const link = document.createElement("a");
                        link.href = img.src;
                        link.download = "workflow-diagram.svg";
                        link.click();
                      }
                    }}
                    className="bg-[#f7a828] hover:bg-[#f7a828]/90 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Diagram
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
            initial="hidden"
            animate="visible"
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
                title: "Process Flow",
                description: "Complete end-to-end workflow from interview creation to candidate evaluation",
                icon: <Sparkles className="w-6 h-6" />,
                gradient: "from-[#2663FF] to-[#1D244F]",
              },
              {
                title: "Key Features",
                description: "AI-powered question generation, real-time evaluation, and comprehensive analytics",
                icon: <ArrowRight className="w-6 h-6" />,
                gradient: "from-[#f7a828] to-[#f7a828]/80",
              },
              {
                title: "Analytics",
                description: "Detailed insights and performance metrics for continuous improvement",
                icon: <Download className="w-6 h-6" />,
                gradient: "from-[#2663FF] to-[#1D244F]",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="group"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <MagicCard className="relative bg-white border border-[#F7F7FA] hover:border-[#2663FF]/20 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500">
                  <div className="p-6 space-y-4">
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg text-white shadow-lg`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-[#1D244F]">
                      {feature.title}
                    </h3>
                    <p className="text-gray-200 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </MagicCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default WorkflowPage;
