"use client";

import { useState, useMemo, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Trash2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { SkillFeedbackDialog } from "./ui/skill-feedback-dialog";
import { SkillFeedbackViewDialog } from "./ui/skill-feedback-view-dialog";
import { AddSkillDialog } from "./ui/add-skill-dialog";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

// Define interfaces for the types from Prisma
interface Skill {
  id: string;
  name: string;
  level: "BEGINNER" | "INTERMEDIATE" | "PROFESSIONAL" | "EXPERT";
  requirement: "MANDATORY" | "OPTIONAL";
  numQuestions: number;
  difficulty?: string;
  recordId: string;
  priority?: number;
  category?: "TECHNICAL" | "FUNCTIONAL" | "BEHAVIORAL" | "COGNITIVE";
  questionFormat?: string;
  feedbacks?: { id: string; content: string; createdAt: string }[];
}

interface SkillsTableProps {
  skills: Skill[];
  recordId: string;
  onUpdateSkill: (
    skillId: string,
    field:
      | "level"
      | "requirement"
      | "numQuestions"
      | "difficulty"
      | "priority"
      | "category"
      | "questionFormat",
    value: string | number
  ) => Promise<void>;
  getSkillQuestionCount: (skillId: string) => number;
  onDeleteSkill: (skillId: string) => void;
  onBulkDeleteSkills?: (skillIds: string[]) => void;
  onSkillAdded: () => void;
  loading: boolean;
}

export default function SkillsTable({
  skills,
  recordId,
  onUpdateSkill,
  getSkillQuestionCount,
  onDeleteSkill,
  onBulkDeleteSkills,
  onSkillAdded,
  loading,
}: SkillsTableProps) {
  // State to track feedback counts and refresh trigger
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>(
    {}
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Multi-select state
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Fetch feedback counts for each skill
  useEffect(() => {
    const fetchFeedbackCounts = async () => {
      const counts: Record<string, number> = {};

      for (const skill of skills) {
        try {
          const response = await fetch(`/api/skills/${skill.id}/feedback`);
          if (response.ok) {
            const data = await response.json();
            counts[skill.id] = data.feedbacks?.length || 0;
          }
        } catch (error) {
          console.error(
            `Error fetching feedback count for skill ${skill.id}:`,
            error
          );
        }
      }

      setFeedbackCounts(counts);
    };

    fetchFeedbackCounts();
  }, [skills, refreshTrigger]);

  // Handle feedback submission
  const handleFeedbackSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };
  // Column helper
  const columnHelper = createColumnHelper<Skill>();

  // Get level label
  const getLevelLabel = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "Beginner";
      case "INTERMEDIATE":
        return "Intermediate";
      case "PROFESSIONAL":
        return "Professional";
      case "EXPERT":
        return "Expert";
      default:
        return level;
    }
  };

  // Get category label
  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "TECHNICAL":
        return "Technical";
      case "FUNCTIONAL":
        return "Functional";
      case "BEHAVIORAL":
        return "Behavioral";
      case "COGNITIVE":
        return "Cognitive";
      default:
        return "Not Specified";
    }
  };

  console.log(skills);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSkills(new Set(skills.map((skill) => skill.id)));
    } else {
      setSelectedSkills(new Set());
    }
  };

  // Handle individual skill selection
  const handleSkillSelect = (skillId: string, checked: boolean) => {
    const newSelected = new Set(selectedSkills);
    if (checked) {
      newSelected.add(skillId);
    } else {
      newSelected.delete(skillId);
    }
    setSelectedSkills(newSelected);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedSkills.size === 0) {
      toast.warning("Please select skills to delete");
      return;
    }
    setConfirmDeleteOpen(true);
  };

  // Confirm and execute bulk delete
  const confirmBulkDelete = () => {
    if (onBulkDeleteSkills) {
      onBulkDeleteSkills(Array.from(selectedSkills));
    } else {
      // Fallback to individual deletions if bulk delete not provided
      selectedSkills.forEach((skillId) => onDeleteSkill(skillId));
    }
    setSelectedSkills(new Set());
    setConfirmDeleteOpen(false);
  };

  // Get selected skills for confirmation dialog
  const getSelectedSkillNames = () => {
    return skills
      .filter((skill) => selectedSkills.has(skill.id))
      .map((skill) => skill.name);
  };

  // Check if all skills are selected
  const isAllSelected =
    skills.length > 0 && selectedSkills.size === skills.length;
  const isIndeterminate =
    selectedSkills.size > 0 && selectedSkills.size < skills.length;

  // Define columns
  const columns = useMemo(
    () => [
      // Selection column
      columnHelper.display({
        id: "select",
        header: () => (
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all skills"
            className="translate-y-[2px]"
            {...(isIndeterminate && { "data-state": "indeterminate" })}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedSkills.has(row.original.id)}
            onCheckedChange={(checked) =>
              handleSkillSelect(row.original.id, checked as boolean)
            }
            aria-label={`Select ${row.original.name}`}
            className="translate-y-[2px]"
          />
        ),
        size: 50,
      }),
      columnHelper.accessor("name", {
        header: "Skill Name",
        cell: (info) => (
          <div className="max-w-full overflow-hidden break-words font-medium">
            {info.getValue()}
          </div>
        ),
        size: 150,
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <Select
            value={info.getValue() || "TECHNICAL"}
            onValueChange={(value) =>
              onUpdateSkill(info.row.original.id, "category", value)
            }
            disabled={loading}
          >
            <SelectTrigger
              className="w-full"
              aria-label={`Select category for ${info.row.original.name}`}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent
              className="w-[160px]"
              position="popper"
              sideOffset={5}
            >
              <SelectItem value="TECHNICAL">Technical</SelectItem>
              <SelectItem value="FUNCTIONAL">Functional</SelectItem>
              <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
              <SelectItem value="COGNITIVE">Cognitive</SelectItem>
            </SelectContent>
          </Select>
        ),
        size: 120,
      }),
      columnHelper.accessor("level", {
        header: "Level",
        cell: (info) => (
          <Select
            value={info.getValue()}
            onValueChange={(value) =>
              onUpdateSkill(info.row.original.id, "level", value)
            }
            disabled={loading}
          >
            <SelectTrigger
              className="w-full"
              aria-label={`Select level for ${info.row.original.name}`}
            >
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent
              className="w-[160px]"
              position="popper"
              sideOffset={5}
            >
              <SelectItem value="BEGINNER">Beginner</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
              <SelectItem value="PROFESSIONAL">Professional</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>
        ),
        size: 120,
      }),
      columnHelper.accessor("requirement", {
        header: "Requirement",
        cell: (info) => (
          <Select
            value={info.getValue()}
            onValueChange={(value) => {
              // When changing to OPTIONAL, also set numQuestions to 0 if it's mandatory
              if (
                value === "OPTIONAL" &&
                info.row.original.requirement === "MANDATORY"
              ) {
                // First update requirement
                onUpdateSkill(info.row.original.id, "requirement", value)
                  .then(() => {
                    // Then update numQuestions to 0
                    onUpdateSkill(info.row.original.id, "numQuestions", 0);
                  })
                  .catch((err) => {
                    console.error("Error updating skill:", err);
                    toast.error("Failed to update skill requirement");
                  });
              } else {
                // Just update requirement
                onUpdateSkill(info.row.original.id, "requirement", value);
              }
            }}
            disabled={loading}
          >
            <SelectTrigger
              className="w-full"
              aria-label={`Select requirement for ${info.row.original.name}`}
            >
              <SelectValue placeholder="Requirement" />
            </SelectTrigger>
            <SelectContent
              className="w-[160px]"
              position="popper"
              sideOffset={5}
            >
              <SelectItem value="MANDATORY">Mandatory</SelectItem>
              <SelectItem value="OPTIONAL">Optional</SelectItem>
            </SelectContent>
          </Select>
        ),
        size: 120,
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => (
          <div className="flex items-center">
            <span>{info.getValue() || "—"}</span>
          </div>
        ),
        size: 80,
      }),
      columnHelper.accessor((row) => row.id, {
        id: "questionCount",
        header: "Questions",
        cell: (info) => {
          const count = getSkillQuestionCount(info.getValue());
          return (
            <div className="flex items-center gap-2">
              <span>{count}</span>
              {count > 0 && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  Generated
                </span>
              )}
            </div>
          );
        },
        size: 100,
      }),
      columnHelper.accessor("numQuestions", {
        header: "Num. of Qs",
        cell: (info) => {
          const skill = info.row.original;
          const value = String(skill.numQuestions || 0);

          return (
            <Select
              value={value}
              onValueChange={(value) =>
                onUpdateSkill(
                  info.row.original.id,
                  "numQuestions",
                  parseInt(value)
                )
              }
              disabled={loading}
            >
              <SelectTrigger
                className="w-full"
                aria-label={`Select number of questions for ${info.row.original.name}`}
              >
                <SelectValue placeholder="Count" />
              </SelectTrigger>
              <SelectContent
                className="w-[160px]"
                position="popper"
                sideOffset={5}
              >
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        size: 100,
      }),
      // columnHelper.accessor("difficulty", {
      //   header: "Difficulty",
      //   cell: (info) => (
      //     <Select
      //       value={info.getValue() || "Medium"}
      //       onValueChange={(value) =>
      //         onUpdateSkill(info.row.original.id, "difficulty", value)
      //       }
      //       disabled={loading}
      //     >
      //       <SelectTrigger
      //         className="w-full"
      //         aria-label={`Select difficulty for ${info.row.original.name}`}
      //       >
      //         <SelectValue placeholder="Difficulty" />
      //       </SelectTrigger>
      //       <SelectContent
      //         className="w-[160px]"
      //         position="popper"
      //         sideOffset={5}
      //       >
      //         <SelectItem value="Easy">Easy</SelectItem>
      //         <SelectItem value="Medium">Medium</SelectItem>
      //         <SelectItem value="Hard">Hard</SelectItem>
      //       </SelectContent>
      //     </Select>
      //   ),
      //   size: 100,
      // }),
      // columnHelper.accessor("questionFormat", {
      //   header: "Question Format",
      //   cell: (info) => (
      //     <Select
      //       value={info.getValue() || "Scenario based"}
      //       onValueChange={(value) =>
      //         onUpdateSkill(info.row.original.id, "questionFormat", value)
      //       }
      //       disabled={loading}
      //     >
      //       <SelectTrigger
      //         className="w-full"
      //         aria-label={`Select question format for ${info.row.original.name}`}
      //       >
      //         <SelectValue placeholder="Format" />
      //       </SelectTrigger>
      //       <SelectContent
      //         className="w-[160px]"
      //         position="popper"
      //         sideOffset={5}
      //       >
      //         <SelectItem value="Scenario based">Scenario based</SelectItem>
      //         <SelectItem value="Theoretical">Theoretical</SelectItem>
      //         <SelectItem value="Coding challenge">Coding challenge</SelectItem>
      //         <SelectItem value="Behavioral">Behavioral</SelectItem>
      //         <SelectItem value="System design">System design</SelectItem>
      //       </SelectContent>
      //     </Select>
      //   ),
      //   size: 130,
      // }),
      columnHelper.accessor((row) => row.id, {
        id: "feedback",
        header: "Feedback",
        cell: (info) => {
          const skillId = info.getValue();
          const skillName = info.row.original.name;
          const feedbackCount = feedbackCounts[skillId] || 0;

          return (
            <div className="flex items-center space-x-2">
              <SkillFeedbackDialog
                skillId={skillId}
                skillName={skillName}
                onFeedbackSubmitted={handleFeedbackSubmitted}
              />
              {feedbackCount > 0 && (
                <SkillFeedbackViewDialog
                  skillId={skillId}
                  skillName={skillName}
                  feedbackCount={feedbackCount}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>
          );
        },
        size: 150,
      }),
      columnHelper.accessor((row) => row.id, {
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteSkill(info.getValue())}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
        size: 80,
      }),
    ],
    [columnHelper, getSkillQuestionCount, loading, onDeleteSkill, onUpdateSkill]
  );

  // Sort skills by requirement first, then by priority
  const sortedSkills = useMemo(() => {
    return [...skills].sort((a, b) => {
      // First sort by requirement type (MANDATORY first)
      if (a.requirement !== b.requirement) {
        return a.requirement === "MANDATORY" ? -1 : 1;
      }
      // Then sort by priority (nulls/undefined at the end)
      const aPriority = a.priority ?? 999;
      const bPriority = b.priority ?? 999;
      return aPriority - bPriority;
    });
  }, [skills]);

  // Create table instance
  const table = useReactTable({
    data: sortedSkills,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {selectedSkills.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedSkills.size})
            </Button>
          )}
        </div>
        <AddSkillDialog recordId={recordId} onSkillAdded={onSkillAdded} />
      </div>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: `${header.column.getSize()}px`,
                        minWidth: `${header.column.getSize()}px`,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: `${cell.column.getSize()}px`,
                          minWidth: `${cell.column.getSize()}px`,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No skills found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the following{" "}
              {selectedSkills.size} skill{selectedSkills.size > 1 ? "s" : ""}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-32 overflow-y-auto">
              <ul className="list-disc list-inside space-y-1">
                {getSelectedSkillNames().map((name, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
