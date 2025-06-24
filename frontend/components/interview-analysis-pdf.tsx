import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import type { 
  AnalysisResponse
} from './interview-analysis';

// Define color constants
const COLORS = {
  primary: '#3b82f6', // blue-600
  secondary: '#8b5cf6', // purple-600
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  gradients: {
    primary: ['#3b82f6', '#8b5cf6'], // blue-600 to purple-600
    success: ['#10b981', '#059669'], // emerald-500 to emerald-600
    warning: ['#f59e0b', '#d97706'], // amber-500 to amber-600
    danger: ['#ef4444', '#dc2626'], // red-500 to red-600
  }
};

// Define styles using only built-in fonts
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: `1 solid ${COLORS.gray[200]}`,
    paddingBottom: 10,
    backgroundColor: COLORS.gray[50],
    padding: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: 5,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    border: `1 solid ${COLORS.gray[200]}`,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.gray[800],
    backgroundColor: COLORS.gray[100],
    padding: 10,
    borderRadius: 6,
    borderLeft: `4 solid ${COLORS.primary}`,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 10,
    color: COLORS.gray[700],
  },
  card: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    border: `1 solid ${COLORS.gray[200]}`,
    backgroundColor: 'white',
    shadowColor: COLORS.gray[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  skillName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  badge: {
    fontSize: 10,
    padding: '4 8',
    borderRadius: 4,
    backgroundColor: COLORS.gray[100],
    color: COLORS.gray[700],
    fontWeight: 'bold',
  },
  subheading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    color: COLORS.gray[700],
  },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
    color: COLORS.gray[600],
  },
  gridItem: {
    width: '30%',
    margin: '5 5 10 0',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    alignItems: 'center',
    border: `1 solid ${COLORS.gray[200]}`,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 4,
    color: COLORS.gray[600],
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: COLORS.primary,
  },
  bulletText: {
    fontSize: 10,
    flex: 1,
    color: COLORS.gray[700],
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 20,
    right: 20,
    color: COLORS.gray[500],
  },
  transcript: {
    marginBottom: 8,
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    fontFamily: 'Helvetica',
    color: COLORS.gray[700],
    backgroundColor: COLORS.gray[50],
    padding: 10,
    borderRadius: 6,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginBottom: 15,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    minHeight: 35,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gray[300],
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: 8,
  },
  tableColNarrow: {
    width: '15%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: 8,
  },
  tableColWide: {
    width: '35%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    padding: 8,
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
    color: COLORS.gray[700],
  },
  tableHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.gray[200],
    borderRadius: 3,
    marginVertical: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: COLORS.gray[500],
    fontSize: 10,
    borderTop: `1 solid ${COLORS.gray[200]}`,
    paddingTop: 10,
  },
});

// Helper functions for colors
const getScoreColor = (score: number) => {
  if (score >= 90) return COLORS.success;
  if (score >= 80) return COLORS.gradients.success[0];
  if (score >= 70) return COLORS.primary;
  if (score >= 60) return COLORS.warning;
  if (score >= 50) return COLORS.gradients.warning[0];
  return COLORS.danger;
};

const getSkillLevelColor = (level: string) => {
  switch (level) {
    case "Expert":
      return COLORS.success;
    case "Advanced":
      return COLORS.primary;
    case "Intermediate":
      return COLORS.warning;
    case "Beginner":
      return COLORS.gradients.warning[0];
    case "Not Demonstrated":
      return COLORS.gray[500];
    default:
      return COLORS.gray[500];
  }
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case "Excellent":
      return COLORS.success;
    case "Good":
      return COLORS.primary;
    case "Average":
      return COLORS.warning;
    case "Below Average":
      return COLORS.gradients.warning[0];
    case "Poor":
      return COLORS.danger;
    default:
      return COLORS.gray[500];
  }
};

// Define interface for PDF component props
interface InterviewPdfProps {
  data: AnalysisResponse;
  options?: {
    includeTranscript?: boolean;
    includeRawData?: boolean;
  };
}

