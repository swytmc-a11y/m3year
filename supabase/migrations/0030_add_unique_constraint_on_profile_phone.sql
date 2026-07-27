-- Now that the pre-existing phone duplicates have been resolved (kept the
-- oldest account per phone, removed the newer duplicates), enforce
-- uniqueness going forward. This matters now specifically because phone
-- numbers are becoming a login identifier (WhatsApp OTP bridge) — two
-- accounts sharing one phone would make "which account does this number log
-- into" ambiguous.
create unique index profile_contact_phone_unique_idx
  on public.profile_contact (phone)
  where phone is not null;
