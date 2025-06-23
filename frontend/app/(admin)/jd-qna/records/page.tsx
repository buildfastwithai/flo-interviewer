import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ArrowLeft, ChevronRight } from "lucide-react";

export default async function RecordsPage() {
  // Fetch all records
  const records = await prisma.skillRecord.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          skills: true,
          questions: true,
        },
      },
    },
  });

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/jd-qna">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Job Skill Records</h1>
          <p className="text-muted-foreground">
            View and manage your saved job skill records
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground mb-4">No job records found.</p>
            <Button asChild>
              <Link href="/jd-qna">Create Your First Record</Link>
            </Button>
          </div>
        ) : (
          records.map((record: any) => (
            <Card key={record.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="truncate">{record.jobTitle}</CardTitle>
                <CardDescription>
                  Created{" "}
                  {formatDistanceToNow(new Date(record.createdAt), {
                    addSuffix: true,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mb-4">
                  <div>
                    <span className="font-medium">{record._count.skills}</span>{" "}
                    Skills
                  </div>
                  <div>
                    <span className="font-medium">
                      {record._count.questions}
                    </span>{" "}
                    Questions
                  </div>
                </div>
                <Button asChild className="w-full mt-2">
                  <Link href={`/jd-qna/records/${record.id}`}>
                    View Details <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
