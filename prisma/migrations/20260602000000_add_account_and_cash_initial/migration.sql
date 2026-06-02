-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN "cashInitial" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN "account" TEXT NOT NULL DEFAULT 'bank';
