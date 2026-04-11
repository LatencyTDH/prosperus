CREATE TYPE "public"."span_kind" AS ENUM('llm', 'workflow', 'agent', 'tool', 'task', 'embedding', 'retrieval');--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"span_id" varchar(32),
	"trace_id" varchar(32),
	"app_name" text NOT NULL,
	"label" text NOT NULL,
	"metric_type" text NOT NULL,
	"numeric_value" real,
	"string_value" text,
	"assessment" text,
	"reasoning" text,
	"tags" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"app_name" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"baseline_tag" text,
	"variant_tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'running' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" varchar(128) NOT NULL,
	"version" text NOT NULL,
	"template" text,
	"chat_template" jsonb,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prompts_id_version_pk" PRIMARY KEY("id","version")
);
--> statement-breakpoint
CREATE TABLE "spans" (
	"span_id" varchar(32) PRIMARY KEY NOT NULL,
	"trace_id" varchar(32) NOT NULL,
	"parent_id" varchar(32),
	"name" text NOT NULL,
	"kind" "span_kind" NOT NULL,
	"app_name" text NOT NULL,
	"start_ns" bigint NOT NULL,
	"end_ns" bigint NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '{}'::jsonb,
	"error" jsonb,
	"session_id" text,
	"prompt" jsonb,
	"model_name" text,
	"model_provider" text,
	"input_cost" real,
	"output_cost" real,
	"total_cost" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_eval_span_id" ON "evaluations" USING btree ("span_id");--> statement-breakpoint
CREATE INDEX "idx_eval_trace_id" ON "evaluations" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_eval_app_name" ON "evaluations" USING btree ("app_name");--> statement-breakpoint
CREATE INDEX "idx_eval_label" ON "evaluations" USING btree ("label");--> statement-breakpoint
CREATE INDEX "idx_experiments_app_name" ON "experiments" USING btree ("app_name");--> statement-breakpoint
CREATE INDEX "idx_experiments_status" ON "experiments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prompts_id_version" ON "prompts" USING btree ("id","version");--> statement-breakpoint
CREATE INDEX "idx_spans_trace_id" ON "spans" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_spans_app_name" ON "spans" USING btree ("app_name");--> statement-breakpoint
CREATE INDEX "idx_spans_kind" ON "spans" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_spans_created_at" ON "spans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_spans_session_id" ON "spans" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_spans_model" ON "spans" USING btree ("model_name","model_provider");
