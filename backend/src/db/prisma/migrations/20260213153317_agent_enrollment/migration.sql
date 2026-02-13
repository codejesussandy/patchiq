-- CreateTable
CREATE TABLE "enroll_secrets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "organization_id" TEXT,
    "department_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enroll_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enroll_secrets_secret_key" ON "enroll_secrets"("secret");

-- AddForeignKey
ALTER TABLE "enroll_secrets" ADD CONSTRAINT "enroll_secrets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enroll_secrets" ADD CONSTRAINT "enroll_secrets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
