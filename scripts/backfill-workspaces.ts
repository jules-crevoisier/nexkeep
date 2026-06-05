import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/**
 * Backfill (Phase 1) : pour chaque utilisateur existant, on cree une organisation
 * (Workspace) personnelle, on l'y rend OWNER avec acces tresorerie WRITE, on y
 * recopie les champs de tresorerie, puis on rattache toutes ses donnees existantes
 * a cette organisation. Idempotent : peut etre relance sans dupliquer.
 */
async function main(): Promise<void> {
  const users = await prisma.user.findMany();
  console.log(`Backfill pour ${users.length} utilisateur(s).`);

  for (const user of users) {
    // 1. Trouver / creer l'organisation personnelle de l'utilisateur
    let membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, role: "OWNER" },
      include: { workspace: true },
    });

    let workspaceId: string;
    if (membership) {
      workspaceId = membership.workspaceId;
      console.log(`- ${user.email} : organisation existante (${workspaceId}).`);
    } else {
      const workspace = await prisma.workspace.create({
        data: {
          name: defaultWorkspaceName(user.email),
          budget: user.budget,
          budgetInitial: user.budgetInitial,
          cashInitial: user.cashInitial,
          shareToken: user.shareToken ?? undefined,
          createdById: user.id,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
              treasuryAccess: "WRITE",
            },
          },
        },
      });
      workspaceId = workspace.id;
      console.log(`- ${user.email} : organisation creee (${workspaceId}).`);
    }

    // 2. Rattacher toutes les donnees existantes (uniquement celles encore sans workspace)
    const scope = { userId: user.id, workspaceId: null as string | null };
    const data = { workspaceId };

    const results = await prisma.$transaction([
      prisma.transaction.updateMany({ where: scope, data }),
      prisma.reimbursementRequest.updateMany({ where: scope, data }),
      prisma.reimbursement.updateMany({ where: scope, data }),
      prisma.organisation.updateMany({ where: scope, data }),
      prisma.client.updateMany({ where: scope, data }),
      prisma.article.updateMany({ where: scope, data }),
      prisma.invoice.updateMany({ where: scope, data }),
      prisma.project.updateMany({ where: scope, data }),
      prisma.status.updateMany({ where: scope, data }),
      prisma.task.updateMany({ where: scope, data }),
    ]);

    const total = results.reduce((sum, r) => sum + r.count, 0);
    console.log(`  ${total} ligne(s) rattachee(s).`);
  }

  // 3. Verification : aucune donnee orpheline
  const orphans = await countOrphans();
  if (orphans > 0) {
    console.warn(`ATTENTION : ${orphans} ligne(s) sans workspaceId. Verifier avant la phase 3.`);
  } else {
    console.log("OK : toutes les donnees sont rattachees a une organisation.");
  }
}

function defaultWorkspaceName(email: string): string {
  const prefix = email.split("@")[0] || "Mon";
  return `Organisation de ${prefix}`;
}

async function countOrphans(): Promise<number> {
  const counts = await prisma.$transaction([
    prisma.transaction.count({ where: { workspaceId: null } }),
    prisma.reimbursementRequest.count({ where: { workspaceId: null } }),
    prisma.reimbursement.count({ where: { workspaceId: null } }),
    prisma.organisation.count({ where: { workspaceId: null } }),
    prisma.client.count({ where: { workspaceId: null } }),
    prisma.article.count({ where: { workspaceId: null } }),
    prisma.invoice.count({ where: { workspaceId: null } }),
    prisma.project.count({ where: { workspaceId: null } }),
    prisma.status.count({ where: { workspaceId: null } }),
    prisma.task.count({ where: { workspaceId: null } }),
  ]);
  return counts.reduce((sum, c) => sum + c, 0);
}

main()
  .catch((error: unknown) => {
    console.error("Echec du backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
