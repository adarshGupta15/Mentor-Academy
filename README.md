# Mentor Academy

## Phase 2 setup

1. Create a Supabase project and copy its project URL and anon key into `.env.local` using `.env.example` as a template.
2. In Supabase SQL Editor, run `supabase/migrations/202609090001_phase2_identity.sql`.
3. In **Authentication → Providers**, enable Email. Keep email confirmation disabled only for local demo accounts if appropriate; enable it for production.
4. Create users in **Authentication → Users**. Passwords are hashed and managed by Supabase Auth—never insert them into a project file or table.
5. Insert the matching row in `public.profiles`, using the Auth user UUID as `user_id`. Then add the matching `students` or `teachers` record as applicable.

### Development demo setup

Create three disposable Auth users, then create their profile records:

- Admin: an email such as `admin.demo@mentoracademy.local`, role `ADMIN`
- Teacher: an email such as `teacher.demo@mentoracademy.local`, role `TEACHER`, plus a `teachers` record
- Student: email must be `<student-id>@students.mentoracademy.local` (for example `ma-2026-001@students.mentoracademy.local`), role `STUDENT`, plus a `students` record with `student_id = 'MA-2026-001'`.

Choose passwords directly in Supabase and keep them out of source control. The login form translates a Student ID to that controlled internal email format; staff may use their email address.

## Security model

The browser only performs password verification through Supabase Auth. After login, the server gets the authenticated user and reads its own RLS-protected profile to determine the role. Role redirects and protected page checks happen on the server; no role is accepted from the form, URL, or browser storage.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Disposable demo users (development only)

Use [the development-only SQL script](supabase/demo/phase2-demo-users.sql) after the Phase 2 migration has been run.

1. In **Supabase Authentication → Users**, manually create these three disposable Email users. Choose strong temporary passwords there; never put passwords in SQL or source control.
   - `admin.demo@mentoracademy.local` — Admin login: this email
   - `teacher.demo@mentoracademy.local` — Teacher login: this email
   - `ma-demo-001@students.mentoracademy.local` — Student login ID: `MA-DEMO-001`
2. Run `supabase/demo/phase2-demo-users.sql` in the Supabase SQL Editor.
3. Confirm its final query returns three rows, with `TCH-DEMO-001` for the teacher and `MA-DEMO-001` for the student.
4. Sign in through `/login`. Student IDs are normalized to the documented internal student email; staff use their full email address.

The script uses only `auth.users` IDs created by Supabase Auth and inserts matching public records. It does not create public signup capability, does not contain passwords, does not require a service-role key, and does not change schema or RLS.
