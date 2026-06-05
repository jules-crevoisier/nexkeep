-- CreateEnum
CREATE TYPE "OrgaScope" AS ENUM ('FULL', 'PROJECTS_ONLY');

-- CreateEnum
CREATE TYPE "ProjectAccess" AS ENUM ('VIEWER', 'CONTRIBUTOR', 'MANAGER');

-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN "orgaScope" "OrgaScope" NOT NULL DEFAULT 'FULL';
ALTER TABLE "workspace_members" ADD COLUMN "canAccessInbox" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "workspace_invitations" ADD COLUMN "orgaScope" "OrgaScope" NOT NULL DEFAULT 'FULL';
ALTER TABLE "workspace_invitations" ADD COLUMN "canAccessInbox" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "isRestricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "access" "ProjectAccess" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_members_memberId_idx" ON "project_members"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_memberId_key" ON "project_members"("projectId", "memberId");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
