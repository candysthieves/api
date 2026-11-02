ALTER TABLE tariffs
    UPDATE name = 'Test'
    WHERE name IN ('Test - 5 minutes', 'Test - 5 min')
    SETTINGS mutations_sync = 1;
