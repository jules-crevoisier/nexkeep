-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "endDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "public"."task_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "budget" DOUBLE PRECISION,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "task_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."task_groups" ADD CONSTRAINT "task_groups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."task_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
