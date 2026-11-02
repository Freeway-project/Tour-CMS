-- Privacy policy and terms for the public /privacy/ and /terms/ pages. Like
-- `cancellation_policy`, the owner writes them as markdown in /admin/settings.
-- Google Ads and Stripe both expect these pages to exist before ads run.
--
-- anon already has table-level select on site_settings (0003), so the new
-- columns are readable by the public site without a new grant; writes stay
-- limited to admins through `site_settings_admin_all`.

alter table public.site_settings
  add column privacy_policy text not null default '',
  add column terms text not null default '';

-- Existing projects: mark both as not written yet, so the site shows the
-- "being updated" page instead of an empty one. Never invent legal text here.
update public.site_settings
set privacy_policy = 'TODO: the owner writes the privacy policy in /admin/settings.',
    terms = 'TODO: the owner writes the terms and conditions in /admin/settings.'
where id = 1 and privacy_policy = '' and terms = '';
