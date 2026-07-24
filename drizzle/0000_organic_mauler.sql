CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"show_id" text NOT NULL,
	"seat_ids" jsonb NOT NULL,
	"tier_breakdown" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"convenience_fee" integer NOT NULL,
	"total" integer NOT NULL,
	"status" text NOT NULL,
	"qr_payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cinemas" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"synopsis" text NOT NULL,
	"genres" jsonb NOT NULL,
	"languages" jsonb NOT NULL,
	"duration_minutes" integer NOT NULL,
	"certification" text NOT NULL,
	"rating" double precision NOT NULL,
	"release_date" text NOT NULL,
	"status" text NOT NULL,
	"poster_url" text NOT NULL,
	"backdrop_url" text NOT NULL,
	"director" text NOT NULL,
	"cast" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screens" (
	"id" text PRIMARY KEY NOT NULL,
	"cinema_id" text NOT NULL,
	"name" text NOT NULL,
	"layout" jsonb NOT NULL,
	"features" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"show_id" text NOT NULL,
	"seat_ids" jsonb NOT NULL,
	"holder_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" text PRIMARY KEY NOT NULL,
	"movie_id" text NOT NULL,
	"cinema_id" text NOT NULL,
	"screen_id" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"language" text NOT NULL,
	"format" text NOT NULL,
	"price_overrides" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cinemas" ADD CONSTRAINT "cinemas_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_cinema_id_cinemas_id_fk" FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_cinema_id_cinemas_id_fk" FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;