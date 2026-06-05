-- CreateEnum
CREATE TYPE "public"."WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."TreasuryAccess" AS ENUM ('NONE', 'READ', 'WRITE');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."articles" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."clients" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."organisations" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."reimbursement_requests" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."reimbursements" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."statuses" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "public"."workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetInitial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashInitial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shareToken" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workspace_members" (
    "id" TEXT NOT NULL,
    "role" "public"."WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "treasuryAccess" "public"."TreasuryAccess" NOT NULL DEFAULT 'NONE',
    "displayName" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workspace_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "treasuryAccess" "public"."TreasuryAccess" NOT NULL DEFAULT 'NONE',
    "token" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "public"."workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_shareToken_key" ON "public"."workspaces"("shareToken");

-- CreateIndex
CREATE INDEX "workspace_members_userId_idx" ON "public"."workspace_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "public"."workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "public"."workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_idx" ON "public"."workspace_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_workspaceId_email_key" ON "public"."workspace_invitations"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "articles_workspaceId_idx" ON "public"."articles"("workspaceId");

-- CreateIndex
CREATE INDEX "clients_workspaceId_idx" ON "public"."clients"("workspaceId");

-- CreateIndex
CREATE INDEX "invoices_workspaceId_idx" ON "public"."invoices"("workspaceId");

-- CreateIndex
CREATE INDEX "organisations_workspaceId_idx" ON "public"."organisations"("workspaceId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_idx" ON "public"."projects"("workspaceId");

-- CreateIndex
CREATE INDEX "reimbursement_requests_workspaceId_idx" ON "public"."reimbursement_requests"("workspaceId");

-- CreateIndex
CREATE INDEX "reimbursements_workspaceId_idx" ON "public"."reimbursements"("workspaceId");

-- CreateIndex
CREATE INDEX "statuses_workspaceId_idx" ON "public"."statuses"("workspaceId");

-- CreateIndex
CREATE INDEX "tasks_workspaceId_idx" ON "public"."tasks"("workspaceId");

-- CreateIndex
CREATE INDEX "transactions_workspaceId_idx" ON "public"."transactions"("workspaceId");

-- AddForeignKey
ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reimbursements" ADD CONSTRAINT "reimbursements_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organisations" ADD CONSTRAINT "organisations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."statuses" ADD CONSTRAINT "statuses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
