import React from "react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

// This component assumes Tailwind CSS is configured in your project
// and you have a dark mode enabled, typically via a class on the html tag.

const workflowSteps = [
  {
    title: "Curation",
    description:
      "Share JDs for tailored interviewer selection. Optionally, review their resumes & calibrate. Obtain curated interview questions",
  },
  {
    title: "Schedule",
    description:
      "Use FloSchedule to get candidate availability. Let FloConnect manage automated scheduling, follow-ups & rescheduling. Get notified",
  },
  {
    title: "Interview",
    description:
      "Conduct unbiased proctored interviews 24x7x365 covering multiple skills such as design, coding and many more",
  },
  {
    title: "Recommendation",
    description:
      "Receive 360 candidate feedback including recommendation, skill matrix, video recording with transcript and data driven insights.",
  },
];

export default function WorkflowSectionDark() {
  return (
    <section className="py-16 bg-gray-900 text-white">
      {" "}
      {/* Dark background for the section */}
      <div className="max-w-6xl mx-auto text-center px-4">
        <h2 className="text-3xl font-bold mb-12">
          How Does Interview Outsourcing Work?
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {workflowSteps.map((step, index) => (
            <div
              key={index}
              // Tailwind classes for appearance and responsive layout
              // Cards will have a slightly lighter dark background than the section
              className="bg-gray-800 rounded-tl-3xl rounded-br-3xl shadow-lg border border-gray-700 p-6 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                0{index + 1}
              </div>
              <p className="text-xl font-semibold mb-2 text-white">
                {step.title}
              </p>{" "}
              {/* White text for titles */}
              <p className="text-sm text-gray-300">
                {" "}
                {/* Lighter gray for descriptions */}
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <motion.div
            whileHover={{ scale: 1.06 }}
            className="text-center mt-10"
          >
            <Button
              variant="default"
              size="lg"
              className="hover:shadow-orange-500/25"
            >
              Interview as a Service
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
