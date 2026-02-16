-- AlterTable
ALTER TABLE "asset_alerts" ADD COLUMN     "acknowledge_note" TEXT,
ADD COLUMN     "acknowledged_at" TIMESTAMP(3),
ADD COLUMN     "acknowledged_by" TEXT,
ADD COLUMN     "resolution_note" TEXT,
ADD COLUMN     "resolved_by" TEXT;

-- CreateTable
CREATE TABLE "redhat_nominations" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "endpoint" INTEGER NOT NULL DEFAULT 0,
    "scheduled_time" TEXT,
    "last_sync_time" TIMESTAMP(3),
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redhat_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redhat_nominations_agent_id_key" ON "redhat_nominations"("agent_id");

-- CreateIndex
CREATE INDEX "asset_alerts_status_severity_idx" ON "asset_alerts"("status", "severity");

-- AddForeignKey
ALTER TABLE "redhat_nominations" ADD CONSTRAINT "redhat_nominations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_alerts" ADD CONSTRAINT "asset_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_alerts" ADD CONSTRAINT "asset_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
