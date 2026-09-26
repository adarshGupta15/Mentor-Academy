"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "study-materials";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const materialTypes = ["PDF_NOTE", "PDF_WORKSHEET", "QUESTION_PAPER", "ASSIGNMENT", "IMAGE", "OTHER"] as const;
const materialType = z.enum(materialTypes);
const text = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(500).optional().or(z.literal(""));
const uuid = z.string().uuid();
const allowedFiles = new Map<string, string[]>([
  ["application/pdf", [".pdf"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["image/webp", [".webp"]],
]);

function field(form: FormData, name: string) { return String(form.get(name) ?? ""); }
function fieldIds(form: FormData, name: string) { return form.getAll(name).map(String).filter(Boolean); }
function fail(message: string): never { throw new Error(message); }

function safeFilename(file: File) {
  const original = file.name.trim();
  if (!original || original.length > 255 || original.includes("..") || original.includes("/") || original.includes("\\") || /^[a-zA-Z]:/.test(original)) fail("The filename is not safe.");
  const extension = original.slice(original.lastIndexOf(".")).toLowerCase();
  const expected = allowedFiles.get(file.type);
  if (!expected || !expected.includes(extension)) fail("The file type and extension do not match.");
  const base = original.slice(0, -extension.length).normalize("NFKC").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
  if (!base) fail("The filename is not safe.");
  return `${base}${extension}`;
}

function validateFile(value: FormDataEntryValue | null, required: boolean) {
  if (!(value instanceof File) || value.size === 0) {
    if (required) fail("Please choose a file.");
    return null;
  }
  if (value.size > MAX_FILE_SIZE) fail("Files must be 25 MB or smaller.");
  return { file: value, filename: safeFilename(value) };
}

function validateInputs(form: FormData, withFile: boolean) {
  const title = text.parse(field(form, "title"));
  const description = optionalText.parse(field(form, "description")) || null;
  const type = materialType.parse(field(form, "materialType"));
  const classId = uuid.parse(field(form, "classId"));
  const subjectId = uuid.parse(field(form, "subjectId"));
  const chapterId = field(form, "chapterId") ? uuid.parse(field(form, "chapterId")) : null;
  const batchIds = [...new Set(fieldIds(form, "batchIds"))].map((id) => uuid.parse(id));
  const file = validateFile(form.get("file"), withFile);
  return { title, description, type, classId, subjectId, chapterId, batchIds, file };
}

async function adminClient() {
  await requireRole("ADMIN");
  return createAdminClient();
}

async function validateScope(supabase: ReturnType<typeof createAdminClient>, data: ReturnType<typeof validateInputs>) {
  const [{ data: relation }, { data: chapter }, { data: batches }] = await Promise.all([
    supabase.from("class_subjects").select("class_id").eq("class_id", data.classId).eq("subject_id", data.subjectId).maybeSingle(),
    data.chapterId ? supabase.from("chapters").select("id").eq("id", data.chapterId).eq("class_id", data.classId).eq("subject_id", data.subjectId).eq("is_active", true).maybeSingle() : Promise.resolve({ data: true }),
    data.batchIds.length ? supabase.from("batches").select("id").in("id", data.batchIds).eq("class_id", data.classId).eq("is_active", true) : Promise.resolve({ data: [] }),
  ]);
  const [{ data: classRow }, { data: subjectRow }] = await Promise.all([
    supabase.from("classes").select("id").eq("id", data.classId).eq("is_active", true).maybeSingle(),
    supabase.from("subjects").select("id").eq("id", data.subjectId).eq("is_active", true).maybeSingle(),
  ]);
  if (!classRow || !subjectRow) fail("Select an active class and subject.");
  if (!relation) fail("Select a valid class and subject combination.");
  if (data.chapterId && !chapter) fail("Select a chapter from the selected class and subject.");
  if (data.batchIds.length !== (batches ?? []).length) fail("Select only active batches from the selected class.");
}

async function adminProfileId(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase.from("profiles").select("id").eq("user_id", userId).eq("role", "ADMIN").eq("is_active", true).single();
  if (!data) fail("The administrator profile could not be verified.");
  return data.id;
}

function refreshMaterials() { revalidatePath("/admin/materials"); revalidatePath("/admin"); }

export async function createMaterial(form: FormData) {
  const identity = await requireRole("ADMIN");
  const data = validateInputs(form, true);
  const file = data.file as NonNullable<typeof data.file>;
  const supabase = createAdminClient();
  await validateScope(supabase, data);
  const profileId = await adminProfileId(supabase, identity.id);
  const materialId = crypto.randomUUID();
  const storagePath = `materials/${materialId}/${file.filename}`;
  const { error: insertError } = await supabase.from("materials").insert({ id: materialId, title: data.title, description: data.description, material_type: data.type, status: "DRAFT", class_id: data.classId, subject_id: data.subjectId, chapter_id: data.chapterId, storage_path: storagePath, original_filename: file.filename, mime_type: file.file.type, file_size_bytes: file.file.size, created_by_profile_id: profileId, managed_by_teacher_id: null });
  if (insertError) fail("The material could not be created.");
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file.file, { contentType: file.file.type, upsert: false });
  if (uploadError) { await supabase.from("materials").delete().eq("id", materialId); fail("The file could not be uploaded."); }
  if (data.batchIds.length) {
    const { error: batchError } = await supabase.from("material_batches").insert(data.batchIds.map((batchId) => ({ material_id: materialId, batch_id: batchId })));
    if (batchError) { await supabase.storage.from(BUCKET).remove([storagePath]); await supabase.from("materials").delete().eq("id", materialId); fail("The material targets could not be saved."); }
  }
  refreshMaterials();
  return { ok: true };
}

export async function updateMaterial(form: FormData) {
  await requireRole("ADMIN");
  const materialId = uuid.parse(field(form, "materialId"));
  const data = validateInputs(form, false);
  const supabase = createAdminClient();
  await validateScope(supabase, data);
  const { data: existing } = await supabase.from("materials").select("storage_path, original_filename, mime_type, file_size_bytes").eq("id", materialId).single();
  if (!existing) fail("Material not found.");
  const replacementFilename = data.file && data.file.filename === existing.original_filename ? `${data.file.filename.slice(0, data.file.filename.lastIndexOf("."))}-${crypto.randomUUID().slice(0, 8)}${data.file.filename.slice(data.file.filename.lastIndexOf("."))}` : data.file?.filename;
  const newPath = data.file ? `materials/${materialId}/${replacementFilename}` : existing.storage_path;
  if (data.file) {
    const { error } = await supabase.storage.from(BUCKET).upload(newPath, data.file.file, { contentType: data.file.file.type, upsert: false });
    if (error) fail("The replacement file could not be uploaded.");
  }
  const fileFields = data.file ? { storage_path: newPath, original_filename: replacementFilename, mime_type: data.file.file.type, file_size_bytes: data.file.file.size } : {};
  const { error: updateError } = await supabase.from("materials").update({ title: data.title, description: data.description, material_type: data.type, class_id: data.classId, subject_id: data.subjectId, chapter_id: data.chapterId, ...fileFields }).eq("id", materialId);
  if (updateError) { if (data.file) await supabase.storage.from(BUCKET).remove([newPath]); fail("The material could not be updated."); }
  const { error: clearError } = await supabase.from("material_batches").delete().eq("material_id", materialId);
  if (clearError) fail("The material targets could not be updated.");
  if (data.batchIds.length) {
    const { error: batchError } = await supabase.from("material_batches").insert(data.batchIds.map((batchId) => ({ material_id: materialId, batch_id: batchId })));
    if (batchError) fail("The material targets could not be updated.");
  }
  if (data.file && existing.storage_path !== newPath) await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  refreshMaterials();
  return { ok: true };
}

export async function publishMaterial(form: FormData) {
  const supabase = await adminClient();
  const id = uuid.parse(field(form, "materialId"));
  const { error } = await supabase.from("materials").update({ status: "PUBLISHED", published_at: new Date().toISOString(), archived_at: null }).eq("id", id);
  if (error) fail("The material could not be published.");
  refreshMaterials();
}

export async function archiveMaterial(form: FormData) {
  const supabase = await adminClient();
  const id = uuid.parse(field(form, "materialId"));
  const { error } = await supabase.from("materials").update({ status: "ARCHIVED", archived_at: new Date().toISOString() }).eq("id", id);
  if (error) fail("The material could not be archived.");
  refreshMaterials();
}

export async function deleteMaterial(form: FormData) {
  const supabase = await adminClient();
  const id = uuid.parse(field(form, "materialId"));
  const { data: material } = await supabase.from("materials").select("storage_path").eq("id", id).single();
  if (!material || !material.storage_path.startsWith(`materials/${id}/`)) fail("Material storage could not be verified.");
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([material.storage_path]);
  if (storageError) fail("The material file could not be removed.");
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) fail("The material record could not be removed.");
  refreshMaterials();
}

export async function getMaterialDownloadUrl(form: FormData) {
  const supabase = await adminClient();
  const id = uuid.parse(field(form, "materialId"));
  const { data: material } = await supabase.from("materials").select("storage_path").eq("id", id).single();
  if (!material || !material.storage_path.startsWith(`materials/${id}/`)) fail("Material storage could not be verified.");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(material.storage_path, 600);
  if (error || !data?.signedUrl) fail("A secure download link could not be created.");
  return data.signedUrl;
}