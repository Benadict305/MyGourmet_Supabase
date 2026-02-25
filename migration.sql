-- Add id column to mygourmet_categories
ALTER TABLE mygourmet_categories ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- Add name and sortOrder columns to mygourmet_categories
ALTER TABLE mygourmet_categories ADD COLUMN name TEXT;
ALTER TABLE mygourmet_categories ADD COLUMN sortOrder INT;

-- Remove the existing primary key
ALTER TABLE mygourmet_categories DROP CONSTRAINT mygourmet_categories_pkey;

-- Set the new primary key
ALTER TABLE mygourmet_categories ADD PRIMARY KEY (id);

-- Make the name column unique
ALTER TABLE mygourmet_categories ADD CONSTRAINT mygourmet_categories_name_key UNIQUE (name);
