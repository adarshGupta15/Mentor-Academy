-- Phase T1: assignment-scoped teacher reads and creator-owned test mutations.
-- Apply after 202609181500_phase4_materials.sql and 202609260001_tests_marks.sql.

CREATE OR REPLACE FUNCTION public.t1_teacher_has_scope(
  requested_class_id uuid DEFAULT NULL,
  requested_subject_id uuid DEFAULT NULL,
  requested_batch_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    WHERE ta.teacher_id = public.phase4_current_teacher_id()
      AND (requested_class_id IS NULL OR ta.class_id = requested_class_id)
      AND (requested_subject_id IS NULL OR ta.subject_id = requested_subject_id)
      AND (
        requested_batch_id IS NULL
        OR ta.batch_id IS NULL
        OR ta.batch_id = requested_batch_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.t1_teacher_can_read_student(requested_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = requested_student_id
      AND p.is_active = true
      AND s.class_id IS NOT NULL
      AND public.t1_teacher_has_scope(s.class_id, NULL, s.batch_id)
      AND EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        JOIN public.classes c ON c.id = ta.class_id AND c.is_active = true
        JOIN public.subjects sub ON sub.id = ta.subject_id AND sub.is_active = true
        WHERE ta.teacher_id = public.phase4_current_teacher_id()
          AND ta.class_id = s.class_id
          AND (ta.batch_id IS NULL OR ta.batch_id = s.batch_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.t1_get_teacher_students()
RETURNS TABLE (
  id uuid,
  student_id text,
  roll_number text,
  name text,
  class_id uuid,
  class_name text,
  batch_id uuid,
  batch_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    s.id,
    s.student_id,
    s.roll_number,
    p.name,
    c.id,
    c.name,
    b.id,
    b.name
  FROM public.students s
  JOIN public.profiles p ON p.id = s.profile_id
  JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.batches b ON b.id = s.batch_id
  WHERE p.is_active = true
    AND public.t1_teacher_can_read_student(s.id)
  ORDER BY p.name, s.student_id;
$$;

REVOKE ALL ON FUNCTION public.t1_teacher_has_scope(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.t1_teacher_can_read_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.t1_get_teacher_students() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.t1_teacher_has_scope(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t1_teacher_can_read_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t1_get_teacher_students() TO authenticated;

DROP POLICY IF EXISTS t1_teacher_classes_select ON public.classes;
CREATE POLICY t1_teacher_classes_select ON public.classes
FOR SELECT TO authenticated
USING (public.t1_teacher_has_scope(id, NULL, NULL));

DROP POLICY IF EXISTS t1_teacher_subjects_select ON public.subjects;
CREATE POLICY t1_teacher_subjects_select ON public.subjects
FOR SELECT TO authenticated
USING (public.t1_teacher_has_scope(NULL, id, NULL));

DROP POLICY IF EXISTS t1_teacher_class_subjects_select ON public.class_subjects;
CREATE POLICY t1_teacher_class_subjects_select ON public.class_subjects
FOR SELECT TO authenticated
USING (public.t1_teacher_has_scope(class_id, subject_id, NULL));

DROP POLICY IF EXISTS t1_teacher_batches_select ON public.batches;
CREATE POLICY t1_teacher_batches_select ON public.batches
FOR SELECT TO authenticated
USING (public.t1_teacher_has_scope(class_id, NULL, id));

DROP POLICY IF EXISTS tests_teacher_update ON public.tests;
CREATE POLICY tests_teacher_update ON public.tests
FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR (
    created_by_teacher_id = public.current_teacher_id()
    AND public.teacher_can_manage_test(id)
  )
)
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
USING (
  public.is_admin()
  OR (
    created_by_teacher_id = public.current_teacher_id()
    AND public.teacher_can_manage_test(id)
  )
);