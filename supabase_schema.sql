-- MyGourmet Database Schema for Supabase (PostgreSQL)

-- Dishes table
CREATE TABLE IF NOT EXISTS mygourmet_dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image TEXT,
    rating INT DEFAULT 0,
    recipeLink TEXT,
    notes TEXT,
    timesCooked INT DEFAULT 0,
    lastCooked TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS mygourmet_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dishId UUID NOT NULL REFERENCES mygourmet_dishes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount TEXT,
    unit TEXT
);

-- Dish tags table
CREATE TABLE IF NOT EXISTS mygourmet_dish_tags (
    dishId UUID NOT NULL REFERENCES mygourmet_dishes(id) ON DELETE CASCADE,
    tagName TEXT NOT NULL,
    PRIMARY KEY (dishId, tagName)
);

-- Menu plans table
CREATE TABLE IF NOT EXISTS mygourmet_menu_plans (
    year INT NOT NULL,
    week INT NOT NULL,
    dishId UUID NOT NULL REFERENCES mygourmet_dishes(id) ON DELETE CASCADE,
    PRIMARY KEY (year, week, dishId)
);

-- Categories table
CREATE TABLE IF NOT EXISTS mygourmet_categories (
    name TEXT PRIMARY KEY,
    sortOrder INT NOT NULL DEFAULT 0
);

-- Initial Categories Seed
INSERT INTO mygourmet_categories (name, sortOrder) VALUES
('Hauptgerichte', 1),
('Suppen', 2),
('Salate', 3),
('Nachtisch', 4),
('Frühstück', 5),
('Snacks', 6),
('Beilagen', 7),
('Backen', 8),
('Getränke', 9),
('Nicht allergenfrei', 10),
('Arbeit Aufläufe', 11),
('Eintop', 12),
('Baby', 13),
('Kalorienreduziert', 14),
('Pasten & Co', 15),
('Fisch', 16),
('Aufstriche', 17),
('Besondere Fleischgerichte', 18),
('Qinoa', 19),
('Reis', 20),
('Nudeln', 21),
('Currys', 22)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies (Optional but recommended)
ALTER TABLE mygourmet_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mygourmet_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mygourmet_dish_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mygourmet_menu_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE mygourmet_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (adjust for auth requirement)
CREATE POLICY "Public Access Dishes" ON mygourmet_dishes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Ingredients" ON mygourmet_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access DishTags" ON mygourmet_dish_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access MenuPlans" ON mygourmet_menu_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Categories" ON mygourmet_categories FOR ALL USING (true) WITH CHECK (true);
