-- Tests and marks module. Additive only; does not touch earlier migrations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_status') THEN
    CREATE TYPE public.test_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.batches(id) ON DELETE RESTRICT,
  test_date date NOT NULL,
  max_marks integer NOT NULL CHECK (max_marks > 0),
  status public.test_status NOT NULL DEFAULT 'DRAFT',
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by_teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  obtained_marks numeric(7,2) NOT NULL CHECK (obtained_marks >= 0),
  teacher_remarks text,
  entered_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, student_id)
);

CREATE OR REPLACE FUNCTION public.tests_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.teachers t
  JOIN public.profiles p ON p.id = t.profile_id
  WHERE p.user_id = auth.uid()
    AND p.role = 'TEACHER'
    AND p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.student_is_eligible_for_test(p_test_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tests t
    JOIN public.students s ON s.id = p_student_id
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE t.id = p_test_id
      AND p.is_active = true
      AND t.class_id = s.class_id
      AND (
        t.batch_id IS NULL
        OR t.batch_id = s.batch_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_manage_test(p_test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tests t
    JOIN public.teacher_assignments ta ON ta.teacher_id = public.current_teacher_id()
    WHERE t.id = p_test_id
      AND ta.class_id = t.class_id
      AND ta.subject_id = t.subject_id
      AND (
        (t.batch_id IS NULL AND ta.batch_id IS NULL)
        OR (t.batch_id IS NOT NULL AND (ta.batch_id IS NULL OR ta.batch_id = t.batch_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_test(p_test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tests t
    JOIN public.students s ON s.id = public.current_student_id()
    WHERE t.id = p_test_id
      AND t.status = 'PUBLISHED'
      AND t.class_id = s.class_id
      AND (
        t.batch_id IS NULL
        OR t.batch_id = s.batch_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects cs
    WHERE cs.class_id = NEW.class_id
      AND cs.subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'The selected class and subject are not linked.' USING ERRCODE = '23514';
  END IF;

  IF NEW.batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.batches b
    WHERE b.id = NEW.batch_id
      AND b.class_id = NEW.class_id
      AND b.is_active = true
  ) THEN
    RAISE EXCEPTION 'The selected batch must belong to the class and be active.' USING ERRCODE = '23514';
  END IF;

  IF NEW.max_marks <= 0 THEN
    RAISE EXCEPTION 'Maximum marks must be greater than zero.' USING ERRCODE = '23514';
  END IF;

  IF NEW.test_date IS NULL THEN
    RAISE EXCEPTION 'Test date is required.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_test_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_marks integer;
BEGIN
  SELECT max_marks INTO v_max_marks
  FROM public.tests
  WHERE id = NEW.test_id;

  IF v_max_marks IS NULL THEN
    RAISE EXCEPTION 'The test could not be found.' USING ERRCODE = '23503';
  END IF;

  IF NEW.obtained_marks < 0 OR NEW.obtained_marks > v_max_marks THEN
    RAISE EXCEPTION 'Marks must be between 0 and the maximum marks for the test.' USING ERRCODE = '23514';
  END IF;

  IF NOT public.student_is_eligible_for_test(NEW.test_id, NEW.student_id) THEN
    RAISE EXCEPTION 'The student is not eligible for this test.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tests_updated_at ON public.tests;
CREATE TRIGGER tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.tests_set_updated_at();

DROP TRIGGER IF EXISTS test_results_updated_at ON public.test_results;
CREATE TRIGGER test_results_updated_at
BEFORE UPDATE ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.tests_set_updated_at();

DROP TRIGGER IF EXISTS validate_test_relation ON public.tests;
CREATE CONSTRAINT TRIGGER validate_test_relation
AFTER INSERT OR UPDATE OF class_id, subject_id, batch_id, test_date, max_marks
ON public.tests
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION public.validate_test();

DROP TRIGGER IF EXISTS validate_test_result_relation ON public.test_results;
CREATE CONSTRAINT TRIGGER validate_test_result_relation
AFTER INSERT OR UPDATE OF test_id, student_id, obtained_marks
ON public.test_results
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION public.validate_test_result();

CREATE INDEX IF NOT EXISTS tests_class_idx ON public.tests(class_id);
CREATE INDEX IF NOT EXISTS tests_subject_idx ON public.tests(subject_id);
CREATE INDEX IF NOT EXISTS tests_batch_idx ON public.tests(batch_id);
CREATE INDEX IF NOT EXISTS tests_date_idx ON public.tests(test_date);
CREATE INDEX IF NOT EXISTS tests_status_idx ON public.tests(status);
CREATE INDEX IF NOT EXISTS tests_created_by_teacher_idx ON public.tests(created_by_teacher_id);
CREATE INDEX IF NOT EXISTS test_results_test_idx ON public.test_results(test_id);
CREATE INDEX IF NOT EXISTS test_results_student_idx ON public.test_results(student_id);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tests_admin_all ON public.tests;
CREATE POLICY tests_admin_all ON public.tests
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tests_teacher_select ON public.tests;
CREATE POLICY tests_teacher_select ON public.tests
FOR SELECT TO authenticated
USING (public.is_admin() OR public.teacher_can_manage_test(id));

DROP POLICY IF EXISTS tests_teacher_insert ON public.tests;
CREATE POLICY tests_teacher_insert ON public.tests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    created_by_profile_id = public.current_profile_id()
    AND created_by_teacher_id = public.current_teacher_id()
    AND EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      WHERE ta.teacher_id = public.current_teacher_id()
        AND ta.class_id = tests.class_id
        AND ta.subject_id = tests.subject_id
        AND (
          (tests.batch_id IS NULL AND ta.batch_id IS NULL)
          OR (tests.batch_id IS NOT NULL AND (ta.batch_id IS NULL OR ta.batch_id = tests.batch_id))
        )
    )
  )
);

DROP POLICY IF EXISTS tests_teacher_update ON public.tests;
CREATE POLICY tests_teacher_update ON public.tests
FOR UPDATE TO authenticated
USING (public.is_admin() OR public.teacher_can_manage_test(id))
WITH CHECK (
  public.is_admin()
  OR (
    created_by_profile_id = public.current_profile_id()
    AND created_by_teacher_id = public.current_teacher_id()
    AND EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      WHERE ta.teacher_id = public.current_teacher_id()
        AND ta.class_id = tests.class_id
        AND ta.subject_id = tests.subject_id
        AND (
          (tests.batch_id IS NULL AND ta.batch_id IS NULL)
          OR (tests.batch_id IS NOT NULL AND (ta.batch_id IS NULL OR ta.batch_id = tests.batch_id))
        )
    )
  )
);

DROP POLICY IF EXISTS tests_teacher_delete ON public.tests;
CREATE POLICY tests_teacher_delete ON public.tests
FOR DELETE TO authenticated
USING (public.is_admin() OR public.teacher_can_manage_test(id));

DROP POLICY IF EXISTS tests_student_select ON public.tests;
CREATE POLICY tests_student_select ON public.tests
FOR SELECT TO authenticated
USING (public.student_can_read_test(id));

DROP POLICY IF EXISTS test_results_admin_all ON public.test_results;
CREATE POLICY test_results_admin_all ON public.test_results
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS test_results_teacher_select ON public.test_results;
CREATE POLICY test_results_teacher_select ON public.test_results
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_results.test_id
      AND public.teacher_can_manage_test(t.id)
  )
);

DROP POLICY IF EXISTS test_results_teacher_insert ON public.test_results;
CREATE POLICY test_results_teacher_insert ON public.test_results
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    entered_by_profile_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.tests t
      WHERE t.id = test_results.test_id
        AND public.teacher_can_manage_test(t.id)
    )
    AND public.student_is_eligible_for_test(test_results.test_id, test_results.student_id)
  )
);

DROP POLICY IF EXISTS test_results_teacher_update ON public.test_results;
CREATE POLICY test_results_teacher_update ON public.test_results
FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_results.test_id
      AND public.teacher_can_manage_test(t.id)
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    entered_by_profile_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.tests t
      WHERE t.id = test_results.test_id
        AND public.teacher_can_manage_test(t.id)
    )
    AND public.student_is_eligible_for_test(test_results.test_id, test_results.student_id)
  )
);

DROP POLICY IF EXISTS test_results_teacher_delete ON public.test_results;
CREATE POLICY test_results_teacher_delete ON public.test_results
FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_results.test_id
      AND public.teacher_can_manage_test(t.id)
  )
);

DROP POLICY IF EXISTS test_results_student_select ON public.test_results;
CREATE POLICY test_results_student_select ON public.test_results
FOR SELECT TO authenticated
USING (student_id = public.current_student_id());

REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_teacher_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_is_eligible_for_test(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_can_manage_test(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.student_can_read_test(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_test() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_test_result() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_is_eligible_for_test(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_test(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_test(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_test() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_test_result() TO authenticated;
