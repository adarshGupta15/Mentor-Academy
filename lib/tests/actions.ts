"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const optionalText = z.string().trim().max(500).optional().or(z.literal(""));
const nameText = z.string().trim().min(1).max(200);
const maxMarks = z.coerce.number().int().min(1).max(1000);

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You are not signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .single();

  if (error || !profile || !profile.is_active) {
    throw new Error("Your profile could not be verified.");
  }

  return { supabase, profile };
}

async function ensureTeacherAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  classId: string,
  subjectId: string,
  batchId: string | null,
) {
  const query = supabase
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId);

  const { data, error } = batchId
    ? await query.or(`batch_id.is.null,batch_id.eq.${batchId}`).maybeSingle()
    : await query.is("batch_id", null).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("You are not assigned to this class and subject scope.");
}

async function ensureValidTestSetup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  subjectId: string,
  batchId: string | null,
) {
  const { data: relation } = await supabase
    .from("class_subjects")
    .select("class_id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (!relation) throw new Error("Select a valid class and subject combination.");

  if (batchId) {
    const { data: batch } = await supabase
      .from("batches")
      .select("id")
      .eq("id", batchId)
      .eq("class_id", classId)
      .eq("is_active", true)
      .maybeSingle();

    if (!batch) throw new Error("The selected batch must belong to the class and be active.");
  }
}

async function getTeacherIdForProfile(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) {
  const { data, error } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Teacher profile could not be resolved.");
  return data.id as string;
}

function getTestStatusValue(raw: string | null) {
  if (!raw) return "DRAFT";
  return raw === "PUBLISHED" || raw === "DRAFT" || raw === "ARCHIVED" ? raw : "DRAFT";
}

export async function createTest(form: FormData) {
  const title = nameText.parse(value(form, "title"));
  const description = optionalText.parse(value(form, "description")) || null;
  const classId = uuid.parse(value(form, "classId"));
  const subjectId = uuid.parse(value(form, "subjectId"));
  const batchId = value(form, "batchId") ? uuid.parse(value(form, "batchId")) : null;
  const testDate = value(form, "testDate");
  const maxMarksValue = maxMarks.parse(value(form, "maxMarks"));
  const status = getTestStatusValue(value(form, "status"));

  const { supabase, profile } = await getCurrentProfile();
  await ensureValidTestSetup(supabase, classId, subjectId, batchId);

  let teacherId: string | null = null;

  if (profile.role === "ADMIN") {
    // allowed to create for any valid scope
  } else if (profile.role === "TEACHER") {
    teacherId = await getTeacherIdForProfile(supabase, profile.id);
    await ensureTeacherAssignment(supabase, teacherId, classId, subjectId, batchId);
  } else {
    throw new Error("Only admin and teacher roles may create tests.");
  }

  if (!testDate) throw new Error("A test date is required.");

  const { error } = await supabase.from("tests").insert({
    title,
    description,
    class_id: classId,
    subject_id: subjectId,
    batch_id: batchId,
    test_date: testDate,
    max_marks: maxMarksValue,
    status,
    created_by_profile_id: profile.id,
    created_by_teacher_id: teacherId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/tests");
  revalidatePath("/teacher/tests");
  revalidatePath("/student/tests");
  return { ok: true };
}

export async function updateTest(form: FormData) {
  const id = uuid.parse(value(form, "testId"));
  const title = nameText.parse(value(form, "title"));
  const description = optionalText.parse(value(form, "description")) || null;
  const classId = uuid.parse(value(form, "classId"));
  const subjectId = uuid.parse(value(form, "subjectId"));
  const batchId = value(form, "batchId") ? uuid.parse(value(form, "batchId")) : null;
  const testDate = value(form, "testDate");
  const maxMarksValue = maxMarks.parse(value(form, "maxMarks"));
  const status = getTestStatusValue(value(form, "status"));

  const { supabase, profile } = await getCurrentProfile();

  if (profile.role === "ADMIN") {
    await ensureValidTestSetup(supabase, classId, subjectId, batchId);
  } else if (profile.role === "TEACHER") {
    const teacherId = await getTeacherIdForProfile(supabase, profile.id);
    await ensureTeacherAssignment(supabase, teacherId, classId, subjectId, batchId);
    await ensureValidTestSetup(supabase, classId, subjectId, batchId);
  } else {
    throw new Error("You do not have permission to edit tests.");
  }

  if (!testDate) throw new Error("A test date is required.");

  const { error } = await supabase
    .from("tests")
    .update({
      title,
      description,
      class_id: classId,
      subject_id: subjectId,
      batch_id: batchId,
      test_date: testDate,
      max_marks: maxMarksValue,
      status,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/tests");
  revalidatePath("/teacher/tests");
  revalidatePath("/student/tests");
  revalidatePath("/student/marks");
  return { ok: true };
}

export async function publishTest(form: FormData) {
  const id = uuid.parse(value(form, "testId"));
  const { supabase, profile } = await getCurrentProfile();

  if (profile.role === "ADMIN") {
    const { error } = await supabase.from("tests").update({ status: "PUBLISHED" }).eq("id", id);
    if (error) throw new Error(error.message);
  } else if (profile.role === "TEACHER") {
    const teacherId = await getTeacherIdForProfile(supabase, profile.id);
    const { data: test } = await supabase.from("tests").select("class_id,subject_id,batch_id").eq("id", id).maybeSingle();
    if (!test) throw new Error("Test not found.");
    await ensureTeacherAssignment(supabase, teacherId, test.class_id, test.subject_id, test.batch_id);
    const { error } = await supabase.from("tests").update({ status: "PUBLISHED" }).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Not allowed.");
  }

  revalidatePath("/admin/tests");
  revalidatePath("/teacher/tests");
  revalidatePath("/student/tests");
  return { ok: true };
}

export async function archiveTest(form: FormData) {
  const id = uuid.parse(value(form, "testId"));
  const { supabase, profile } = await getCurrentProfile();

  if (profile.role === "ADMIN") {
    const { error } = await supabase.from("tests").update({ status: "ARCHIVED" }).eq("id", id);
    if (error) throw new Error(error.message);
  } else if (profile.role === "TEACHER") {
    const teacherId = await getTeacherIdForProfile(supabase, profile.id);
    const { data: test } = await supabase.from("tests").select("class_id,subject_id,batch_id").eq("id", id).maybeSingle();
    if (!test) throw new Error("Test not found.");
    await ensureTeacherAssignment(supabase, teacherId, test.class_id, test.subject_id, test.batch_id);
    const { error } = await supabase.from("tests").update({ status: "ARCHIVED" }).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Not allowed.");
  }

  revalidatePath("/admin/tests");
  revalidatePath("/teacher/tests");
  revalidatePath("/student/tests");
  return { ok: true };
}

export async function deleteTest(form: FormData) {
  const id = uuid.parse(value(form, "testId"));
  const { supabase, profile } = await getCurrentProfile();

  if (profile.role === "ADMIN") {
    const { data: results } = await supabase.from("test_results").select("id").eq("test_id", id).limit(1);
    if ((results ?? []).length) throw new Error("Delete the test results before removing this test.");
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else if (profile.role === "TEACHER") {
    const teacherId = await getTeacherIdForProfile(supabase, profile.id);
    const { data: test } = await supabase.from("tests").select("class_id,subject_id,batch_id").eq("id", id).maybeSingle();
    if (!test) throw new Error("Test not found.");
    await ensureTeacherAssignment(supabase, teacherId, test.class_id, test.subject_id, test.batch_id);
    const { data: results } = await supabase.from("test_results").select("id").eq("test_id", id).limit(1);
    if ((results ?? []).length) throw new Error("Delete the test results before removing this test.");
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Not allowed.");
  }

  revalidatePath("/admin/tests");
  revalidatePath("/teacher/tests");
  return { ok: true };
}

export async function saveTestResult(form: FormData) {
  const testId = uuid.parse(value(form, "testId"));
  const studentId = uuid.parse(value(form, "studentId"));
  const obtainedMarks = z.coerce.number().min(0).max(100000).parse(value(form, "obtainedMarks"));
  const remarks = optionalText.parse(value(form, "remarks")) ?? null;

  const { supabase, profile } = await getCurrentProfile();

  if (profile.role !== "ADMIN" && profile.role !== "TEACHER") {
    throw new Error("Students cannot save marks.");
  }

  const { data: test } = await supabase
    .from("tests")
    .select("id, class_id, subject_id, batch_id, max_marks, status")
    .eq("id", testId)
    .maybeSingle();

  if (!test) throw new Error("Test not found.");

  if (profile.role === "TEACHER") {
    const teacherId = await getTeacherIdForProfile(supabase, profile.id);
    await ensureTeacherAssignment(supabase, teacherId, test.class_id, test.subject_id, test.batch_id);
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, class_id, batch_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) throw new Error("Student not found.");

  const eligible = await supabase.rpc("student_is_eligible_for_test", { p_test_id: testId, p_student_id: studentId });
  if (!eligible.data) throw new Error("This student is not eligible for the selected test.");

  if (obtainedMarks > test.max_marks) {
    throw new Error("The entered marks exceed the maximum marks for this test.");
  }

  const { data: existing } = await supabase
    .from("test_results")
    .select("id")
    .eq("test_id", testId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("test_results")
      .update({ obtained_marks: obtainedMarks, teacher_remarks: remarks, entered_by_profile_id: profile.id })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("test_results").insert({
      test_id: testId,
      student_id: studentId,
      obtained_marks: obtainedMarks,
      teacher_remarks: remarks,
      entered_by_profile_id: profile.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/tests");
  revalidatePath("/admin/tests/[id]/results");
  revalidatePath("/teacher/tests");
  revalidatePath("/teacher/marks");
  revalidatePath("/student/marks");
  return { ok: true };
}

export async function getTeacherAssignmentsForCurrentUser() {
  const { supabase, profile } = await getCurrentProfile();
  if (profile.role !== "TEACHER") return [] as Array<{ class_id: string; subject_id: string; batch_id: string | null }>;
  const teacherId = await getTeacherIdForProfile(supabase, profile.id);
  const { data } = await supabase.from("teacher_assignments").select("class_id, subject_id, batch_id").eq("teacher_id", teacherId);
  return (data ?? []) as Array<{ class_id: string; subject_id: string; batch_id: string | null }>;
}
