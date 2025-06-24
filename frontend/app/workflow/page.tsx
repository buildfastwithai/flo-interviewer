"use client";
import Image from "next/image";

const WorkflowPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Application Workflow
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Complete process flow of the interview system
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Diagram Container */}
          <div className="relative">
            {/* Scrollable wrapper */}
            <div className="overflow-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
              <div className="p-6 min-w-max">
                <div className="flex justify-center">
                  <div className="relative bg-white dark:bg-gray-700 rounded-lg p-4 shadow-inner">
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
              </div>
            </div>

            {/* Scroll indicators */}
            <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Scroll to explore
            </div>
          </div>

          {/* Footer with controls */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Use scroll or drag to navigate the diagram
              </div>
              <div className="flex gap-2">
                <button
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
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                >
                  Reset View
                </button>
                <button
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
                  className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Process Flow
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Complete end-to-end workflow from interview creation to candidate
              evaluation
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-4 h-4 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Key Features
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              AI-powered question generation, real-time evaluation, and
              comprehensive analytics
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analytics
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Detailed insights and performance metrics for continuous
              improvement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPage;
