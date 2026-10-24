insert into jobs (id, owner_user_id, title, client_name, service, event_type, guests, tier, status, venue, event_date, ballpark, notes, is_showcase) values
  ('job_meridian', null, 'Meridian Gala', 'Meridian Bank', 'stage', 'corporate', 420, 'black', 'production', 'The Vault, Westlands', '2026-09-21', 18600, 'Flagship gala. Live Pulse is on for tonight.', true),
  ('job_atelier', null, 'Atelier Noir campaign', 'Atelier Noir', 'brand', 'launch', 80, 'black', 'delivered', 'Studio B', '2026-06-12', 12400, 'Brand film + stills. Cut campaign launch time.', true),
  ('job_kasa', null, 'Kasa rooftop vows', 'Kasa & Imani', 'decor', 'wedding', 160, 'floor', 'delivered', 'Skyline House', '2026-04-18', 9800, 'Look-Through locked the lounge plan in one walkthrough.', true),
  ('job_lowend', null, 'Low End Theory live', 'NBO Sessions', 'sound', 'concert', 900, 'black', 'delivered', 'The Yard', '2026-03-02', 15400, 'Line array + broadcast mix. 11 hours of rig.', true),
  ('job_orion', null, 'Orion product film', 'Orion Time', 'film', 'film', 12, 'floor', 'quoted', 'Soundstage 2', '2026-10-04', 8600, 'Watch film. Awaiting lock.', true),
  ('job_helix', null, 'Helix offsite', 'Helix Labs', 'stage', 'corporate', 220, 'signal', 'inquiry', 'Helix HQ garden', '2026-10-19', 5400, 'New inquiry from mood-board Match.', true),
  ('job_sable', null, 'Sable House dinner', 'Sable Collective', 'decor', 'private', 70, 'floor', 'booked', 'Sable House', '2026-09-28', 7200, 'Deposit in. Call sheet drafting.', true),
  ('job_north', null, 'Northline brand drop', 'Northline', 'brand', 'launch', 140, 'floor', 'quoted', 'Warehouse 9', '2026-11-02', 11200, 'Need stills + motion package.', true)
on conflict (id) do nothing;

insert into inventory (id, name, category, qty, available, condition, next_service) values
  ('inv_la12', 'L-Acoustics Kiva II array', 'sound', 12, 8, 'ready', '2026-11-01'),
  ('inv_subs', 'KS28 subwoofers', 'sound', 8, 6, 'ready', '2026-10-12'),
  ('inv_desk', 'DiGiCo Quantum 225', 'sound', 2, 1, 'service', '2026-09-22'),
  ('inv_rf', 'Shure Axient RF kit', 'sound', 16, 14, 'ready', '2026-12-01'),
  ('inv_silk', 'Black silk drape 12m', 'decor', 40, 22, 'ready', null),
  ('inv_led', 'Astera Titan tubes', 'decor', 48, 30, 'ready', '2026-10-08'),
  ('inv_lounge', 'Velvet lounge set (4-seat)', 'decor', 10, 3, 'ready', null),
  ('inv_truss', 'Global Truss 3m', 'decor', 24, 18, 'flag', '2026-09-24'),
  ('inv_cam', 'Sony Venice 2 body', 'film', 2, 1, 'ready', '2026-10-30'),
  ('inv_lens', 'Cooke S7/i set', 'film', 1, 1, 'ready', null)
on conflict (id) do nothing;

insert into crew (id, name, role, call_time, assigned_job_id, status) values
  ('cr_randy', 'Randy Okello', 'Director', '14:00', 'job_meridian', 'called'),
  ('cr_amara', 'Amara Njoroge', 'Sound lead', '12:30', 'job_meridian', 'called'),
  ('cr_leo', 'Leo Mensah', 'Decor lead', '10:00', 'job_meridian', 'on-site'),
  ('cr_sanaa', 'Sanaa Reid', 'Director of photography', '13:00', 'job_meridian', 'called'),
  ('cr_ibrahim', 'Ibrahim Wekesa', 'A2 / RF', '12:30', 'job_meridian', 'standby'),
  ('cr_nuru', 'Nuru Adeyemi', 'Floral', '09:30', 'job_sable', 'standby')
on conflict (id) do nothing;

insert into vendors (id, name, specialty, city, lead_days, rating) values
  ('vd_petal', 'Petal & Wire', 'Sculptural florals', 'Nairobi', 10, 4.9),
  ('vd_volt', 'Volt Rigging', 'Truss & motors', 'Nairobi', 5, 4.8),
  ('vd_linen', 'Atelier Linen Co.', 'Black/white draping', 'Mombasa', 8, 4.7),
  ('vd_print', 'North Press', 'Brand collateral', 'Nairobi', 4, 4.6),
  ('vd_glass', 'Clear Stage', 'Acrylic & tables', 'Kampala', 12, 4.8)
on conflict (id) do nothing;

insert into cues (id, job_id, starts_at, title, owner, kind, status, sort_order) values
  ('cue_1', 'job_meridian', '14:00', 'Load-in complete', 'Leo Mensah', 'setup', 'done', 1),
  ('cue_2', 'job_meridian', '15:30', 'Drape & lounge lock', 'Leo Mensah', 'setup', 'done', 2),
  ('cue_3', 'job_meridian', '16:45', 'Sound check A', 'Amara Njoroge', 'sound', 'active', 3),
  ('cue_4', 'job_meridian', '17:30', 'Broadcast mix line', 'Amara Njoroge', 'sound', 'pending', 4),
  ('cue_5', 'job_meridian', '18:10', 'House open', 'Randy Okello', 'show', 'pending', 5),
  ('cue_6', 'job_meridian', '19:00', 'Keynote walk-on', 'Sanaa Reid', 'show', 'pending', 6),
  ('cue_7', 'job_meridian', '21:40', 'Strike plan freeze', 'Leo Mensah', 'setup', 'pending', 7)
on conflict (id) do nothing;

insert into drafts (id, job_id, title, kind, status, note) values
  ('dr_1', 'job_meridian', 'Lounge plan v3', 'decor', 'approved', 'Client signed off via Look-Through.'),
  ('dr_2', 'job_meridian', 'Stage brand wrap', 'brand', 'review', 'Waiting on Meridian legal for lockup.'),
  ('dr_3', 'job_sable', 'Candle density study', 'decor', 'review', 'Two densities to pick from.')
on conflict (id) do nothing;

insert into invoices (id, job_id, user_id, kind, amount, status, paid_at) values
  ('invc_1', 'job_sable', 'showcase', 'deposit', 2160, 'paid', '2026-09-04T10:00:00Z'),
  ('invc_2', 'job_sable', 'showcase', 'balance', 5040, 'due', null),
  ('invc_3', 'job_meridian', 'showcase', 'deposit', 5580, 'paid', '2026-08-12T10:00:00Z')
on conflict (id) do nothing;

insert into testimonials (id, job_id, author, company, body, requested, captured_at) values
  ('tm_1', 'job_atelier', 'Amina Shah', 'Atelier Noir', 'They cut our launch film cycle from six weeks to eleven days. The stills did the rest.', false, '2026-06-20T09:00:00Z'),
  ('tm_2', 'job_kasa', 'Kasa Mwangi', null, 'We saw the room dressed before a single drape went up. That was the whole decision.', false, '2026-04-22T09:00:00Z')
on conflict (id) do nothing;
