-- Phase 4: Materials foundation. Apply after 202609102000_phase3_admin_fees.sql.
-- This migration creates metadata only. Supabase Storage is configured separately.

DO $$
BEGIN
  CREATE TYPE public.material_type AS ENUM (
    'PDF_NOTE', 'PDF_WORKSHEET', 'QUESTION_PAPER', 'ASSIGNMENT', 'IMAGE', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.material_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id, batch_id)
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id, name)
);

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  material_type public.material_type NOT NULL,
  status public.material_status NOT NULL DEFAULT 'DRAFT',
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  storage_path text NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 1 AND 1024),
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 160),
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  checksum text,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  managed_by_teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL),
  CHECK (status <> 'ARCHIVED' OR archived_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.material_batches (
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (material_id, batch_id)
);

CREATE OR REPLACE FUNCTION public.phase4_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase4_validate_teacher_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.class_subjects
    WHERE class_id = NEW.class_id AND subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Teacher assignment class and subject must be linked.' USING ERRCODE = '23514';
  END IF;

  IF NEW.batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.batches
    WHERE id = NEW.batch_id AND class_id = NEW.class_id
  ) THEN
    RAISE EXCEPTION 'Teacher assignment batch must belong to its class.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase4_validate_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.class_subjects
    WHERE class_id = NEW.class_id AND subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Chapter class and subject must be linked.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase4_validate_material()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.class_subjects
    WHERE class_id = NEW.class_id AND subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Material class and subject must be linked.' USING ERRCODE = '23514';
  END IF;

  IF NEW.chapter_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chapters
    WHERE id = NEW.chapter_id
      AND class_id = NEW.class_id
      AND subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Material chapter must belong to its class and subject.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase4_validate_material_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.materials m
    JOIN public.batches b ON b.id = NEW.batch_id
    WHERE m.id = NEW.material_id AND b.class_id = m.class_id
  ) THEN
    RAISE EXCEPTION 'Material batch must belong to the material class.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase4_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.phase4_current_teacher_id()
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

