-- Migration des contacts (Member) vers WorkspaceMember.
-- On reutilise l'id de chaque Member comme id de WorkspaceMember afin que les
-- task_assignees existants continuent de pointer vers la bonne ligne sans remap.
INSERT INTO "public"."workspace_members"
  ("id", "role", "treasuryAccess", "displayName", "color", "workspaceId", "userId", "createdAt", "updatedAt")
SELECT
  m."id",
  'MEMBER'::"public"."WorkspaceRole",
  'NONE'::"public"."TreasuryAccess",
  m."name",
  m."color",
  (SELECT w."id" FROM "public"."workspaces" w WHERE w."createdById" = m."userId" ORDER BY w."createdAt" ASC LIMIT 1),
  NULL,
  m."createdAt",
  m."updatedAt"
FROM "public"."members" m
WHERE EXISTS (SELECT 1 FROM "public"."workspaces" w WHERE w."createdById" = m."userId");

-- Repointer la cle etrangere de task_assignees vers workspace_members
ALTER TABLE "public"."task_assignees" DROP CONSTRAINT IF EXISTS "task_assignees_memberId_fkey";
ALTER TABLE "public"."task_assignees" ADD CONSTRAINT "task_assignees_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "public"."workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supprimer l'ancienne table members
ALTER TABLE "public"."members" DROP CONSTRAINT IF EXISTS "members_userId_fkey";
DROP TABLE "public"."members";