// Simple PDF Document Component
const InterviewAnalysisPdf: React.FC<InterviewPdfProps> = ({ data, options = {} }) => {
  const { includeTranscript = false } = options;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Interview Analysis Report</Text>
          <Text style={styles.subtitle}>
            {data.filename ? `File: ${data.filename}` : data.video_id ? `Video ID: ${data.video_id}` : 'Interview Analysis'}
          </Text>
          <Text style={[styles.subtitle, { color: getScoreColor(data.interview_insights.overall_performance_score) }]}>
            Overall Score: {data.interview_insights.overall_performance_score}/100
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <Text style={styles.summaryText}>{data.analysis_summary}</Text>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={styles.gridItem}>
              <Text style={[styles.metricValue, { color: getScoreColor(data.interview_insights.overall_performance_score) }]}>
                {data.interview_insights.overall_performance_score}
              </Text>
              <Text style={styles.metricLabel}>Overall Score</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.metricValue, { color: getScoreColor(data.interview_insights.communication_clarity) }]}>
                {data.interview_insights.communication_clarity}
              </Text>
              <Text style={styles.metricLabel}>Communication</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.metricValue, { color: getScoreColor(data.interview_insights.technical_depth) }]}>
                {data.interview_insights.technical_depth}
              </Text>
              <Text style={styles.metricLabel}>Technical Depth</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.metricValue, { color: getScoreColor(data.interview_insights.problem_solving_ability) }]}>
                {data.interview_insights.problem_solving_ability}
              </Text>
              <Text style={styles.metricLabel}>Problem Solving</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.metricValue, { color: getScoreColor(data.interview_insights.confidence_level) }]}>
                {data.interview_insights.confidence_level}
              </Text>
              <Text style={styles.metricLabel}>Confidence</Text>
            </View>
          </View>
        </View>

        {/* Strengths & Areas for Improvement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strengths & Areas for Improvement</Text>
          
          <Text style={[styles.subheading, { color: COLORS.success }]}>Key Strengths:</Text>
          {data.interview_insights.strengths.map((strength, index) => (
            <View key={`strength-${index}`} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.success }]}>• </Text>
              <Text style={styles.bulletText}>{strength}</Text>
            </View>
          ))}
          
          <Text style={[styles.subheading, { color: COLORS.warning }]}>Areas for Improvement:</Text>
          {data.interview_insights.weaknesses.map((weakness, index) => (
            <View key={`weakness-${index}`} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.warning }]}>• </Text>
              <Text style={styles.bulletText}>{weakness}</Text>
            </View>
          ))}
        </View>

        {/* Hiring Recommendation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hiring Recommendation</Text>
          <Text style={styles.summaryText}>{data.interview_insights.hiring_recommendation}</Text>
          
          <Text style={[styles.subheading, { color: COLORS.primary }]}>Next Steps:</Text>
          {data.interview_insights.next_steps.map((step, index) => (
            <View key={`step-${index}`} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.primary }]}>• </Text>
              <Text style={styles.bulletText}>{step}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />

        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>

      {/* Additional Insights Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Additional Insights</Text>
        
        <View style={styles.card}>
          <Text style={[styles.subheading, { color: COLORS.primary }]}>Interview Duration Analysis:</Text>
          <Text style={styles.text}>{data.interview_insights.interview_duration_analysis}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={[styles.subheading, { color: COLORS.primary }]}>Speech Patterns:</Text>
          <Text style={styles.text}>{data.interview_insights.speech_patterns}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={[styles.subheading, { color: COLORS.primary }]}>Engagement Level:</Text>
          <Text style={styles.text}>{data.interview_insights.engagement_level}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={[styles.subheading, { color: COLORS.primary }]}>Cultural Fit Indicators:</Text>
          {data.interview_insights.cultural_fit_indicators.map((indicator, index) => (
            <View key={`indicator-${index}`} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.primary }]}>• </Text>
              <Text style={styles.bulletText}>{indicator}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.card}>
          <Text style={[styles.subheading, { color: COLORS.primary }]}>Key Achievements Mentioned:</Text>
          {data.interview_insights.key_achievements_mentioned.map((achievement, index) => (
            <View key={`achievement-${index}`} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.primary }]}>• </Text>
              <Text style={styles.bulletText}>{achievement}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.card}>
          <Text style={[styles.subheading, { color: COLORS.danger }]}>Red Flags:</Text>
          {data.interview_insights.red_flags.map((flag, index) => (
            <View key={`flag-${index}`} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.danger }]}>• </Text>
              <Text style={styles.bulletText}>{flag}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />

        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>

      {/* Skills Assessment Table Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Skills Assessment Table</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableCol}>
              <Text style={styles.tableHeader}>Skill</Text>
            </View>
            <View style={styles.tableColNarrow}>
              <Text style={styles.tableHeader}>Level</Text>
            </View>
            <View style={styles.tableColNarrow}>
              <Text style={styles.tableHeader}>Score</Text>
            </View>
            <View style={styles.tableColWide}>
              <Text style={styles.tableHeader}>Evidence</Text>
            </View>
          </View>
          
          {data.skill_assessments.map((skill, index) => (
            <View key={`skill-table-${index}`} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{skill.skill}</Text>
              </View>
              <View style={styles.tableColNarrow}>
                <Text style={[styles.tableCell, { color: getSkillLevelColor(skill.level) }]}>
                  {skill.level}
                </Text>
              </View>
              <View style={styles.tableColNarrow}>
                <Text style={[styles.tableCell, { color: getScoreColor(skill.confidence_score) }]}>
                  {skill.confidence_score}%
                </Text>
              </View>
              <View style={styles.tableColWide}>
                <Text style={styles.tableCell}>{skill.evidence}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />

        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>

      {/* Q&A Table Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Q&A Analysis Table</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableColWide}>
              <Text style={styles.tableHeader}>Question</Text>
            </View>
            <View style={styles.tableColNarrow}>
              <Text style={styles.tableHeader}>Grade</Text>
            </View>
            <View style={styles.tableColNarrow}>
              <Text style={styles.tableHeader}>Score</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableHeader}>Key Points</Text>
            </View>
          </View>
          
          {data.questions_and_answers.map((qa, index) => (
            <View key={`qa-table-${index}`} style={styles.tableRow}>
              <View style={styles.tableColWide}>
                <Text style={styles.tableCell}>{qa.question}</Text>
              </View>
              <View style={styles.tableColNarrow}>
                <Text style={[styles.tableCell, { color: getGradeColor(qa.grade) }]}>
                  {qa.grade}
                </Text>
              </View>
              <View style={styles.tableColNarrow}>
                <Text style={[styles.tableCell, { color: getScoreColor(qa.score) }]}>
                  {qa.score}/100
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {qa.key_points_covered.join(", ")}
                </Text>
              </View>
            </View>
          ))}
        </View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />

        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Simplified PDF generation that should avoid DataView errors
export const generateInterviewPDF = (
  data: AnalysisResponse,
  options: {
    includeRawData?: boolean;
  } = {}
) => {
  // Create a unique container ID to avoid conflicts
  const containerId = `pdf-container-${Date.now()}`;
  let containerCreated = false;
  
  try {
    console.log("PDF Options:", options);
    
    // Generate a filename based on date
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Interview_Analysis_${timestamp}.pdf`;
    
    // Create a container for the PDF download link
    const container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none';
    document.body.appendChild(container);
    containerCreated = true;
    
    // Render the PDF download link
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(container);
      
      // Track if cleanup has been performed
      let cleanupDone = false;
      
      // Safe cleanup function
      const safeCleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        
        setTimeout(() => {
          try {
            const containerElement = document.getElementById(containerId);
            if (containerElement && document.body.contains(containerElement)) {
              document.body.removeChild(containerElement);
            }
          } catch (cleanupError) {
            console.error('PDF cleanup error:', cleanupError);
          }
        }, 500);
      };
      
      root.render(
        <PDFDownloadLink
          document={<InterviewAnalysisPdf data={data} options={options} />}
          fileName={filename}
        >
          {({ url, loading, error }) => {
            if (!loading && !error && url) {
              // Trigger download
              window.open(url, '_blank');
              safeCleanup();
            }
            
            if (error) {
              console.error('PDF generation error:', error);
              alert('Error generating PDF. Please try again.');
              safeCleanup();
            }
            
            return null;
          }}
        </PDFDownloadLink>
      );
      
      // Safety timeout to ensure cleanup happens even if the PDFDownloadLink never resolves
      setTimeout(safeCleanup, 30000);
      
    }).catch(err => {
      console.error('PDF module loading error:', err);
      alert('Error loading PDF generator. Please try again.');
      
      // Clean up safely
      try {
        const containerElement = document.getElementById(containerId);
        if (containerElement && document.body.contains(containerElement)) {
          document.body.removeChild(containerElement);
        }
      } catch (cleanupError) {
        console.error('PDF cleanup error:', cleanupError);
      }
    });
  } catch (err) {
    console.error('PDF preparation error:', err);
    alert('Error preparing PDF. Please try again.');
    
    // Clean up if container was created
    if (containerCreated) {
      try {
        const containerElement = document.getElementById(containerId);
        if (containerElement && document.body.contains(containerElement)) {
          document.body.removeChild(containerElement);
        }
      } catch (cleanupError) {
        console.error('PDF cleanup error:', cleanupError);
      }
    }
  }
};

export default InterviewAnalysisPdf;