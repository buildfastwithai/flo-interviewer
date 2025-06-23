import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { Question } from "./ui/questions-display";

// Register fonts
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@4.5.8/files/roboto-latin-400-normal.woff",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@4.5.8/files/roboto-latin-700-normal.woff",
      fontWeight: 700,
    },
  ],
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Roboto",
  },
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 10,
    textAlign: "center",
  },
  jobRole: {
    fontSize: 16,
    marginBottom: 20,
  },
  questionContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    paddingBottom: 15,
  },
  question: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 5,
  },
  metaContainer: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  badge: {
    fontSize: 10,
    padding: 4,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  technicalBadge: {
    backgroundColor: "#E6F0FF",
    color: "#0066CC",
  },
  experienceBadge: {
    backgroundColor: "#F3E6FF",
    color: "#6600CC",
  },
  problemSolvingBadge: {
    backgroundColor: "#E6E6FF",
    color: "#0000CC",
  },
  softSkillsBadge: {
    backgroundColor: "#FFE6F3",
    color: "#CC0066",
  },
  functionalBadge: {
    backgroundColor: "#E8F8F5",
    color: "#148F77",
  },
  behavioralBadge: {
    backgroundColor: "#FEF9E7",
    color: "#B7950B",
  },
  cognitiveBadge: {
    backgroundColor: "#F4ECF7",
    color: "#8E44AD",
  },
  easyBadge: {
    backgroundColor: "#E6FFE6",
    color: "#006600",
  },
  mediumBadge: {
    backgroundColor: "#FFFEE6",
    color: "#666600",
  },
  hardBadge: {
    backgroundColor: "#FFE6E6",
    color: "#660000",
  },
  skillBadge: {
    backgroundColor: "#E8F4FD",
    color: "#2E86C1",
  },
  formatBadge: {
    backgroundColor: "#FADBD8",
    color: "#943126",
  },
  priorityBadge: {
    backgroundColor: "#EAECEE",
    color: "#2C3E50",
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
    color: "#666666",
  },
  answer: {
    fontSize: 11,
    lineHeight: 1.5,
    color: "#333333",
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    fontSize: 10,
    textAlign: "center",
    color: "#666666",
  },
});

// Get badge style based on category
const getCategoryBadgeStyle = (category: Question["category"]) => {
  switch (category?.toLowerCase()) {
    case "technical":
      return styles.technicalBadge;
    case "experience":
      return styles.experienceBadge;
    case "problem solving":
      return styles.problemSolvingBadge;
    case "soft skills":
      return styles.softSkillsBadge;
    case "functional":
      return styles.functionalBadge;
    case "behavioral":
      return styles.behavioralBadge;
    case "cognitive":
      return styles.cognitiveBadge;
    default:
      return styles.technicalBadge;
  }
};

// Get badge style based on difficulty
const getDifficultyBadgeStyle = (difficulty: Question["difficulty"]) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return styles.easyBadge;
    case "medium":
      return styles.mediumBadge;
    case "hard":
      return styles.hardBadge;
    default:
      return styles.mediumBadge;
  }
};

// Create PDF Document
interface PDFDocumentProps {
  jobRole: string;
  questions: {
    question: string;
    answer: string;
    category: string;
    difficulty: string;
    skillName: string;
    priority?: number;
    questionFormat?: string;
    liked?: "LIKED" | "DISLIKED" | "NONE";
  }[];
}

const PDFDoc: React.FC<PDFDocumentProps> = ({ jobRole, questions }) => (
  <Document>
    <Page size="A4" style={styles.page} wrap>
      <Text style={styles.title}>Interview Questions</Text>
      <Text style={styles.jobRole}>Job Role: {jobRole}</Text>

      {questions.map((question, index) => (
        <View key={index} style={styles.questionContainer} wrap>
          <Text style={styles.question}>
            Q{index + 1}: {question.question}
          </Text>

          <View style={styles.metaContainer}>
            <Text style={[styles.badge, styles.skillBadge]}>
              Skill: {question.skillName}
            </Text>
            <Text
              style={[
                styles.badge,
                getCategoryBadgeStyle(question.category as any),
              ]}
            >
              {question.category}
            </Text>
            {/* <Text
              style={[
                styles.badge,
                getDifficultyBadgeStyle(question.difficulty as any),
              ]}
            >
              {question.difficulty}
            </Text> */}
            {question.questionFormat && (
              <Text style={[styles.badge, styles.formatBadge]}>
                Format: {question.questionFormat}
              </Text>
            )}
            {question.priority !== undefined && (
              <Text style={[styles.badge, styles.priorityBadge]}>
                Priority: {question.priority}
              </Text>
            )}
          </View>

          <Text style={styles.answerLabel}>Suggested Answer:</Text>
          <Text style={styles.answer}>{question.answer}</Text>
        </View>
      ))}

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  </Document>
);

export default PDFDoc;
