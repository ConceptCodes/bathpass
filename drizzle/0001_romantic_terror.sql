DROP INDEX "idx_passes_possession_token_digest";--> statement-breakpoint
CREATE INDEX "idx_passes_possession_token_digest" ON "passes" USING btree ("possession_token_digest");