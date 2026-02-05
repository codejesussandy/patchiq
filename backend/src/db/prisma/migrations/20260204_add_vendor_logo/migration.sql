-- CreateTable
CREATE TABLE "vendor_logos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "object_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_logos_pkey" PRIMARY KEY ("id")
);
