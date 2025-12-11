-- =====================================================================
-- Migration Script: Convert user_id columns from string/long to integer
-- Database: PostgreSQL (Scholarly)
-- Date: 2025-11-18
-- Purpose: Standardize all user_id columns to match tbl_users.userid (int)
-- =====================================================================

-- IMPORTANT: 
-- 1. Backup your database before running this script
-- 2. Run this during a maintenance window
-- 3. Test in a staging environment first
-- 4. This script assumes all user_id string values are valid integers

BEGIN;

-- =====================================================================
-- Step 1: Verify data integrity before migration
-- =====================================================================

-- Check for any non-integer user_id values in tbl_pdf_uploads
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM tbl_pdf_uploads
    WHERE user_id !~ '^\d+$' AND user_id IS NOT NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % rows with non-integer user_id in tbl_pdf_uploads', invalid_count;
    END IF;
    
    RAISE NOTICE 'Data validation passed for tbl_pdf_uploads.user_id';
END $$;

-- Check for any non-integer created_by values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM tbl_pdf_uploads
    WHERE created_by !~ '^\d+$' AND created_by IS NOT NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % rows with non-integer created_by in tbl_pdf_uploads', invalid_count;
    END IF;
    
    RAISE NOTICE 'Data validation passed for tbl_pdf_uploads.created_by';
END $$;

-- =====================================================================
-- Step 2: Add temporary columns with correct data types
-- =====================================================================

-- tbl_pdf_uploads
ALTER TABLE tbl_pdf_uploads 
    ADD COLUMN IF NOT EXISTS user_id_temp INTEGER,
    ADD COLUMN IF NOT EXISTS created_by_temp INTEGER;

-- tbl_groups
ALTER TABLE tbl_groups 
    ADD COLUMN IF NOT EXISTS user_id_temp INTEGER,
    ADD COLUMN IF NOT EXISTS created_by_temp INTEGER,
    ADD COLUMN IF NOT EXISTS updated_by_temp INTEGER;

-- tbl_groups_emails
ALTER TABLE tbl_groups_emails 
    ADD COLUMN IF NOT EXISTS user_id_temp INTEGER,
    ADD COLUMN IF NOT EXISTS created_by_temp INTEGER,
    ADD COLUMN IF NOT EXISTS updated_by_temp INTEGER;

-- tbl_comments
ALTER TABLE tbl_comments
    ADD COLUMN IF NOT EXISTS created_by_temp INTEGER;

-- tbl_pdf_question_tags
ALTER TABLE tbl_pdf_question_tags 
    ADD COLUMN IF NOT EXISTS user_id_temp INTEGER;

-- tbl_annotation_ratings
ALTER TABLE tbl_annotation_ratings 
    ADD COLUMN IF NOT EXISTS user_id_temp INTEGER;

-- tbl_comments
ALTER TABLE tbl_comments 
    ADD COLUMN IF NOT EXISTS user_id_temp INTEGER;

RAISE NOTICE 'Temporary columns created';

-- =====================================================================
-- Step 3: Migrate data to temporary columns
-- =====================================================================

-- tbl_pdf_uploads
UPDATE tbl_pdf_uploads 
SET 
    user_id_temp = CASE 
        WHEN user_id IS NULL OR user_id = '' THEN NULL 
        ELSE user_id::INTEGER 
    END,
    created_by_temp = CASE 
        WHEN created_by IS NULL OR created_by = '' THEN NULL 
        ELSE created_by::INTEGER 
    END;

-- tbl_groups
UPDATE tbl_groups 
SET 
    user_id_temp = CASE 
        WHEN user_id IS NULL OR user_id = '' THEN NULL 
        ELSE user_id::INTEGER 
    END,
    created_by_temp = CASE 
        WHEN created_by IS NULL OR created_by = '' THEN NULL 
        ELSE created_by::INTEGER 
    END,
    updated_by_temp = CASE 
        WHEN updated_by IS NULL OR updated_by = '' THEN NULL 
        ELSE updated_by::INTEGER 
    END;

