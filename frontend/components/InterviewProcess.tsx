import React from "react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

// This component assumes Tailwind CSS is configured in your project
// and you have a dark mode enabled, typically via a class on the html tag.

const workflowSteps = [
  {
    title: "Curation",
    description:
      "Share JDs for tailored interviewer selection. Optionally, review their resumes & calibrate. Obtain curated interview questions",
    number: "01",
  },
  {
    title: "Schedule",
    description:
      "Use FloSchedule to get candidate availability. Let FloConnect manage automated scheduling, follow-ups & rescheduling. Get notified",
    number: "02",
  },
  {
    title: "Interview",
    description:
      "Conduct unbiased proctored interviews 24x7x365 covering multiple skills such as design, coding and many more",
    number: "03",
  },
  {
    title: "Recommendation",
    description:
      "Receive 360 candidate feedback including recommendation, skill matrix, video recording with transcript and data driven insights.",
    number: "04",
  },
];

export default function WorkflowSectionDark() {
  const router = useRouter();
  return (
    <section className="py-24 bg-[#1D244F] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2663FF]/5 to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#2663FF]/10 via-transparent to-transparent"></div>
      
      {/* Floating elements */}
      <div className="absolute top-20 right-10 w-2 h-2 bg-[#2663FF]/60 rounded-full animate-pulse"></div>
      <div className="absolute bottom-40 left-20 w-1 h-1 bg-[#f7a828]/60 rounded-full animate-ping"></div>
      <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-[#f7a828]/40 rounded-full animate-bounce"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/10 to-[#2663FF]/5 rounded-full border border-[#2663FF]/20 backdrop-blur-sm mb-6"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-sm font-medium text-[#F7F7FA]">
              Our Process
            </span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-[#F7F7FA] to-[#F7F7FA]/80 bg-clip-text text-transparent">
            How Does Interview 
            <br />
            <span className="bg-gradient-to-r from-[#2663FF] to-[#2663FF]/80 bg-clip-text text-transparent">
              Outsourcing Work?
            </span>
          </h2>

          <p className="text-xl text-[#F7F7FA]/80 max-w-3xl mx-auto leading-relaxed mb-8">
            Simplify your technical interview process with our end-to-end solution
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } },
          }}
        >
          {workflowSteps.map((step, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={{
                hidden: { opacity: 0, y: 50 },
                visible: (i) => ({
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: i * 0.1,
                    duration: 0.6,
                    ease: [0.215, 0.61, 0.355, 1.0],
                  },
                }),
              }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
              className="group relative"
            >
              {/* Glowing background effect */}
              <div
                className="absolute -inset-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"
              />
              
              <div className="relative bg-[#1D244F]/80 shadow-xl overflow-hidden rounded-3xl border border-[#5B5F79]/30 hover:border-[#2663FF]/20 transition-all duration-500 h-full">
                <div className="p-8 space-y-6 relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#2663FF] to-[#1D244F] rounded-2xl text-white shadow-lg">
                      <span className="text-xl font-bold">{step.number}</span>
                    </div>
                    
                    <motion.div 
                      className="hidden md:block text-4xl font-extrabold text-[#2663FF]/10"
                      whileHover={{ scale: 1.1 }}
                    >
                      {step.number}
                    </motion.div>
                  </div>
                  
                  <div className="space-y-3 flex-grow">
                    <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                    <p className="text-[#F7F7FA]/80 leading-relaxed">{step.description}</p>
                  </div>
                  
                  <motion.div
                    className="flex items-center gap-2 text-[#F7F7FA]/60 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-2"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-sm text-[#2663FF]">Learn more</span>
                    <ArrowRight className="w-4 h-4 text-[#2663FF]" />
                  </motion.div>
                </div>
              </div>
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
            className="group bg-[#f7a828] hover:bg-[#f7a828]/90 shadow-2xl hover:shadow-[#f7a828]/25 transform hover:-translate-y-1 transition-all duration-300 text-white"
            onClick={() => router.push("/create-interview")}
          >
            <span className="flex items-center gap-2">
              Interview as a Service
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
