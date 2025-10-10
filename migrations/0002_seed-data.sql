-- Seed Data for The Pensieve Index
-- Run after: wrangler d1 migrations apply pensive-index --remote
-- ======================================
-- SAMPLE FANDOMS
-- ======================================
INSERT
    OR IGNORE INTO fandoms (name, slug, description, is_active)
VALUES (
        'Harry Potter',
        'harry-potter',
        'The wizarding world of Harry Potter, Hogwarts, and magical Britain',
        1
    ),
    (
        'Percy Jackson',
        'percy-jackson',
        'Camp Half-Blood, the Olympian gods, and modern mythology',
        1
    ),
    (
        'Marvel Cinematic Universe',
        'mcu',
        'Earth''s Mightiest Heroes, SHIELD, and the wider MCU',
        1
    ),
    (
        'Star Wars',
        'star-wars',
        'A galaxy far, far away - Jedi, Sith, and the Force',
        1
    ),
    (
        'DC Universe',
        'dc',
        'Justice League, Gotham, and the DC multiverse',
        1
    );
-- ======================================
-- HARRY POTTER: TAG CLASSES
-- ======================================
-- Shipping tag class (mutual exclusion)
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-hp-shipping',
        'Shipping',
        'shipping',
        'Romantic pairings and relationships',
        '1',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    );
-- Era tag class (mutual exclusion)
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-hp-era',
        'Era',
        'era',
        'Time period when the story takes place',
        '1',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    );
-- Alternate Universe type
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-hp-au',
        'Alternate Universe',
        'au',
        'AU types and major divergences',
        '1',
        '{}',
        1
    );
-- House Lordship (can have multiple)
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-hp-lordship',
        'House Lordship',
        'lordship',
        'Noble house lordships and inheritances',
        '1',
        '{}',
        1
    );
-- Character Focus
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-hp-character',
        'Character Focus',
        'character',
        'Main character perspectives',
        '1',
        '{}',
        1
    );
-- ======================================
-- HARRY POTTER: TAGS
-- ======================================
-- Shipping tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-hp-ship-harmony',
        'Harry/Hermione',
        'harry-hermione',
        '1',
        'tc-hp-shipping',
        'Shipping',
        1
    ),
    (
        'tag-hp-ship-hinny',
        'Harry/Ginny',
        'harry-ginny',
        '1',
        'tc-hp-shipping',
        'Shipping',
        1
    ),
    (
        'tag-hp-ship-drarry',
        'Harry/Draco',
        'harry-draco',
        '1',
        'tc-hp-shipping',
        'Shipping',
        1
    ),
    (
        'tag-hp-ship-romione',
        'Ron/Hermione',
        'ron-hermione',
        '1',
        'tc-hp-shipping',
        'Shipping',
        1
    ),
    (
        'tag-hp-ship-dramione',
        'Draco/Hermione',
        'draco-hermione',
        '1',
        'tc-hp-shipping',
        'Shipping',
        1
    );
-- Era tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-hp-era-marauders',
        'Marauders Era',
        'marauders-era',
        '1',
        'tc-hp-era',
        'Era',
        1
    ),
    (
        'tag-hp-era-hogwarts',
        'Hogwarts Era',
        'hogwarts-era',
        '1',
        'tc-hp-era',
        'Era',
        1
    ),
    (
        'tag-hp-era-post-war',
        'Post-War',
        'post-war',
        '1',
        'tc-hp-era',
        'Era',
        1
    ),
    (
        'tag-hp-era-next-gen',
        'Next Generation',
        'next-gen',
        '1',
        'tc-hp-era',
        'Era',
        1
    );
-- AU tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-hp-au-no-hogwarts',
        'No Hogwarts AU',
        'no-hogwarts',
        '1',
        'tc-hp-au',
        'AU',
        1
    ),
    (
        'tag-hp-au-muggle',
        'Muggle AU',
        'muggle-au',
        '1',
        'tc-hp-au',
        'AU',
        1
    ),
    (
        'tag-hp-au-sorted-different',
        'Different House Sorting',
        'sorted-different',
        '1',
        'tc-hp-au',
        'AU',
        1
    ),
    (
        'tag-hp-au-wbwl',
        'Wrong Boy Who Lived',
        'wbwl',
        '1',
        'tc-hp-au',
        'AU',
        1
    ),
    (
        'tag-hp-au-time-travel',
        'Time Travel',
        'time-travel',
        '1',
        'tc-hp-au',
        'AU',
        1
    );
