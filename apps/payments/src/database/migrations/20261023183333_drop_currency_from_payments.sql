-- Remove the redundant currency column from payments.
ALTER TABLE payments DROP COLUMN currency;
