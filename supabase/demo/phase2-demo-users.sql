-- DEVELOPMENT ONLY — run this in the Supabase SQL Editor only after creating
-- the three Auth users in Authentication > Users. This script never handles passwords.
-- It does not modify the schema or RLS policies.
--
-- Required Auth users (create manually and choose strong, disposable passwords):
--   admin.demo@mentoracademy.local
--   teacher.demo@mentoracademy.local
--   ma-demo-001@students.mentoracademy.local

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM auth.users
    WHERE email IN (
      'admin.demo@mentoracademy.local',
      'teacher.demo@mentoracademy.local',
      'ma-demo-001@students.mentoracademy.local'
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'Create all three required DEMO Auth users before running this script.';
  END IF;
END $$;

-- Matching identity records. Re-running this script is safe: existing demo records are preserved.
INSERT INTO public.profiles (user_id, role, name, email, phone)
SELECT
  id,
  CASE email
    WHEN 'admin.demo@mentoracademy.local' THEN 'ADMIN'::public.user_role
    WHEN 'teacher.demo@mentoracademy.local' THEN 'TEACHER'::public.user_role
    WHEN 'ma-demo-001@students.mentoracademy.local' THEN 'STUDENT'::public.user_role
  END,
  CASE email
    WHEN 'admin.demo@mentoracademy.local' THEN 'Demo Administrator'
    WHEN 'teacher.demo@mentoracademy.local' THEN 'Demo Mathematics Teacher'
    WHEN 'ma-demo-001@students.mentoracademy.local' THEN 'Demo Student'
  END,
  email,
  CASE email
    WHEN 'admin.demo@mentoracademy.local' THEN '+919900000001'
    WHEN 'teacher.demo@mentoracademy.local' THEN '+919900000002'
    WHEN 'ma-demo-001@students.mentoracademy.local' THEN '+919900000003'
  END
FROM auth.users
WHERE email IN (
  'admin.demo@mentoracademy.local',
  'teacher.demo@mentoracademy.local',
  'ma-demo-001@students.mentoracademy.local'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.teachers (profile_id, teacher_id, qualification, experience)
SELECT id, 'TCH-DEMO-001', 'M.Sc. Mathematics (Demo)', 6
FROM public.profiles
WHERE email = 'teacher.demo@mentoracademy.local'
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.students (profile_id, student_id, roll_number)
SELECT id, 'MA-DEMO-001', 'DEMO-01'
FROM public.profiles
WHERE email = 'ma-demo-001@students.mentoracademy.local'
ON CONFLICT (profile_id) DO NOTHING;

-- Verification: exactly one matching profile per demo user and the required subtype records.
SELECT
  p.role,
  p.name,
  p.email,
  s.student_id,
  t.teacher_id
FROM public.profiles p
LEFT JOIN public.students s ON s.profile_id = p.id
LEFT JOIN public.teachers t ON t.profile_id = p.id
WHERE p.email IN (
  'admin.demo@mentoracademy.local',
  'teacher.demo@mentoracademy.local',
  'ma-demo-001@students.mentoracademy.local'
)
ORDER BY p.role;
