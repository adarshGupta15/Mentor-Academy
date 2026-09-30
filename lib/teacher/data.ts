import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

type AssignmentRelation<T> = T | T[] | null;

type AssignmentRow = {
  class_id: string;
  subject_id: string;
  batch_id: string | null;
  class: AssignmentRelation<{ id: string; name: string; is_active: boolean }>;
  subject: AssignmentRelation<{ id: string; name: string; is_active: boolean }>;
  batch: AssignmentRelation<{ id: string; name: string; timing: string | null; days: string | null; room: string | null; is_active: boolean }>;
};

export type TeacherPortalTeacher = {
  id: string;
  teacher_id: string;
  qualification: string | null;
  experience: number | null;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type TeacherAssignment = {
  class_id: string;
  subject_id: string;
  batch_id: string | null;
  class: { id: string; name: string };
  subject: { id: string; name: string };
  batch: { id: string; name: string; timing: string | null; days: string | null; room: string | null } | null;
};

function one<T>(value: AssignmentRelation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getTeacherPortalData(): Promise<{
  identity: Awaited<ReturnType<typeof requireRole>>;
  teacher: TeacherPortalTeacher | null;
  assignments: TeacherAssignment[];
  supabase: Awaited<ReturnType<typeof createClient>>;
  error: string | null;
}> {
  const identity = await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, email, role, is_active")
    .eq("user_id", identity.id)
    .single();

  if (profileError || !profile) {
    return { identity, teacher: null, assignments: [] as TeacherAssignment[], supabase, error: "Your teacher profile could not be loaded." };
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, teacher_id, qualification, experience")
    .eq("profile_id", profile.id)
    .single();

  if (teacherError || !teacher) {
    return { identity, teacher: null, assignments: [] as TeacherAssignment[], supabase, error: "Your teacher record could not be loaded." };
  }

  const { data, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("class_id, subject_id, batch_id, class:classes(id, name, is_active), subject:subjects(id, name, is_active), batch:batches(id, name, timing, days, room, is_active)")
    .eq("teacher_id", teacher.id);

  if (assignmentError) {
    return { identity, teacher: { ...teacher, name: profile.name, email: profile.email, role: profile.role, is_active: profile.is_active }, assignments: [] as TeacherAssignment[], supabase, error: "Assignments could not be loaded. Apply the reviewed teacher-scope migration before using these pages." };
  }

  const rows = (data ?? []) as unknown as AssignmentRow[];
  if (rows.some((row) => !one(row.class) || !one(row.subject) || (row.batch_id && !one(row.batch)))) {
    return { identity, teacher: { ...teacher, name: profile.name, email: profile.email, role: profile.role, is_active: profile.is_active }, assignments: [] as TeacherAssignment[], supabase, error: "Assignment details are hidden by the current database policies. Apply the reviewed teacher-scope migration before using these pages." };
  }

  const assignments = rows.flatMap((row) => {
    const classRow = one(row.class);
    const subjectRow = one(row.subject);
    const batchRow = one(row.batch);
    if (!classRow?.is_active || !subjectRow?.is_active || (row.batch_id && (!batchRow || !batchRow.is_active))) return [];
    return [{
      class_id: row.class_id,
      subject_id: row.subject_id,
      batch_id: row.batch_id,
      class: { id: classRow.id, name: classRow.name },
      subject: { id: subjectRow.id, name: subjectRow.name },
      batch: batchRow ? { id: batchRow.id, name: batchRow.name, timing: batchRow.timing, days: batchRow.days, room: batchRow.room } : null,
    }];
  });

  return {
    identity,
    teacher: { ...teacher, name: profile.name, email: profile.email, role: profile.role, is_active: profile.is_active },
    assignments,
    supabase,
    error: null as string | null,
  };
}

export function matchesTeacherAssignment(
  test: { class_id: string; subject_id: string; batch_id: string | null },
  assignments: TeacherAssignment[],
) {
  return assignments.some((assignment) =>
    assignment.class_id === test.class_id
    && assignment.subject_id === test.subject_id
    && (
      test.batch_id === null
        ? assignment.batch_id === null
        : assignment.batch_id === null || assignment.batch_id === test.batch_id
    )
  );
}

export type TeacherStudent = {
  id: string;
  student_id: string;
  roll_number: string | null;
  name: string;
  class_id: string;
  class_name: string;
  batch_id: string | null;
  batch_name: string | null;
};

export async function getTeacherStudents(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("t1_get_teacher_students");
  return { students: (data ?? []) as TeacherStudent[], error };
}