import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SkillRecordEditor from "@/components/SkillRecordEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch the record with skills and questions
  const record = await prisma.skillRecord.findUnique({
    where: { id },
    include: {
      skills: {
        orderBy: { name: "asc" },
      },
      questions: {
        include: {
          skill: true,
        },
      },
    },
  });

  if (!record) {
    notFound();
  }

  return (
    <div className="py-8 mx-auto">
      <SkillRecordEditor record={record as any} />
    </div>
  );
}
