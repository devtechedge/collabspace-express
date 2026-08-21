-- Align SQLite with schema.prisma (background color + element style fields).

ALTER TABLE "Board" ADD COLUMN "backgroundColor" TEXT NOT NULL DEFAULT '#0b0f17';

ALTER TABLE "Element" ADD COLUMN "strokeStyle" TEXT NOT NULL DEFAULT 'solid';
ALTER TABLE "Element" ADD COLUMN "filled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Element" ADD COLUMN "zIndex" INTEGER NOT NULL DEFAULT 0;
