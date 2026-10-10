-- Sample data (made up). Replace with the agency's real figures.
INSERT INTO monthly_revenue (month, revenue, target) VALUES
('2025-11-01', 38200, 40000), ('2025-12-01', 41500, 40000), ('2026-01-01', 36800, 42000),
('2026-02-01', 44100, 42000), ('2026-03-01', 47900, 45000), ('2026-04-01', 45300, 45000),
('2026-05-01', 52600, 48000), ('2026-06-01', 49800, 48000), ('2026-07-01', 55200, 50000),
('2026-08-01', 58400, 52000), ('2026-09-01', 61900, 55000), ('2026-10-01', 34700, 55000);

INSERT INTO deals (name, client, value, stage, owner, expected_close) VALUES
('Brand refresh', 'Northwind Coffee', 28000, 'negotiation', 'Krishna', '2026-10-24'),
('E-commerce rebuild', 'Lumen Outdoor', 64000, 'proposal', 'Asha', '2026-11-15'),
('Q4 paid social', 'Vela Skincare', 18500, 'contract', 'Krishna', '2026-10-14'),
('SEO retainer', 'Harbor Dental Group', 24000, 'discovery', 'Rohan', '2026-12-01'),
('Product launch video', 'Kinetic Labs', 36000, 'negotiation', 'Asha', '2026-10-30'),
('Website + CMS', 'Greenleaf Realty', 42000, 'proposal', 'Krishna', '2026-11-20'),
('Email automation', 'Tidewater Books', 9500, 'discovery', 'Rohan', '2026-11-28'),
('Annual content plan', 'Meridian Bank', 52000, 'won', 'Krishna', '2026-09-18'),
('Packaging design', 'Oakline Teas', 12000, 'lost', 'Asha', '2026-09-05');

INSERT INTO leads (name, company, email, source, status, est_value, created_at) VALUES
('Meera Iyer', 'Saffron Kitchens', 'meera@saffronkitchens.example', 'referral', 'new', 15000, now() - interval '5 hours'),
('Daniel Okafor', 'Brightpath Tutoring', 'daniel@brightpath.example', 'website', 'contacted', 8000, now() - interval '20 hours'),
('Sofia Marín', 'Atlas Fitness', 'sofia@atlasfit.example', 'linkedin', 'qualified', 22000, now() - interval '2 days'),
('Tom Becker', 'Becker & Sons Hardware', 'tom@beckerhardware.example', 'event', 'new', 6000, now() - interval '3 days'),
('Priya Nair', 'Orbit Analytics', 'priya@orbitanalytics.example', 'outbound', 'contacted', 30000, now() - interval '4 days'),
('Liam Chen', 'Pinecrest Hotels', 'liam@pinecrest.example', 'website', 'unqualified', 4000, now() - interval '5 days'),
('Grace Mensah', 'Copperline Studio', 'grace@copperline.example', 'referral', 'qualified', 18000, now() - interval '9 days'),
('Arjun Rao', 'Velocity Logistics', 'arjun@velocitylog.example', 'linkedin', 'contacted', 26000, now() - interval '12 days');
