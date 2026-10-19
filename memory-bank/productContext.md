# Product Context

Describe the product.

## Overview

Provide a high-level overview of the project.

## Core Features

- Feature 1
- Feature 2

## Technical Stack

- Tech 1
- Tech 2

## Project Description

A personal portfolio website showcasing architectural and design work through image galleries, built with static HTML/CSS/JS and powered by Supabase for dynamic content management.



## Architecture

The project uses a Supabase database with the following schema in the public schema:

### Tables:
- **galleries**: Stores gallery information (21 rows). Columns: id (text, PK), title (text), location (text, nullable), folder (text), video (text, nullable), created_at (timestamptz, nullable, default now), thumb_id (uuid, nullable, FK to images.id), category_id (bigint, FK to categories.id), pdf_file (text, nullable), latitude (float8, nullable), longitude (float8, nullable).

- **sections**: Stores sections within galleries (24 rows). Columns: id (bigint, PK, identity), gallery_id (text, FK to galleries.id), title (text, nullable), folder (text, nullable, default ''), sort_order (int4, default 0).

- **images**: Master Images Table (185 rows). Columns: id (uuid, PK, default gen_random_uuid), section_id (bigint, FK to sections.id), src (text), thumb (text, nullable), width (int4, nullable), height (int4, nullable), alt (text, nullable), sort_order (int4, default 0).

- **categories**: Gallery Categories (8 rows). Columns: id (bigint, PK, identity), name (text, unique), sort_order (int4, default 0), created_at (timestamptz, nullable, default now), color (text, nullable, default '#3388ff').

All tables have RLS enabled. Relationships: galleries -> images (thumb), galleries -> categories, sections -> galleries, images -> sections.

### Storage Buckets:
- **portfolio-images**: Public bucket for image files (image/* MIME types). Created 2025-12-02.
- **portfolio-drawings**: Public bucket for PDF drawings (application/pdf MIME types). Created 2025-12-02.

Storage config: File size limit 50MB, image transformation enabled, S3 protocol enabled.



The project uses a Supabase database with the following schema in the public schema:

### Tables:
- **galleries**: Stores gallery information (21 rows). Columns: id (text, PK), title (text), location (text, nullable), folder (text), video (text, nullable), created_at (timestamptz, nullable, default now), thumb_id (uuid, nullable, FK to images.id), category_id (bigint, FK to categories.id), pdf_file (text, nullable), latitude (float8, nullable), longitude (float8, nullable).

- **sections**: Stores sections within galleries (24 rows). Columns: id (bigint, PK, identity), gallery_id (text, FK to galleries.id), title (text, nullable), folder (text, nullable, default ''), sort_order (int4, default 0).

- **images**: Master Images Table (185 rows). Columns: id (uuid, PK, default gen_random_uuid), section_id (bigint, FK to sections.id), src (text), thumb (text, nullable), width (int4, nullable), height (int4, nullable), alt (text, nullable), sort_order (int4, default 0).

- **categories**: Gallery Categories (8 rows). Columns: id (bigint, PK, identity), name (text, unique), sort_order (int4, default 0), created_at (timestamptz, nullable, default now), color (text, nullable, default '#3388ff').

All tables have RLS enabled. Relationships: galleries -> images (thumb), galleries -> categories, sections -> galleries, images -> sections.



## Technologies

- HTML
- CSS
- JavaScript
- Supabase
- Python (for build tools)



## Libraries and Dependencies

- Supabase JS client

