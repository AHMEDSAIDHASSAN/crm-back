-- Unit: monthly installment (القسط) and delivery date (معاد الاستلام)
ALTER TABLE `units`
  ADD COLUMN `monthly_installment` DECIMAL(15, 2) NULL,
  ADD COLUMN `delivery_date` DATE NULL;
