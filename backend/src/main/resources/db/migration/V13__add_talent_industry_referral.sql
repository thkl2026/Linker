-- V13__add_talent_industry_referral.sql
ALTER TABLE talent_profiles ADD COLUMN industry_experience TEXT;
ALTER TABLE talent_profiles ADD COLUMN referral_source VARCHAR(100);
