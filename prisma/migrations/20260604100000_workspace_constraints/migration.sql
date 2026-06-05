-- Phase 3 : verrouillage du multi-tenant.
-- 1) workspaceId devient obligatoire sur toutes les tables de donnees.
-- 2) userId devient un simple champ d'audit "cree par" : nullable + ON DELETE SET NULL
--    (la suppression d'un compte ne doit PAS supprimer les donnees, possedees par le workspace).
-- 3) suppression des colonnes tresorerie de users (deplacees sur workspaces).

-- ============ transactions ============
ALTER TABLE "public"."transactions" DROP CONSTRAINT IF EXISTS "transactions_userId_fkey";
ALTER TABLE "public"."transactions" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."transactions" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ reimbursement_requests ============
ALTER TABLE "public"."reimbursement_requests" DROP CONSTRAINT IF EXISTS "reimbursement_requests_userId_fkey";
ALTER TABLE "public"."reimbursement_requests" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."reimbursement_requests" ADD CONSTRAINT "reimbursement_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."reimbursement_requests" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ reimbursements ============
ALTER TABLE "public"."reimbursements" DROP CONSTRAINT IF EXISTS "reimbursements_userId_fkey";
ALTER TABLE "public"."reimbursements" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."reimbursements" ADD CONSTRAINT "reimbursements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."reimbursements" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ organisations ============
ALTER TABLE "public"."organisations" DROP CONSTRAINT IF EXISTS "organisations_userId_fkey";
ALTER TABLE "public"."organisations" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."organisations" ADD CONSTRAINT "organisations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."organisations" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ clients ============
ALTER TABLE "public"."clients" DROP CONSTRAINT IF EXISTS "clients_userId_fkey";
ALTER TABLE "public"."clients" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."clients" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ articles ============
ALTER TABLE "public"."articles" DROP CONSTRAINT IF EXISTS "articles_userId_fkey";
ALTER TABLE "public"."articles" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."articles" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ invoices ============
ALTER TABLE "public"."invoices" DROP CONSTRAINT IF EXISTS "invoices_userId_fkey";
ALTER TABLE "public"."invoices" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."invoices" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ projects ============
ALTER TABLE "public"."projects" DROP CONSTRAINT IF EXISTS "projects_userId_fkey";
ALTER TABLE "public"."projects" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."projects" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ statuses ============
ALTER TABLE "public"."statuses" DROP CONSTRAINT IF EXISTS "statuses_userId_fkey";
ALTER TABLE "public"."statuses" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."statuses" ADD CONSTRAINT "statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."statuses" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ tasks ============
ALTER TABLE "public"."tasks" DROP CONSTRAINT IF EXISTS "tasks_userId_fkey";
ALTER TABLE "public"."tasks" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."tasks" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============ users : suppression des colonnes tresorerie ============
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "budget";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "budgetInitial";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "cashInitial";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "shareToken";
