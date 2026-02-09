-- MyGourmet Database Schema

CREATE DATABASE IF NOT EXISTS mygourmet_db;
USE mygourmet_db;

-- Dishes table
CREATE TABLE dishes (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image TEXT,
    rating INT DEFAULT 0,
    recipeLink TEXT,
    notes TEXT,
    timesCooked INT DEFAULT 0,
    lastCooked DATETIME,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients table
CREATE TABLE ingredients (
    id VARCHAR(36) PRIMARY KEY,
    dishId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount VARCHAR(50),
    unit VARCHAR(50),
    FOREIGN KEY (dishId) REFERENCES dishes(id) ON DELETE CASCADE
);

-- Dish tags table
CREATE TABLE dish_tags (
    dishId VARCHAR(36) NOT NULL,
    tagName VARCHAR(255) NOT NULL,
    PRIMARY KEY (dishId, tagName),
    FOREIGN KEY (dishId) REFERENCES dishes(id) ON DELETE CASCADE
);

-- Menu plans table
CREATE TABLE menu_plans (
    year INT NOT NULL,
    week INT NOT NULL,
    dishId VARCHAR(36) NOT NULL,
    PRIMARY KEY (year, week, dishId),
    FOREIGN KEY (dishId) REFERENCES dishes(id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE categories (
    name VARCHAR(255) PRIMARY KEY,
    sortOrder INT NOT NULL
);
