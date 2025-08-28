"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";
import { Input } from "./input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "./dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Label } from "./label";
import { z } from "zod";

const newSkillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "PROFESSIONAL", "EXPERT"]),
  requirement: z.enum(["MANDATORY", "OPTIONAL"]),
  numQuestions: z.number().int().min(0).max(5),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  category: z.enum(["TECHNICAL", "FUNCTIONAL", "BEHAVIORAL", "COGNITIVE"]),
  questionFormat: z.enum([
    "Scenario based",
    "Theoretical",
    "Coding challenge",
    "Behavioral",
    "System design",
  ]),
});

type NewSkillData = z.infer<typeof newSkillSchema>;

interface AddSkillDialogProps {
  recordId: string;
  onSkillAdded: () => void;
}

export function AddSkillDialog({
  recordId,
  onSkillAdded,
}: AddSkillDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [skillData, setSkillData] = useState<NewSkillData>({
    name: "",
    level: "INTERMEDIATE",
    requirement: "OPTIONAL",
    numQuestions: 0,
    difficulty: "Medium",
    category: "TECHNICAL",
    questionFormat: "Scenario based",
  });

  const handleChange = (field: keyof NewSkillData, value: string | number) => {
    setSkillData((prev) => ({
      ...prev,
      [field]: field === "numQuestions" ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Basic validation
      if (!skillData.name.trim()) {
        toast.error("Skill name is required");
        return;
      }

      setIsSubmitting(true);

      const response = await fetch(`/api/records/${recordId}/add-skill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(skillData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add skill");
      }

      toast.success("Skill added successfully");
      setIsOpen(false);
      onSkillAdded();

      // Reset form
      setSkillData({
        name: "",
        level: "INTERMEDIATE",
        requirement: "OPTIONAL",
        numQuestions: 0,
        difficulty: "Medium",
        category: "TECHNICAL",
        questionFormat: "Scenario based",
      });
    } catch (error: any) {
      console.error("Error adding skill:", error);
      toast.error(error.message || "Failed to add skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add New Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Add New Skill</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Skill Name</Label>
            <Input
              id="name"
              value={skillData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter skill name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={skillData.category}
              onValueChange={(value) => handleChange("category", value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TECHNICAL">Technical</SelectItem>
                <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                <SelectItem value="COGNITIVE">Cognitive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select
              value={skillData.level}
              onValueChange={(value) => handleChange("level", value)}
            >
              <SelectTrigger id="level">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BEGINNER">Beginner</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="EXPERT">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirement">Requirement</Label>
            <Select
              value={skillData.requirement}
              onValueChange={(value) => handleChange("requirement", value)}
            >
              <SelectTrigger id="requirement">
                <SelectValue placeholder="Select requirement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANDATORY">Mandatory</SelectItem>
                <SelectItem value="OPTIONAL">Optional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numQuestions">Number of Questions</Label>
            <Select
              value={String(skillData.numQuestions)}
              onValueChange={(value) =>
                handleChange("numQuestions", parseInt(value))
              }
            >
              <SelectTrigger id="numQuestions">
                <SelectValue placeholder="Select number" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={skillData.difficulty}
              onValueChange={(value) => handleChange("difficulty", value)}
            >
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="questionFormat">Question Format</Label>
            <Select
              value={skillData.questionFormat}
              onValueChange={(value) => handleChange("questionFormat", value)}
            >
              <SelectTrigger id="questionFormat">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scenario based">Scenario based</SelectItem>
                <SelectItem value="Theoretical">Theoretical</SelectItem>
                <SelectItem value="Coding challenge">
                  Coding challenge
                </SelectItem>
                <SelectItem value="Behavioral">Behavioral</SelectItem>
                <SelectItem value="System design">System design</SelectItem>
              </SelectContent>
            </Select>
          </div> */}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