CREATE OR REPLACE FUNCTION public.phase4_teacher_can_manage_scope(
  requested_class_id uuid,
  requested_subject_id uuid,
  requested_batch_id uuid
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
      AND ta.class_id = requested_class_id
      AND ta.subject_id = requested_subject_id
      AND (
        (requested_batch_id IS NULL AND ta.batch_id IS NULL)
        OR (requested_batch_id IS NOT NULL AND (ta.batch_id IS NULL OR ta.batch_id = requested_batch_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.phase4_teacher_can_manage_material(p_material_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.materials m
    WHERE m.id = p_material_id
      AND (
        (
          NOT EXISTS (
            SELECT 1 FROM public.material_batches mb
            WHERE mb.material_id = m.id
          )
          AND EXISTS (
            SELECT 1
            FROM public.teacher_assignments ta
            WHERE ta.teacher_id = public.phase4_current_teacher_id()
              AND ta.class_id = m.class_id
              AND ta.subject_id = m.subject_id
              AND ta.batch_id IS NULL
          )
        )
        OR (
          EXISTS (
            SELECT 1
            FROM public.teacher_assignments ta
            WHERE ta.teacher_id = public.phase4_current_teacher_id()
              AND ta.class_id = m.class_id
              AND ta.subject_id = m.subject_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.material_batches mb
            JOIN public.batches b ON b.id = mb.batch_id
            WHERE mb.material_id = m.id
              AND NOT public.phase4_teacher_can_manage_scope(m.class_id, m.subject_id, b.id)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.phase4_material_created_by(p_material_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_by_profile_id
  FROM public.materials
  WHERE id = p_material_id;
$$;

CREATE OR REPLACE FUNCTION public.phase4_material_class_id(p_material_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM public.materials WHERE id = p_material_id;
$$;

CREATE OR REPLACE FUNCTION public.phase4_material_subject_id(p_material_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subject_id FROM public.materials WHERE id = p_material_id;
$$;

CREATE OR REPLACE FUNCTION public.phase4_student_can_read_material(p_material_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.materials m
    JOIN public.students s ON s.id = public.current_student_id()
    WHERE m.id = p_material_id
      AND m.status = 'PUBLISHED'
      AND m.class_id = s.class_id
      AND EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.class_id = m.class_id AND cs.subject_id = m.subject_id
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.material_batches mb
          WHERE mb.material_id = m.id
        )
        OR EXISTS (
          SELECT 1 FROM public.material_batches mb
          WHERE mb.material_id = m.id AND mb.batch_id = s.batch_id
        )
      )
  );
$$;

DROP TRIGGER IF EXISTS phase4_teacher_assignments_updated_at ON public.teacher_assignments;
CREATE TRIGGER phase4_teacher_assignments_updated_at
BEFORE UPDATE ON public.teacher_assignments
FOR EACH ROW EXECUTE FUNCTION public.phase4_set_updated_at();

DROP TRIGGER IF EXISTS phase4_chapters_updated_at ON public.chapters;
CREATE TRIGGER phase4_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.phase4_set_updated_at();

DROP TRIGGER IF EXISTS phase4_materials_updated_at ON public.materials;
CREATE TRIGGER phase4_materials_updated_at
BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.phase4_set_updated_at();

DROP TRIGGER IF EXISTS phase4_validate_teacher_assignment ON public.teacher_assignments;
CREATE CONSTRAINT TRIGGER phase4_validate_teacher_assignment
AFTER INSERT OR UPDATE ON public.teacher_assignments
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION public.phase4_validate_teacher_assignment();

DROP TRIGGER IF EXISTS phase4_validate_chapter ON public.chapters;
CREATE CONSTRAINT TRIGGER phase4_validate_chapter
AFTER INSERT OR UPDATE ON public.chapters
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION public.phase4_validate_chapter();

DROP TRIGGER IF EXISTS phase4_validate_material ON public.materials;
CREATE CONSTRAINT TRIGGER phase4_validate_material
AFTER INSERT OR UPDATE ON public.materials
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION public.phase4_validate_material();

DROP TRIGGER IF EXISTS phase4_validate_material_batch ON public.material_batches;
CREATE CONSTRAINT TRIGGER phase4_validate_material_batch
AFTER INSERT OR UPDATE ON public.material_batches
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION public.phase4_validate_material_batch();

CREATE INDEX IF NOT EXISTS teacher_assignments_teacher_idx ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS teacher_assignments_class_subject_idx ON public.teacher_assignments(class_id, subject_id);
CREATE INDEX IF NOT EXISTS teacher_assignments_batch_idx ON public.teacher_assignments(batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_assignments_classwide_unique
  ON public.teacher_assignments(teacher_id, class_id, subject_id)
  WHERE batch_id IS NULL;
CREATE INDEX IF NOT EXISTS chapters_class_subject_idx ON public.chapters(class_id, subject_id);
CREATE INDEX IF NOT EXISTS materials_status_idx ON public.materials(status);
CREATE INDEX IF NOT EXISTS materials_class_idx ON public.materials(class_id);
CREATE INDEX IF NOT EXISTS materials_subject_idx ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS materials_chapter_idx ON public.materials(chapter_id);
CREATE INDEX IF NOT EXISTS materials_created_by_profile_idx ON public.materials(created_by_profile_id);
CREATE INDEX IF NOT EXISTS materials_managed_by_teacher_idx ON public.materials(managed_by_teacher_id);
CREATE INDEX IF NOT EXISTS materials_created_at_idx ON public.materials(created_at DESC);
CREATE INDEX IF NOT EXISTS materials_status_class_subject_idx ON public.materials(status, class_id, subject_id);
CREATE INDEX IF NOT EXISTS material_batches_batch_idx ON public.material_batches(batch_id);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_assignments_admin_all ON public.teacher_assignments;
CREATE POLICY teacher_assignments_admin_all ON public.teacher_assignments
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS teacher_assignments_teacher_select ON public.teacher_assignments;
CREATE POLICY teacher_assignments_teacher_select ON public.teacher_assignments
FOR SELECT TO authenticated
USING (teacher_id = public.phase4_current_teacher_id());

DROP POLICY IF EXISTS chapters_admin_all ON public.chapters;
CREATE POLICY chapters_admin_all ON public.chapters
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS chapters_teacher_select ON public.chapters;
CREATE POLICY chapters_teacher_select ON public.chapters
FOR SELECT TO authenticated
USING (public.phase4_teacher_can_manage_scope(class_id, subject_id, NULL));

DROP POLICY IF EXISTS materials_admin_all ON public.materials;
CREATE POLICY materials_admin_all ON public.materials
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS materials_student_select ON public.materials;
CREATE POLICY materials_student_select ON public.materials
FOR SELECT TO authenticated
USING (public.phase4_student_can_read_material(id));

DROP POLICY IF EXISTS materials_teacher_select ON public.materials;
CREATE POLICY materials_teacher_select ON public.materials
FOR SELECT TO authenticated
USING (public.phase4_teacher_can_manage_material(id));

DROP POLICY IF EXISTS materials_teacher_insert ON public.materials;
CREATE POLICY materials_teacher_insert ON public.materials
FOR INSERT TO authenticated
WITH CHECK (
  created_by_profile_id = public.phase4_current_profile_id()
  AND managed_by_teacher_id = public.phase4_current_teacher_id()
  AND EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    WHERE ta.teacher_id = public.phase4_current_teacher_id()
      AND ta.class_id = materials.class_id
      AND ta.subject_id = materials.subject_id
      AND ta.batch_id IS NULL
  )
  AND status = 'DRAFT'
  AND published_at IS NULL
  AND archived_at IS NULL
);

DROP POLICY IF EXISTS materials_teacher_update ON public.materials;
CREATE POLICY materials_teacher_update ON public.materials
FOR UPDATE TO authenticated
USING (
  managed_by_teacher_id = public.phase4_current_teacher_id()
  AND public.phase4_teacher_can_manage_material(id)
)
WITH CHECK (
  managed_by_teacher_id = public.phase4_current_teacher_id()
  AND created_by_profile_id = public.phase4_material_created_by(id)
  AND class_id = public.phase4_material_class_id(id)
  AND subject_id = public.phase4_material_subject_id(id)
  AND public.phase4_teacher_can_manage_material(id)
);

DROP POLICY IF EXISTS materials_teacher_delete ON public.materials;
CREATE POLICY materials_teacher_delete ON public.materials
FOR DELETE TO authenticated
USING (
  managed_by_teacher_id = public.phase4_current_teacher_id()
  AND public.phase4_teacher_can_manage_material(id)
);

DROP POLICY IF EXISTS material_batches_admin_all ON public.material_batches;
CREATE POLICY material_batches_admin_all ON public.material_batches
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS material_batches_student_select ON public.material_batches;
CREATE POLICY material_batches_student_select ON public.material_batches
FOR SELECT TO authenticated
USING (public.phase4_student_can_read_material(material_id));

DROP POLICY IF EXISTS material_batches_teacher_select ON public.material_batches;
CREATE POLICY material_batches_teacher_select ON public.material_batches
FOR SELECT TO authenticated
USING (public.phase4_teacher_can_manage_material(material_id));

DROP POLICY IF EXISTS material_batches_teacher_insert ON public.material_batches;
CREATE POLICY material_batches_teacher_insert ON public.material_batches
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.materials m
    JOIN public.batches b ON b.id = material_batches.batch_id
    WHERE m.id = material_batches.material_id
      AND m.managed_by_teacher_id = public.phase4_current_teacher_id()
      AND public.phase4_teacher_can_manage_scope(m.class_id, m.subject_id, b.id)
  )
);

DROP POLICY IF EXISTS material_batches_teacher_update ON public.material_batches;
CREATE POLICY material_batches_teacher_update ON public.material_batches
FOR UPDATE TO authenticated
USING (public.phase4_teacher_can_manage_material(material_id))
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.materials m
    JOIN public.batches b ON b.id = material_batches.batch_id
    WHERE m.id = material_batches.material_id
      AND m.managed_by_teacher_id = public.phase4_current_teacher_id()
      AND public.phase4_teacher_can_manage_scope(m.class_id, m.subject_id, b.id)
  )
);

DROP POLICY IF EXISTS material_batches_teacher_delete
ON public.material_batches;

CREATE POLICY material_batches_teacher_delete
ON public.material_batches
FOR DELETE TO authenticated
USING (
  public.phase4_teacher_can_manage_material(material_id)
);

REVOKE ALL ON FUNCTION public.phase4_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_validate_teacher_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_validate_chapter() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_validate_material() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_validate_material_batch() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_current_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_current_teacher_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_teacher_can_manage_scope(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_teacher_can_manage_material(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_material_created_by(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_material_class_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_material_subject_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase4_student_can_read_material(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase4_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_teacher_can_manage_scope(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_teacher_can_manage_material(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_material_created_by(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_material_class_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_material_subject_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase4_student_can_read_material(uuid) TO authenticated;
