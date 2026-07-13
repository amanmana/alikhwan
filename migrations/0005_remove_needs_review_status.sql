-- Satukan rekod lama yang memerlukan semakan ke dalam aliran kelulusan biasa.
UPDATE members
SET membership_status = 'pending', updated_at = CURRENT_TIMESTAMP
WHERE membership_status = 'needs_review';
