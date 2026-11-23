-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChangeLog_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChangeLog_seriesId_id_idx" ON "ChangeLog"("seriesId", "id");

-- Specials are tracked by default from now on (they were untracked by default before).
UPDATE "Season" SET "tracked" = true WHERE "seasonNumber" = 0;