-- Lordship tags (can be combined)
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-hp-lord-potter',
        'Lord Potter',
        'lord-potter',
        '1',
        'tc-hp-lordship',
        'Lordship',
        1
    ),
    (
        'tag-hp-lord-black',
        'Lord Black',
        'lord-black',
        '1',
        'tc-hp-lordship',
        'Lordship',
        1
    ),
    (
        'tag-hp-lord-slytherin',
        'Lord Slytherin',
        'lord-slytherin',
        '1',
        'tc-hp-lordship',
        'Lordship',
        1
    ),
    (
        'tag-hp-lord-peverell',
        'Lord Peverell',
        'lord-peverell',
        '1',
        'tc-hp-lordship',
        'Lordship',
        1
    ),
    (
        'tag-hp-lord-gryffindor',
        'Lord Gryffindor',
        'lord-gryffindor',
        '1',
        'tc-hp-lordship',
        'Lordship',
        1
    );
-- Character Focus tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-hp-char-harry',
        'Harry Potter',
        'harry-potter',
        '1',
        'tc-hp-character',
        'Character',
        1
    ),
    (
        'tag-hp-char-hermione',
        'Hermione Granger',
        'hermione-granger',
        '1',
        'tc-hp-character',
        'Character',
        1
    ),
    (
        'tag-hp-char-draco',
        'Draco Malfoy',
        'draco-malfoy',
        '1',
        'tc-hp-character',
        'Character',
        1
    ),
    (
        'tag-hp-char-severus',
        'Severus Snape',
        'severus-snape',
        '1',
        'tc-hp-character',
        'Character',
        1
    );
-- General tags (no class)
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        description,
        fandom_id,
        category,
        is_active
    )
VALUES (
        'tag-hp-angst',
        'Angst',
        'angst',
        'Emotional pain and suffering',
        '1',
        'Tone',
        1
    ),
    (
        'tag-hp-fluff',
        'Fluff',
        'fluff',
        'Light-hearted and romantic',
        '1',
        'Tone',
        1
    ),
    (
        'tag-hp-humor',
        'Humor',
        'humor',
        'Comedy and funny moments',
        '1',
        'Tone',
        1
    ),
    (
        'tag-hp-dark',
        'Dark',
        'dark',
        'Dark themes and content',
        '1',
        'Tone',
        1
    ),
    (
        'tag-hp-adventure',
        'Adventure',
        'adventure',
        'Action and adventure',
        '1',
        'Genre',
        1
    ),
    (
        'tag-hp-mystery',
        'Mystery',
        'mystery',
        'Mystery and investigation',
        '1',
        'Genre',
        1
    );
-- ======================================
-- HARRY POTTER: PLOT BLOCKS (TROPES)
-- ======================================
-- Plot Block Category
INSERT
    OR IGNORE INTO plot_block_categories (
        id,
        name,
        slug,
        description,
        fandom_id,
        is_active
    )
VALUES (
        'pbc-hp-inheritance',
        'Inheritance Plots',
        'inheritance',
        'Goblin inheritance, lordship, and vault discoveries',
        '1',
        1
    ),
    (
        'pbc-hp-power',
        'Power Acquisition',
        'power',
        'New powers, abilities, and training',
        '1',
        1
    ),
    (
        'pbc-hp-political',
        'Political Intrigue',
        'political',
        'Wizengamot, politics, and alliances',
        '1',
        1
    );
-- Sample Plot Blocks (Tropes)
INSERT
    OR IGNORE INTO plot_blocks (
        id,
        name,
        slug,
        description,
        fandom_id,
        plot_block_category_id,
        tag_combinations,
        context,
        is_active
    )
VALUES (
        'pb-hp-goblin-inheritance',
        'Goblin Inheritance Discovery',
        'goblin-inheritance',
        'Harry discovers multiple lordships through Gringotts inheritance test',
        '1',
        'pbc-hp-inheritance',
        '[
      {"required": ["tag-hp-lord-potter"], "optional": ["tag-hp-lord-black", "tag-hp-lord-slytherin", "tag-hp-lord-peverell"]},
      {"context": "Usually occurs after Sirius death or emancipation"}
    ]',
        'Common trope where Harry learns of hidden family wealth and lordships. Can include: multiple vaults, ancestral properties, political seats in Wizengamot, and magical artifacts.',
        1
    ),
    (
        'pb-hp-wbwl-lordship',
        'Wrong BWL + Early Lordship',
        'wbwl-lordship',
        'Harry is overlooked for twin, but inherits lordships early',
        '1',
        'pbc-hp-inheritance',
        '[
      {"required": ["tag-hp-au-wbwl", "tag-hp-lord-potter"]},
      {"optional": ["tag-hp-lord-black", "tag-hp-lord-slytherin"]},
      {"context": "Usually with neglectful parents"}
    ]',
        'Wrong Boy Who Lived scenario combined with early lordship inheritance, often at age 11 or after emancipation.',
        1
    ),
    (
        'pb-hp-time-travel-fix',
        'Time Travel Knowledge Fix',
        'time-travel-fix',
        'Harry travels back with future knowledge to fix past mistakes',
        '1',
        'pbc-hp-power',
        '[
      {"required": ["tag-hp-au-time-travel"]},
      {"optional": ["tag-hp-char-harry", "tag-hp-char-hermione"]},
      {"enhances": ["tag-hp-lord-potter", "tag-hp-lord-black"]}
    ]',
        'Character(s) travel back in time, usually to Marauders Era or start of Hogwarts, with knowledge to prevent deaths and dark lord victories.',
        1
    );
