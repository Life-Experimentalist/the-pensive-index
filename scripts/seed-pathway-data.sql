-- Enhanced Database Seed Script for Pathway Builder
-- Seeds comprehensive fandom data including tags, tropes, and tag classes
-- Run with: sqlite3 ./data/the-pensive-index.db < ./scripts/seed-pathway-data.sql
-- 1. Ensure Harry Potter fandom exists
INSERT
    OR IGNORE INTO fandoms (
        id,
        name,
        description,
        slug,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'harry-potter',
        'Harry Potter',
        'The wizarding world of Harry Potter',
        'harry-potter',
        1,
        unixepoch(),
        unixepoch()
    );
-- 2. Create Tag Classes for validation
INSERT
    OR IGNORE INTO tag_classes (
        id,
        fandom_id,
        name,
        description,
        validation_rules,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'tc-harry-shipping',
        'harry-potter',
        'Harry Shipping',
        'Romantic pairings involving Harry Potter',
        '{"mutual_exclusion":{"within_class":true,"conflicting_tags":[],"conflicting_classes":[]}}',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tc-hermione-shipping',
        'harry-potter',
        'Hermione Shipping',
        'Romantic pairings involving Hermione Granger',
        '{"mutual_exclusion":{"within_class":true,"conflicting_tags":[],"conflicting_classes":[]}}',
        1,
        unixepoch(),
        unixepoch()
    );
-- 3. Create comprehensive tag set
-- Harry Shipping Tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        fandom_id,
        tag_class_id,
        category,
        description,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'tag-harry-hermione',
        'Harry/Hermione',
        'harry-potter',
        'tc-harry-shipping',
        'shipping',
        'Harry Potter and Hermione Granger romance',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-harry-ginny',
        'Harry/Ginny',
        'harry-potter',
        'tc-harry-shipping',
        'shipping',
        'Harry Potter and Ginny Weasley romance',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-harry-luna',
        'Harry/Luna',
        'harry-potter',
        'tc-harry-shipping',
        'shipping',
        'Harry Potter and Luna Lovegood romance',
        1,
        unixepoch(),
        unixepoch()
    );
-- Hermione Shipping Tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        fandom_id,
        tag_class_id,
        category,
        description,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'tag-hermione-ron',
        'Hermione/Ron',
        'harry-potter',
        'tc-hermione-shipping',
        'shipping',
        'Hermione Granger and Ron Weasley romance',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-hermione-draco',
        'Hermione/Draco',
        'harry-potter',
        'tc-hermione-shipping',
        'shipping',
        'Hermione Granger and Draco Malfoy romance',
        1,
        unixepoch(),
        unixepoch()
    );
-- Genre Tags
INSERT
    OR IGNORE INTO tags (
        id,
        name,
        fandom_id,
        tag_class_id,
        category,
        description,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'tag-time-travel',
        'Time Travel',
        'harry-potter',
        NULL,
        'plot-device',
        'Stories involving time travel',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-angst',
        'Angst',
        'harry-potter',
        NULL,
        'tone',
        'Emotional distress and conflict',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-fluff',
        'Fluff',
        'harry-potter',
        NULL,
        'tone',
        'Light-hearted and feel-good content',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-adventure',
        'Adventure',
        'harry-potter',
        NULL,
        'genre',
        'Action and adventure stories',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'tag-mystery',
        'Mystery',
        'harry-potter',
        NULL,
        'genre',
        'Mystery and detective stories',
        1,
        unixepoch(),
        unixepoch()
    );
-- 4. Create Tropes with dependencies
INSERT
    OR IGNORE INTO plot_blocks (
        id,
        name,
        fandom_id,
        description,
        category,
        parent_id,
        dependency_type,
        is_active,
        created_at,
        updated_at
    )
VALUES (
        'pb-goblin-inheritance',
        'Goblin Inheritance',
        'harry-potter',
        'Harry discovers his magical inheritance at Gringotts',
        'worldbuilding',
        NULL,
        NULL,
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-black-lordship',
        'Black Lordship',
        'harry-potter',
        'Harry becomes Lord Black',
        'power-gain',
        'pb-goblin-inheritance',
        'requires',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-slytherin-lordship',
        'Slytherin Lordship',
        'harry-potter',
        'Harry claims the Slytherin Lordship',
        'power-gain',
        'pb-goblin-inheritance',
        'requires',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-potter-heritage',
        'Potter Heritage',
        'harry-potter',
        'Harry discovers the true extent of the Potter legacy',
        'worldbuilding',
        'pb-goblin-inheritance',
        'requires',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-triwizard-tournament',
        'Triwizard Tournament',
        'harry-potter',
        'Fourth year tournament participation',
        'canon-event',
        NULL,
        NULL,
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-emancipation',
        'Magical Emancipation',
        'harry-potter',
        'Harry becomes legally emancipated',
        'legal',
        'pb-triwizard-tournament',
        'requires',
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-sirius-death',
        'Sirius Death',
        'harry-potter',
        'Sirius Black dies at the Department of Mysteries',
        'canon-event',
        NULL,
        NULL,
        1,
        unixepoch(),
        unixepoch()
    ),
    (
        'pb-wrong-bwl',
        'Wrong Boy Who Lived',
        'harry-potter',
        'Harry is not the actual Boy Who Lived',
        'au-divergence',
        NULL,
        NULL,
        1,
        unixepoch(),
        unixepoch()
    );