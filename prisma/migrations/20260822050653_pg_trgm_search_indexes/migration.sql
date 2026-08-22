-- Trigram indexes make fuzzy city/activity search sub-10 ms instead of a seq scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS city_name_trgm_idx     ON "City"     USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS city_country_trgm_idx  ON "City"     USING gin (country gin_trgm_ops);
CREATE INDEX IF NOT EXISTS activity_name_trgm_idx ON "Activity" USING gin (name gin_trgm_ops);
