-- GÉNÉRÉ par app/scripts/dumpSchema.mjs (supabase db dump --local --schema public) — ne pas éditer



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."consume_credits"("uid" "uuid", "amount" integer, "reason" "text", "ref" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare bal int;
begin
  if amount <= 0 then raise exception 'invalid_amount'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  -- déjà débité pour cette ref → idempotent, on renvoie simplement le solde
  if exists (select 1 from public.credit_ledger l where l.user_id = uid and l.reason = consume_credits.reason and l.ref = consume_credits.ref) then
    select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid; return bal;
  end if;
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  if bal < amount then raise exception 'insufficient_credits' using detail = bal::text; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -amount, reason, ref);
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  return bal;
end $$;


ALTER FUNCTION "public"."consume_credits"("uid" "uuid", "amount" integer, "reason" "text", "ref" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."content_items" (
    "id" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "tier" integer DEFAULT 2 NOT NULL,
    "version" integer NOT NULL,
    "payload" "jsonb" NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "content_items_kind_check" CHECK (("kind" = ANY (ARRAY['case'::"text", 'fachwissen'::"text", 'fachbegriff'::"text", 'aufklaerung'::"text", 'guide'::"text", 'muster'::"text"]))),
    CONSTRAINT "content_items_tier_check" CHECK ((("tier" >= 1) AND ("tier" <= 3)))
);


ALTER TABLE "public"."content_items" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."content_since"("since" integer) RETURNS SETOF "public"."content_items"
    LANGUAGE "sql" STABLE
    AS $$
  select * from public.content_items where version > since
$$;


ALTER FUNCTION "public"."content_since"("since" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."credit_balance"("uid" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((select balance from public.credit_balances where user_id = uid), 0)
$$;


ALTER FUNCTION "public"."credit_balance"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."effective_plan"("uid" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((
    select case
      when s.status in ('active','trialing') then s.plan_id
      when s.status = 'past_due' and s.updated_at > now() - interval '7 days' then s.plan_id
      when s.status = 'canceled' and s.current_period_end is not null
        and s.current_period_end > now() then s.plan_id
      else 'free' end
    from public.subscriptions s where s.user_id = uid
  ), 'free')
$$;


ALTER FUNCTION "public"."effective_plan"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_credits"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.credit_balance(auth.uid())
$$;


ALTER FUNCTION "public"."my_credits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_plan"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.effective_plan(auth.uid())
$$;


ALTER FUNCTION "public"."my_plan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_tier"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.tier_of(auth.uid())
$$;


ALTER FUNCTION "public"."my_tier"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "target_land" "text",
    "exam_date" "date",
    "language_level" "text",
    "procedure_stage" "text",
    "origin_specialty" "text",
    "diploma_country" "text",
    "kp_intended" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_language_level_check" CHECK (("language_level" = ANY (ARRAY['B2'::"text", 'C1'::"text", 'C1+'::"text"]))),
    CONSTRAINT "profiles_procedure_stage_check" CHECK (("procedure_stage" = ANY (ARRAY['approbation_requested'::"text", 'gleichwertigkeit'::"text", 'fsp_planned'::"text", 'fsp_failed_once'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profile_completed"("p" "public"."profiles") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select p.target_land is not null and p.language_level is not null and p.procedure_stage is not null
$$;


ALTER FUNCTION "public"."profile_completed"("p" "public"."profiles") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.id := old.id; new.created_at := old.created_at;
  return new;
end $$;


ALTER FUNCTION "public"."profiles_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."progress_events_stamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ begin new.received_at := now(); return new; end $$;


ALTER FUNCTION "public"."progress_events_stamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rate_hit"("k" "text", "max_hits" integer, "window_sec" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / window_sec) * window_sec); c int;
begin
  insert into public.rate_limits(key, window_start, count) values (k, ws, 1)
    on conflict (key, window_start) do update set count = public.rate_limits.count + 1 returning count into c;
  return c <= max_hits;
end $$;


ALTER FUNCTION "public"."rate_hit"("k" "text", "max_hits" integer, "window_sec" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_credit_balances"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  refresh materialized view concurrently public.credit_balances;
  return null;
end $$;


ALTER FUNCTION "public"."refresh_credit_balances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tier_of"("uid" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((
    select e.limit_value from public.entitlements e
    where e.plan_id = public.effective_plan(uid) and e.feature = 'content.tier'
  ), 1)
$$;


ALTER FUNCTION "public"."tier_of"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_versions" (
    "version" integer NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."content_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "text" NOT NULL,
    "ref" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_ledger_reason_check" CHECK (("reason" = ANY (ARRAY['monthly_grant'::"text", 'purchase'::"text", 'ai.arztbrief'::"text", 'ai.voice'::"text", 'community_protocol'::"text", 'league_reward'::"text", 'refund'::"text", 'demo_grant'::"text"])))
);


ALTER TABLE "public"."credit_ledger" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."credit_balances" AS
 SELECT "user_id",
    ("sum"("delta"))::integer AS "balance"
   FROM "public"."credit_ledger"
  GROUP BY "user_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."credit_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entitlements" (
    "plan_id" "text" NOT NULL,
    "feature" "text" NOT NULL,
    "limit_value" integer
);


ALTER TABLE "public"."entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "stripe_price_id" "text",
    "monthly_credits" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."progress_events" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "subject_id" "text",
    "payload" "jsonb" NOT NULL,
    "occurred_at" timestamp with time zone NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "progress_events_type_check" CHECK (("type" = ANY (ARRAY['simulation.completed'::"text", 'srs.reviewed'::"text", 'plan.done'::"text", 'case.layer_reached'::"text", 'program.configured'::"text", 'term.favorited'::"text", 'term.unfavorited'::"text", 'deck.created'::"text", 'deck.renamed'::"text", 'deck.query_changed'::"text", 'deck.deleted'::"text", 'deck.term_added'::"text", 'deck.term_removed'::"text"])))
);


ALTER TABLE "public"."progress_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "key" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_events" (
    "event_id" "text" NOT NULL,
    "type" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "user_id" "uuid" NOT NULL,
    "plan_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "stripe_subscription_id" "text",
    "status" "text" NOT NULL,
    "current_period_end" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'past_due'::"text", 'canceled'::"text", 'incomplete'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_versions"
    ADD CONSTRAINT "content_versions_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_user_id_reason_ref_key" UNIQUE ("user_id", "reason", "ref");



ALTER TABLE ONLY "public"."entitlements"
    ADD CONSTRAINT "entitlements_pkey" PRIMARY KEY ("plan_id", "feature");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."progress_events"
    ADD CONSTRAINT "progress_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key", "window_start");



ALTER TABLE ONLY "public"."stripe_events"
    ADD CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



CREATE INDEX "content_items_kind_tier_idx" ON "public"."content_items" USING "btree" ("kind", "tier");



CREATE INDEX "content_items_version_idx" ON "public"."content_items" USING "btree" ("version");



CREATE UNIQUE INDEX "credit_balances_user_id_idx" ON "public"."credit_balances" USING "btree" ("user_id");



CREATE INDEX "credit_ledger_user_id_idx" ON "public"."credit_ledger" USING "btree" ("user_id");



CREATE INDEX "progress_events_user_id_occurred_at_idx" ON "public"."progress_events" USING "btree" ("user_id", "occurred_at");



CREATE INDEX "progress_events_user_id_type_subject_id_idx" ON "public"."progress_events" USING "btree" ("user_id", "type", "subject_id");



CREATE OR REPLACE TRIGGER "credit_ledger_refresh" AFTER INSERT OR DELETE ON "public"."credit_ledger" FOR EACH STATEMENT EXECUTE FUNCTION "public"."refresh_credit_balances"();



CREATE OR REPLACE TRIGGER "profiles_guard" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_guard"();



CREATE OR REPLACE TRIGGER "profiles_touch" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "progress_events_stamp" BEFORE INSERT ON "public"."progress_events" FOR EACH ROW EXECUTE FUNCTION "public"."progress_events_stamp"();



CREATE OR REPLACE TRIGGER "subscriptions_touch" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_version_fkey" FOREIGN KEY ("version") REFERENCES "public"."content_versions"("version");



ALTER TABLE ONLY "public"."credit_ledger"
    ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entitlements"
    ADD CONSTRAINT "entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress_events"
    ADD CONSTRAINT "progress_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "content: read by tier" ON "public"."content_items" FOR SELECT USING (("tier" <= "public"."my_tier"()));



ALTER TABLE "public"."content_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entitlements: public read" ON "public"."entitlements" FOR SELECT USING (true);



CREATE POLICY "events: own insert" ON "public"."progress_events" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "events: own read" ON "public"."progress_events" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "ledger: own read" ON "public"."credit_ledger" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plans: public read" ON "public"."plans" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: own read" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles: own update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."progress_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions: own read" ON "public"."subscriptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "versions: public read" ON "public"."content_versions" FOR SELECT USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_credits"("uid" "uuid", "amount" integer, "reason" "text", "ref" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_credits"("uid" "uuid", "amount" integer, "reason" "text", "ref" "text") TO "service_role";



GRANT ALL ON TABLE "public"."content_items" TO "anon";
GRANT ALL ON TABLE "public"."content_items" TO "authenticated";
GRANT ALL ON TABLE "public"."content_items" TO "service_role";



GRANT ALL ON FUNCTION "public"."content_since"("since" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."content_since"("since" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."content_since"("since" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."credit_balance"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."credit_balance"("uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."effective_plan"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."effective_plan"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_credits"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_credits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_plan"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_plan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_tier"() TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."profile_completed"("p" "public"."profiles") TO "anon";
GRANT ALL ON FUNCTION "public"."profile_completed"("p" "public"."profiles") TO "authenticated";
GRANT ALL ON FUNCTION "public"."profile_completed"("p" "public"."profiles") TO "service_role";



GRANT ALL ON FUNCTION "public"."profiles_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."profiles_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profiles_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."progress_events_stamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."progress_events_stamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."progress_events_stamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rate_hit"("k" "text", "max_hits" integer, "window_sec" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rate_hit"("k" "text", "max_hits" integer, "window_sec" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_credit_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_credit_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_credit_balances"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tier_of"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tier_of"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."content_versions" TO "anon";
GRANT ALL ON TABLE "public"."content_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."content_versions" TO "service_role";



GRANT ALL ON TABLE "public"."credit_ledger" TO "anon";
GRANT ALL ON TABLE "public"."credit_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."credit_balances" TO "service_role";



GRANT ALL ON TABLE "public"."entitlements" TO "anon";
GRANT ALL ON TABLE "public"."entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."progress_events" TO "anon";
GRANT ALL ON TABLE "public"."progress_events" TO "authenticated";
GRANT ALL ON TABLE "public"."progress_events" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







