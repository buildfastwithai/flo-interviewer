import { prisma } from "@/lib/prisma";
import JDQnaRecordsList from "@/components/JDQnaRecordsList";

export default async function RecordsPage() {
  const records = await prisma.skillRecord.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { skills: true, questions: true },
      },
    },
  });

  const serialized = records.map((r) => ({
    id: r.id,
    jobTitle: r.jobTitle,
    createdAt: r.createdAt.toISOString(),
    _count: r._count as { skills: number; questions: number },
  }));

  return <JDQnaRecordsList records={serialized} />;
}
