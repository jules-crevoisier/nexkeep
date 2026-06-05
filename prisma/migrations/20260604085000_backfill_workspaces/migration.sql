-- Backfill (equivalent SQL du script scripts/backfill-workspaces.ts).
-- Doit s'executer APRES 20260604080536_add_workspace_collaboration (tables/colonnes
-- additives, workspaceId nullable) et AVANT 20260604090000_member_to_workspace_member
-- (qui suppose l'existence des workspaces) et 20260604100000_workspace_constraints
-- (qui passe workspaceId en NOT NULL et supprime les colonnes tresorerie de users).
--
-- Objectif : ne perdre AUCUNE donnee existante. Pour chaque utilisateur on cree une
-- organisation personnelle (id deterministe 'ws_' || user.id), on y recopie la
-- tresorerie, on l'y rend OWNER avec acces WRITE, puis on rattache toutes ses donnees.
-- Les NOT EXISTS rendent l'operation rejouable sans doublon.

-- 1) Organisation personnelle par utilisateur (copie de la tresorerie)
INSERT INTO "public"."workspaces"
  ("id", "name", "budget", "budgetInitial", "cashInitial", "shareToken", "createdById", "createdAt", "updatedAt")
SELECT
  'ws_' || u."id",
  'Organisation de ' || COALESCE(NULLIF(split_part(u."email", '@', 1), ''), 'Mon'),
  COALESCE(u."budget", 0),
  COALESCE(u."budgetInitial", 0),
  COALESCE(u."cashInitial", 0),
  u."shareToken",
  u."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "public"."users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."workspaces" w WHERE w."createdById" = u."id"
);

-- 2) Adhesion OWNER / acces tresorerie WRITE pour chaque utilisateur
INSERT INTO "public"."workspace_members"
  ("id", "role", "treasuryAccess", "color", "workspaceId", "userId", "createdAt", "updatedAt")
SELECT
  'wm_' || u."id",
  'OWNER'::"public"."WorkspaceRole",
  'WRITE'::"public"."TreasuryAccess",
  '#3b82f6',
  'ws_' || u."id",
  u."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "public"."users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."workspace_members" wm
  WHERE wm."userId" = u."id" AND wm."role" = 'OWNER'::"public"."WorkspaceRole"
);

-- 3) Rattachement de toutes les donnees existantes a l'organisation de leur proprietaire
UPDATE "public"."transactions"           SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."reimbursement_requests" SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."reimbursements"         SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."organisations"          SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."clients"                SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."articles"               SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."invoices"               SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."projects"               SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."statuses"               SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
UPDATE "public"."tasks"                  SET "workspaceId" = 'ws_' || "userId" WHERE "workspaceId" IS NULL;
