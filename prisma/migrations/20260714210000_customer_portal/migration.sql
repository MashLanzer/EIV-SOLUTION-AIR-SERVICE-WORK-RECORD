-- Private customer portal token: unguessable link that lets a customer view
-- their own work history, photos and invoices without logging in.
ALTER TABLE "Customer" ADD COLUMN "portalToken" TEXT;

CREATE UNIQUE INDEX "Customer_portalToken_key" ON "Customer"("portalToken");
