<?php
/**
 * MyGourmet Backend API - CamelCase Version
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = 'mygourmet-db';
$db   = 'mygourmet_db';
$user = 'gourmet_user';
$pass = 'gourmet_password'; 
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Datenbankverbindung fehlgeschlagen"]);
    exit;
}

$endpoint = $_GET['endpoint'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($endpoint) {
    case 'dishes':
        handleDishes($pdo, $method, $input);
        break;
    case 'plans':
        handlePlans($pdo, $method, $input);
        break;
    case 'categories':
        handleCategories($pdo, $method, $input);
        break;
    case 'scrape-recipe':
        handleScrapeRecipe($method, $input);
        break;
    default:
        http_response_code(404);
        echo json_encode(["error" => "Endpunkt nicht gefunden"]);
        break;
}

function handleDishes($pdo, $method, $input) {
    if ($method === 'GET') {
        try {
            // FIX: Hier stand vorher "created_at", geändert auf "createdAt"
            $stmt = $pdo->query("SELECT * FROM dishes ORDER BY createdAt DESC");
            $dishes = $stmt->fetchAll();

            foreach ($dishes as &$dish) {
                $dishId = $dish['id'];
                
                // Zutaten inkl. ID abrufen
                $stmtIng = $pdo->prepare("SELECT id, name, amount, unit FROM ingredients WHERE dishId = ?");
                $stmtIng->execute([$dishId]);
                $dish['ingredients'] = $stmtIng->fetchAll();

                // Tags abrufen
                $stmtTags = $pdo->prepare("SELECT tagName FROM dish_tags WHERE dishId = ?");
                $stmtTags->execute([$dishId]);
                $dish['tags'] = $stmtTags->fetchAll(PDO::FETCH_COLUMN);
            }
            echo json_encode($dishes);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    } 
    elseif ($method === 'POST') {
        try {
            $pdo->beginTransaction();
            $id = $input['id'] ?? null;
            if (!$id) throw new Exception("ID fehlt");

            // Upsert mit CamelCase Spaltennamen
            $sql = "INSERT INTO dishes (id, name, image, rating, recipeLink, notes, timesCooked, lastCooked, createdAt)
                    VALUES (:id, :name, :image, :rating, :recipeLink, :notes, :timesCooked, :lastCooked, :createdAt)
                    ON DUPLICATE KEY UPDATE
                    name = VALUES(name), image = VALUES(image), rating = VALUES(rating),
                    recipeLink = VALUES(recipeLink), notes = VALUES(notes),
                    timesCooked = VALUES(timesCooked), lastCooked = VALUES(lastCooked),
                    createdAt = COALESCE(VALUES(createdAt), createdAt)";

            // Convert ISO datetime to MySQL format
            $lastCooked = $input['lastCooked'] ?? null;
            if ($lastCooked) {
                // Convert ISO format (2026-01-09T23:19:44.123Z) to MySQL format (2026-01-09 23:19:44)
                $lastCooked = date('Y-m-d H:i:s', strtotime($lastCooked));
            }

            $createdAt = $input['createdAt'] ?? null;
            if ($createdAt) {
                $createdAt = date('Y-m-d H:i:s', strtotime($createdAt));
            } else {
                $createdAt = date('Y-m-d H:i:s');
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':name' => $input['name'],
                ':image' => $input['image'] ?? null,
                ':rating' => $input['rating'] ?? 0,
                ':recipeLink' => $input['recipeLink'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':timesCooked' => $input['timesCooked'] ?? 0,
                ':lastCooked' => $lastCooked,
                ':createdAt' => $createdAt
            ]);

            // Zutaten aktualisieren
            $pdo->prepare("DELETE FROM ingredients WHERE dishId = ?")->execute([$id]);
            if (!empty($input['ingredients'])) {
                $stmtIng = $pdo->prepare("INSERT INTO ingredients (id, dishId, name, amount, unit) VALUES (?, ?, ?, ?, ?)");
                foreach ($input['ingredients'] as $ing) {
                    $ingId = $ing['id'] ?? bin2hex(random_bytes(16)); 
                    $stmtIng->execute([$ingId, $id, $ing['name'], $ing['amount'] ?? '', $ing['unit'] ?? '']);
                }
            }

            // Tags aktualisieren
            $pdo->prepare("DELETE FROM dish_tags WHERE dishId = ?")->execute([$id]);
            if (!empty($input['tags'])) {
                $stmtTag = $pdo->prepare("INSERT INTO dish_tags (dishId, tagName) VALUES (?, ?)");
                foreach ($input['tags'] as $tag) {
                    $stmtTag->execute([$id, $tag]);
                }
            }

            $pdo->commit();
            echo json_encode(["status" => "success"]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            error_log("Dish update error: " . $e->getMessage());
            error_log("Input data: " . json_encode($input));
            echo json_encode(["error" => $e->getMessage()]);
        }
    } 
    elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        $stmt = $pdo->prepare("DELETE FROM dishes WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

function handlePlans($pdo, $method, $input) {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT year, week, dishId FROM menu_plans ORDER BY year DESC, week DESC");
        $rows = $stmt->fetchAll();
        
        $grouped = [];
        foreach ($rows as $row) {
            $planKey = $row['year'] . '-' . $row['week'];
            if (!isset($grouped[$planKey])) {
                $grouped[$planKey] = [
                    "id" => $planKey, 
                    "year" => (int)$row['year'],
                    "week" => (int)$row['week'],
                    "dishIds" => []
                ];
            }
            $grouped[$planKey]["dishIds"][] = $row['dishId'];
        }
        echo json_encode(array_values($grouped));
    } 
    elseif ($method === 'POST') {
        $sql = "INSERT IGNORE INTO menu_plans (year, week, dishId) VALUES (?, ?, ?)";
        $pdo->prepare($sql)->execute([$input['year'], $input['week'], $input['dishId']]);
        echo json_encode(["status" => "success"]);
    } 
    elseif ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM menu_plans WHERE year = ? AND week = ? AND dishId = ?");
        $stmt->execute([$_GET['year'], $_GET['week'], $_GET['dishId']]);
        echo json_encode(["status" => "success"]);
    }
}

function handleCategories($pdo, $method, $input) {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT name FROM categories ORDER BY sortOrder ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN));
    }
    elseif ($method === 'POST') {
        $pdo->beginTransaction();
        $pdo->exec("DELETE FROM categories");
        $stmt = $pdo->prepare("INSERT INTO categories (name, sortOrder) VALUES (?, ?)");
        foreach ($input as $index => $catName) {
            $stmt->execute([$catName, $index]);
        }
        $pdo->commit();
        echo json_encode(["status" => "success"]);
    }
}

function handleScrapeRecipe($method, $input) {
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        return;
    }

    $url = $input['url'] ?? '';
    if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid URL"]);
        return;
    }

    // Fetch the HTML content
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$html) {
        http_response_code(400);
        echo json_encode(["error" => "Failed to fetch recipe page"]);
        return;
    }

    // Parse the recipe data
    $recipeData = parseRecipeFromHtml($html, $url);

    echo json_encode($recipeData);
}

function parseRecipeFromHtml($html, $url) {
    $recipe = [
        'name' => '',
        'ingredients' => [],
        'notes' => '',
        'image' => '',
        'recipeLink' => $url
    ];

    // Load HTML into DOM
    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    $dom->loadHTML($html, LIBXML_NOERROR);
    libxml_clear_errors();

    // First, try to find JSON-LD structured data
    $scripts = $dom->getElementsByTagName('script');
    foreach ($scripts as $script) {
        if ($script->getAttribute('type') === 'application/ld+json') {
            $jsonLd = json_decode($script->textContent, true);
            if ($jsonLd && isset($jsonLd['@type']) && $jsonLd['@type'] === 'Recipe') {
                $recipe['name'] = $jsonLd['name'] ?? '';
                if (isset($jsonLd['image'])) {
                    $recipe['image'] = is_array($jsonLd['image']) ? ($jsonLd['image'][0] ?? '') : $jsonLd['image'];
                }
                if (isset($jsonLd['recipeIngredient'])) {
                    $recipe['ingredients'] = array_map(function($ing) {
                        // Try to parse amount and unit from ingredient string
                        return parseIngredientString($ing);
                    }, $jsonLd['recipeIngredient']);
                }
                $recipe['notes'] = $jsonLd['description'] ?? '';
                return $recipe; // Return early if structured data found
            }
        }
    }

    // Fallback to HTML parsing for cookidoo.de specific structure
    if (strpos($url, 'cookidoo.de') !== false) {
        // Try cookidoo specific selectors
        $xpath = new DOMXPath($dom);

        // Title
        $titleNodes = $xpath->query("//h1[@class='recipe-title'] | //h1[contains(@class, 'title')]");
        if ($titleNodes->length > 0) {
            $recipe['name'] = trim($titleNodes->item(0)->textContent);
        }

        // Ingredients
        $ingNodes = $xpath->query("//ul[@class='ingredients-list']//li | //div[contains(@class, 'ingredient')] | //li[contains(text(), 'g ') or contains(text(), 'ml ')]");
        foreach ($ingNodes as $node) {
            $text = trim($node->textContent);
            if ($text) {
                $recipe['ingredients'][] = parseIngredientString($text);
            }
        }

        // Image
        $imgNodes = $xpath->query("//img[@class='recipe-image'] | //img[contains(@src, 'recipe')]");
        if ($imgNodes->length > 0) {
            $src = $imgNodes->item(0)->getAttribute('src');
            if ($src && strpos($src, 'http') === 0) {
                $recipe['image'] = $src;
            }
        }

        return $recipe;
    }

    // General HTML parsing fallback
    $xpath = new DOMXPath($dom);

    // Title from h1
    $titleNodes = $xpath->query("//h1");
    if ($titleNodes->length > 0) {
        $recipe['name'] = trim($titleNodes->item(0)->textContent);
    }

    // Ingredients from common selectors
    $ingSelectors = [
        "//ul[contains(@class, 'ingredient')]//li",
        "//div[contains(@class, 'ingredient')]",
        "//li[contains(text(), 'g ') or contains(text(), 'ml ') or contains(text(), 'EL ') or contains(text(), 'TL ')]"
    ];

    foreach ($ingSelectors as $selector) {
        $ingNodes = $xpath->query($selector);
        if ($ingNodes->length > 0) {
            foreach ($ingNodes as $node) {
                $text = trim($node->textContent);
                if ($text && strlen($text) > 3) {
                    $recipe['ingredients'][] = parseIngredientString($text);
                }
            }
            break; // Use first matching selector
        }
    }

    // Image from meta og:image or first recipe image
    $imgNodes = $xpath->query("//meta[@property='og:image']");
    if ($imgNodes->length > 0) {
        $recipe['image'] = $imgNodes->item(0)->getAttribute('content');
    }

    return $recipe;
}

function parseIngredientString($text) {
    // Simple parsing: try to extract amount, unit, name
    // Examples: "200 g Mehl", "1 EL Öl", "Salz", "2 Zwiebeln"
    $text = trim($text);

    // Match patterns like "200 g Mehl" or "1 EL Zucker"
    if (preg_match('/^(\d+(?:[,.]\d+)?)\s*(\w+)\s+(.+)$/', $text, $matches)) {
        return [
            'id' => bin2hex(random_bytes(8)),
            'amount' => $matches[1],
            'unit' => $matches[2],
            'name' => trim($matches[3])
        ];
    }

    // Match "2 Zwiebeln" (no unit)
    if (preg_match('/^(\d+(?:[,.]\d+)?)\s+(.+)$/', $text, $matches)) {
        return [
            'id' => bin2hex(random_bytes(8)),
            'amount' => $matches[1],
            'unit' => '',
            'name' => trim($matches[2])
        ];
    }

    // Just name
    return [
        'id' => bin2hex(random_bytes(8)),
        'amount' => '',
        'unit' => '',
        'name' => $text
    ];
}