-- ======================================
-- PERCY JACKSON: BASIC SETUP
-- ======================================
-- Tag Classes
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-pj-shipping',
        'Shipping',
        'shipping',
        'Romantic pairings',
        '2',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    ),
    (
        'tc-pj-era',
        'Era',
        'era',
        'Timeline period',
        '2',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    ),
    (
        'tc-pj-parentage',
        'Godly Parent',
        'parentage',
        'Demigod parentage',
        '2',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    );
-- Sample Tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-pj-ship-percabeth',
        'Percy/Annabeth',
        'percy-annabeth',
        '2',
        'tc-pj-shipping',
        'Shipping',
        1
    ),
    (
        'tag-pj-era-pjo',
        'Percy Jackson Era',
        'pjo-era',
        '2',
        'tc-pj-era',
        'Era',
        1
    ),
    (
        'tag-pj-era-hoo',
        'Heroes of Olympus Era',
        'hoo-era',
        '2',
        'tc-pj-era',
        'Era',
        1
    ),
    (
        'tag-pj-parent-poseidon',
        'Son/Daughter of Poseidon',
        'poseidon',
        '2',
        'tc-pj-parentage',
        'Parentage',
        1
    ),
    (
        'tag-pj-parent-athena',
        'Son/Daughter of Athena',
        'athena',
        '2',
        'tc-pj-parentage',
        'Parentage',
        1
    );
-- ======================================
-- MCU: BASIC SETUP
-- ======================================
-- Tag Classes
INSERT
    OR IGNORE INTO tag_classes (
        id,
        name,
        slug,
        description,
        fandom_id,
        validation_rules,
        is_active
    )
VALUES (
        'tc-mcu-shipping',
        'Shipping',
        'shipping',
        'Romantic pairings',
        '3',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    ),
    (
        'tc-mcu-phase',
        'MCU Phase',
        'phase',
        'MCU timeline phase',
        '3',
        '{"mutual_exclusion": {"within_class": true}}',
        1
    );
-- Sample Tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        slug,
        fandom_id,
        tag_class_id,
        category,
        is_active
    )
VALUES (
        'tag-mcu-ship-stony',
        'Steve/Tony',
        'steve-tony',
        '3',
        'tc-mcu-shipping',
        'Shipping',
        1
    ),
    (
        'tag-mcu-phase1',
        'Phase 1',
        'phase-1',
        '3',
        'tc-mcu-phase',
        'Era',
        1
    ),
    (
        'tag-mcu-phase2',
        'Phase 2',
        'phase-2',
        '3',
        'tc-mcu-phase',
        'Era',
        1
    ),
    (
        'tag-mcu-avengers',
        'Avengers',
        'avengers',
        '3',
        NULL,
        'Team',
        1
    ),
    (
        'tag-mcu-hydra',
        'HYDRA',
        'hydra',
        '3',
        NULL,
        'Organization',
        1
    );
-- ======================================
-- VERIFICATION QUERIES
-- ======================================
-- Count fandoms
SELECT 'Fandoms:' as entity,
    COUNT(*) as count
FROM fandoms;
-- Count tag classes
SELECT 'Tag Classes:' as entity,
    COUNT(*) as count
FROM tag_classes;
-- Count tags
SELECT 'Tags:' as entity,
    COUNT(*) as count
FROM tags;
-- Count plot blocks
SELECT 'Plot Blocks:' as entity,
    COUNT(*) as count
FROM plot_blocks;
-- Show fandom summary
SELECT f.name as fandom,
    (
        SELECT COUNT(*)
        FROM tags
        WHERE fandom_id = f.id
    ) as tag_count,
    (
        SELECT COUNT(*)
        FROM tag_classes
        WHERE fandom_id = f.id
    ) as class_count,
    (
        SELECT COUNT(*)
        FROM plot_blocks
        WHERE fandom_id = f.id
    ) as trope_count
FROM fandoms f
ORDER BY f.name;