-- tbl_groups_emails
UPDATE tbl_groups_emails 
SET 
    user_id_temp = CASE 
        WHEN user_id IS NULL OR user_id = '' THEN NULL 
        ELSE user_id::INTEGER 
    END,
    created_by_temp = CASE 
        WHEN created_by IS NULL OR created_by = '' THEN NULL 
        ELSE created_by::INTEGER 
    END,
    updated_by_temp = CASE 
        WHEN updated_by IS NULL OR updated_by = '' THEN NULL 
        ELSE updated_by::INTEGER 
    END;

-- tbl_comments
UPDATE tbl_comments 
SET created_by_temp = CASE 
    WHEN created_by IS NULL OR created_by = '' THEN NULL 
    ELSE created_by::INTEGER 
END;

-- tbl_pdf_question_tags
UPDATE tbl_pdf_question_tags 
SET user_id_temp = CASE 
    WHEN user_id IS NULL OR user_id = '' THEN NULL 
    ELSE user_id::INTEGER 
END;

-- tbl_annotation_ratings (from long to int)
UPDATE tbl_annotation_ratings 
SET user_id_temp = user_id::INTEGER;

-- tbl_comments (from long to int)
UPDATE tbl_comments 
SET user_id_temp = user_id::INTEGER;

RAISE NOTICE 'Data migrated to temporary columns';

-- =====================================================================
-- Step 4: Drop foreign key constraints (if any)
-- =====================================================================

-- Note: Add specific FK constraint drops here if they exist
-- Example:
-- ALTER TABLE tbl_pdf_uploads DROP CONSTRAINT IF EXISTS fk_pdf_uploads_user;

-- =====================================================================
-- Step 5: Drop old columns and rename temporary columns
-- =====================================================================

-- tbl_pdf_uploads
ALTER TABLE tbl_pdf_uploads 
    DROP COLUMN user_id,
    DROP COLUMN created_by;

ALTER TABLE tbl_pdf_uploads 
    RENAME COLUMN user_id_temp TO user_id;

ALTER TABLE tbl_pdf_uploads 
    RENAME COLUMN created_by_temp TO created_by;

-- tbl_groups
ALTER TABLE tbl_groups 
    DROP COLUMN user_id,
    DROP COLUMN created_by,
    DROP COLUMN updated_by;

ALTER TABLE tbl_groups 
    RENAME COLUMN user_id_temp TO user_id;

ALTER TABLE tbl_groups 
    RENAME COLUMN created_by_temp TO created_by;

ALTER TABLE tbl_groups 
    RENAME COLUMN updated_by_temp TO updated_by;

-- tbl_groups_emails
ALTER TABLE tbl_groups_emails 
    DROP COLUMN user_id,
    DROP COLUMN created_by,
    DROP COLUMN updated_by;

ALTER TABLE tbl_groups_emails 
    RENAME COLUMN user_id_temp TO user_id;

ALTER TABLE tbl_groups_emails 
    RENAME COLUMN created_by_temp TO created_by;

ALTER TABLE tbl_groups_emails 
    RENAME COLUMN updated_by_temp TO updated_by;

-- tbl_pdf_question_tags
ALTER TABLE tbl_pdf_question_tags 
    DROP COLUMN user_id;

ALTER TABLE tbl_pdf_question_tags 
    RENAME COLUMN user_id_temp TO user_id;

-- tbl_annotation_ratings
ALTER TABLE tbl_annotation_ratings 
    DROP COLUMN user_id;

ALTER TABLE tbl_annotation_ratings 
    RENAME COLUMN user_id_temp TO user_id;

-- tbl_comments
ALTER TABLE tbl_comments 
    DROP COLUMN user_id,
    DROP COLUMN created_by;

ALTER TABLE tbl_comments 
    RENAME COLUMN user_id_temp TO user_id;

ALTER TABLE tbl_comments 
    RENAME COLUMN created_by_temp TO created_by;

RAISE NOTICE 'Columns renamed successfully';

-- =====================================================================
-- Step 6: Add foreign key constraints
-- =====================================================================

-- tbl_pdf_uploads.user_id -> tbl_users.userid
ALTER TABLE tbl_pdf_uploads 
    ADD CONSTRAINT fk_pdf_uploads_user 
    FOREIGN KEY (user_id) 
    REFERENCES tbl_users(userid)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- tbl_pdf_uploads.created_by -> tbl_users.userid
