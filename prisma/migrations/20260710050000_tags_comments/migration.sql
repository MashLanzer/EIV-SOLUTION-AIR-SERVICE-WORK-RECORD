-- Photo tags (organize/search) and comments (collaboration). All org-scoped.

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_organizationId_name_key" ON "Tag"("organizationId", "name");
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PhotoTag" (
    "photoId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PhotoTag_pkey" PRIMARY KEY ("photoId", "tagId")
);

CREATE INDEX "PhotoTag_tagId_idx" ON "PhotoTag"("tagId");

ALTER TABLE "PhotoTag" ADD CONSTRAINT "PhotoTag_photoId_fkey"
    FOREIGN KEY ("photoId") REFERENCES "Photo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhotoTag" ADD CONSTRAINT "PhotoTag_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "Tag"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Comment_organizationId_idx" ON "Comment"("organizationId");
CREATE INDEX "Comment_photoId_idx" ON "Comment"("photoId");

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_photoId_fkey"
    FOREIGN KEY ("photoId") REFERENCES "Photo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
