PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_mini_app_installation` (
	`app_id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`content_hash` text NOT NULL,
	`source` text NOT NULL,
	`source_url` text,
	`source_origin` text,
	`manifest_json` text NOT NULL,
	`previous_manifest_json` text,
	`previous_content_hash` text,
	`previous_grants_json` text,
	`previous_consented_declared_json` text,
	`consented_declared_json` text DEFAULT '[]' NOT NULL,
	`ai_model_id` text,
	`ai_quick_model_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `mini_app`(`app_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mai_source_check" CHECK("__new_mini_app_installation"."source" IN ('file', 'url', 'builtin')),
	CONSTRAINT "mai_rollback_snapshot_all_or_none" CHECK(("__new_mini_app_installation"."previous_content_hash" IS NULL AND "__new_mini_app_installation"."previous_manifest_json" IS NULL
           AND "__new_mini_app_installation"."previous_grants_json" IS NULL AND "__new_mini_app_installation"."previous_consented_declared_json" IS NULL)
          OR ("__new_mini_app_installation"."previous_content_hash" IS NOT NULL AND "__new_mini_app_installation"."previous_manifest_json" IS NOT NULL
              AND "__new_mini_app_installation"."previous_grants_json" IS NOT NULL AND "__new_mini_app_installation"."previous_consented_declared_json" IS NOT NULL)),
	CONSTRAINT "mai_source_consistency" CHECK(("__new_mini_app_installation"."source" IN ('file', 'builtin') AND "__new_mini_app_installation"."source_url" IS NULL AND "__new_mini_app_installation"."source_origin" IS NULL)
          OR ("__new_mini_app_installation"."source" = 'url' AND "__new_mini_app_installation"."source_url" IS NOT NULL AND "__new_mini_app_installation"."source_origin" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_mini_app_installation`("app_id", "version", "content_hash", "source", "source_url", "source_origin", "manifest_json", "previous_manifest_json", "previous_content_hash", "previous_grants_json", "previous_consented_declared_json", "consented_declared_json", "ai_model_id", "ai_quick_model_id", "created_at", "updated_at") SELECT "app_id", "version", "content_hash", "source", "source_url", "source_origin", "manifest_json", "previous_manifest_json", "previous_content_hash", "previous_grants_json", "previous_consented_declared_json", "consented_declared_json", "ai_model_id", "ai_quick_model_id", "created_at", "updated_at" FROM `mini_app_installation`;--> statement-breakpoint
DROP TABLE `mini_app_installation`;--> statement-breakpoint
ALTER TABLE `__new_mini_app_installation` RENAME TO `mini_app_installation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;