ALTER TABLE tbl_pdf_uploads 
    ADD CONSTRAINT fk_pdf_uploads_created_by 
    FOREIGN KEY (created_by) 
    REFERENCES tbl_users(userid)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- tbl_groups.user_id -> tbl_users.userid
ALTER TABLE tbl_groups 
    ADD CONSTRAINT fk_groups_user 
    FOREIGN KEY (user_id) 
    REFERENCES tbl_users(userid)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- tbl_groups_emails.user_id -> tbl_users.userid
ALTER TABLE tbl_groups_emails 
    ADD CONSTRAINT fk_groups_emails_user 
    FOREIGN KEY (user_id) 
    REFERENCES tbl_users(userid)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- tbl_pdf_question_tags.user_id -> tbl_users.userid
ALTER TABLE tbl_pdf_question_tags 
    ADD CONSTRAINT fk_pdf_question_tags_user 
    FOREIGN KEY (user_id) 
    REFERENCES tbl_users(userid)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- tbl_annotation_ratings.user_id -> tbl_users.userid
ALTER TABLE tbl_annotation_ratings 
    ADD CONSTRAINT fk_annotation_ratings_user 
    FOREIGN KEY (user_id) 
    REFERENCES tbl_users(userid)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- tbl_comments.user_id -> tbl_users.userid
ALTER TABLE tbl_comments 
    ADD CONSTRAINT fk_comments_user 
    FOREIGN KEY (user_id) 
    REFERENCES tbl_users(userid)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

RAISE NOTICE 'Foreign key constraints added';

-- =====================================================================
-- Step 7: Create indexes for performance
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON tbl_pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created_by ON tbl_pdf_uploads(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON tbl_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_emails_user_id ON tbl_groups_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_question_tags_user_id ON tbl_pdf_question_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_annotation_ratings_user_id ON tbl_annotation_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON tbl_comments(user_id);

RAISE NOTICE 'Indexes created';

-- =====================================================================
-- Step 8: Verification queries
-- =====================================================================

DO $$
DECLARE
    pdf_uploads_count INTEGER;
    groups_count INTEGER;
    groups_emails_count INTEGER;
    question_tags_count INTEGER;
    ratings_count INTEGER;
    comments_count INTEGER;
BEGIN
    -- Count migrated records
    SELECT COUNT(*) INTO pdf_uploads_count FROM tbl_pdf_uploads WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO groups_count FROM tbl_groups WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO groups_emails_count FROM tbl_groups_emails WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO question_tags_count FROM tbl_pdf_question_tags WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO ratings_count FROM tbl_annotation_ratings WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO comments_count FROM tbl_comments WHERE user_id IS NOT NULL;
    
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE '  - tbl_pdf_uploads: % rows with user_id', pdf_uploads_count;
    RAISE NOTICE '  - tbl_groups: % rows with user_id', groups_count;
    RAISE NOTICE '  - tbl_groups_emails: % rows with user_id', groups_emails_count;
    RAISE NOTICE '  - tbl_pdf_question_tags: % rows with user_id', question_tags_count;
    RAISE NOTICE '  - tbl_annotation_ratings: % rows with user_id', ratings_count;
    RAISE NOTICE '  - tbl_comments: % rows with user_id', comments_count;
END $$;

-- =====================================================================
-- COMMIT or ROLLBACK
-- =====================================================================

-- If everything looks good, commit the transaction
COMMIT;

-- If something went wrong, rollback:
-- ROLLBACK;

-- =====================================================================
-- Post-Migration Notes
-- =====================================================================

/*
IMPORTANT POST-MIGRATION STEPS:

1. Update Entity Framework Models:
   - Change user_id properties from string/long to int in all entity classes
   
2. Update Application Code:
   - Remove all .ToString() calls when assigning user_id
   - Update all interface signatures to use int instead of string
   
3. Update Fluent API Configurations:
   - Update any HasColumnType() specifications
   - Ensure foreign key relationships are properly configured
   
4. Test Thoroughly:
   - Test user registration
   - Test PDF uploads
   - Test group operations
   - Test annotations and comments
   
5. Monitor for Issues:
   - Check application logs
   - Monitor database performance
   - Verify data integrity

6. Application Deployment:
   - Deploy the updated code immediately after running this migration
   - Do NOT run the old code against the new schema
*/

SELECT 'Migration completed successfully! Review the notices above and deploy updated application code.' AS status;

