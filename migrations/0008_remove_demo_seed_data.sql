delete from receipts
where job_id in (
  'job_meridian',
  'job_atelier',
  'job_kasa',
  'job_lowend',
  'job_orion',
  'job_helix',
  'job_sable',
  'job_north'
)
or invoice_id in ('invc_1', 'invc_2', 'invc_3')
or quote_id in (
  select id from quotes
  where job_id in (
    'job_meridian',
    'job_atelier',
    'job_kasa',
    'job_lowend',
    'job_orion',
    'job_helix',
    'job_sable',
    'job_north'
  )
);

delete from contracts
where quote_id in (
  select id from quotes
  where job_id in (
    'job_meridian',
    'job_atelier',
    'job_kasa',
    'job_lowend',
    'job_orion',
    'job_helix',
    'job_sable',
    'job_north'
  )
);

delete from quotes
where job_id in (
  'job_meridian',
  'job_atelier',
  'job_kasa',
  'job_lowend',
  'job_orion',
  'job_helix',
  'job_sable',
  'job_north'
);

delete from cues
where id in ('cue_1', 'cue_2', 'cue_3', 'cue_4', 'cue_5', 'cue_6', 'cue_7')
or job_id in ('job_meridian', 'job_atelier', 'job_kasa', 'job_lowend', 'job_orion', 'job_helix', 'job_sable', 'job_north');

delete from drafts
where id in ('dr_1', 'dr_2', 'dr_3')
or job_id in ('job_meridian', 'job_atelier', 'job_kasa', 'job_lowend', 'job_orion', 'job_helix', 'job_sable', 'job_north');

delete from testimonials
where id in ('tm_1', 'tm_2')
or job_id in ('job_meridian', 'job_atelier', 'job_kasa', 'job_lowend', 'job_orion', 'job_helix', 'job_sable', 'job_north');

delete from invoices
where id in ('invc_1', 'invc_2', 'invc_3')
or job_id in ('job_meridian', 'job_atelier', 'job_kasa', 'job_lowend', 'job_orion', 'job_helix', 'job_sable', 'job_north');

delete from crew
where id in ('cr_randy', 'cr_amara', 'cr_leo', 'cr_sanaa', 'cr_ibrahim', 'cr_nuru')
or assigned_job_id in ('job_meridian', 'job_atelier', 'job_kasa', 'job_lowend', 'job_orion', 'job_helix', 'job_sable', 'job_north');

delete from studio_channels
where job_id in (
  'job_meridian',
  'job_atelier',
  'job_kasa',
  'job_lowend',
  'job_orion',
  'job_helix',
  'job_sable',
  'job_north'
);

delete from jobs
where id in (
  'job_meridian',
  'job_atelier',
  'job_kasa',
  'job_lowend',
  'job_orion',
  'job_helix',
  'job_sable',
  'job_north'
);

delete from inventory
where id in (
  'inv_la12',
  'inv_subs',
  'inv_desk',
  'inv_rf',
  'inv_silk',
  'inv_led',
  'inv_lounge',
  'inv_truss',
  'inv_cam',
  'inv_lens'
);

delete from vendors
where id in ('vd_petal', 'vd_volt', 'vd_linen', 'vd_print', 'vd_glass');
