import Link from "next/link";
import { BookOpen, ClipboardList, GraduationCap, Users } from "lucide-react";
import { getTeacherPortalData, getTeacherStudents, matchesTeacherAssignment } from "@/lib/teacher/data";

export default async function TeacherPage() {
	const { teacher, assignments, supabase, error } = await getTeacherPortalData();
	const { students, error: studentError } = teacher ? await getTeacherStudents(supabase) : { students: [], error: null };
	const { data: tests } = teacher ? await supabase.from("tests").select("id, title, class_id, subject_id, batch_id, status, created_by_teacher_id, created_at").order("created_at", { ascending: false }) : { data: [] };
	const visibleTests = (tests ?? []).filter((test) => matchesTeacherAssignment({ class_id: test.class_id, subject_id: test.subject_id, batch_id: test.batch_id }, assignments));
	const classes = new Map(assignments.map((assignment) => [assignment.class_id, assignment.class.name]));
	const subjects = new Set(assignments.map((assignment) => assignment.subject_id));
	const batches = new Set(assignments.flatMap((assignment) => assignment.batch_id ? [assignment.batch_id] : []));
	const testsCreated = visibleTests.filter((test) => teacher && test.created_by_teacher_id === teacher.id).length;
	const publishedTests = visibleTests.filter((test) => test.status === "PUBLISHED").length;
	const recentTests = visibleTests.slice(0, 4);

	return (
		<section className="teacher-page">
			<div className="teacher-heading">
				<span>TEACHER OVERVIEW</span>
				<h2>Welcome, {teacher?.name ?? "Teacher"}</h2>
				<p>Teacher ID: {teacher?.teacher_id ?? "Unavailable"}</p>
			</div>
			{(error || studentError) && <div className="alert-box alert-error" role="alert">{error ?? "Student totals are unavailable. Apply the reviewed teacher-scope migration to enable this view."}</div>}
			<section aria-labelledby="teaching-overview-title">
				<h3 className="teacher-section-title" id="teaching-overview-title">Teaching Overview</h3>
				<div className="teacher-metrics">
					<article><BookOpen /><span>Assigned Classes</span><strong>{classes.size}</strong></article>
					<article><GraduationCap /><span>Assigned Subjects</span><strong>{subjects.size}</strong></article>
					<article><BookOpen /><span>Assigned Batches</span><strong>{batches.size}</strong></article>
					<article><Users /><span>Total Students</span><strong>{studentError ? 0 : students.length}</strong></article>
					<article><ClipboardList /><span>Tests Created</span><strong>{testsCreated}</strong></article>
					<article><BookOpen /><span>Published Tests</span><strong>{publishedTests}</strong></article>
				</div>
			</section>
			<section className="teacher-section" aria-labelledby="assigned-classes-title">
				<div className="teacher-section-heading"><h3 className="teacher-section-title" id="assigned-classes-title">Assigned Classes</h3><span>{assignments.length} assignments</span></div>
				<div className="data-table">
					<table>
						<thead><tr><th>Class</th><th>Subject</th><th>Batch</th><th>Timing</th><th>Days</th><th>Room</th></tr></thead>
						<tbody>
							{assignments.map((assignment) => <tr key={`${assignment.class_id}-${assignment.subject_id}-${assignment.batch_id ?? "all"}`}>
								<td>Class {assignment.class.name}</td><td>{assignment.subject.name}</td><td>{assignment.batch?.name ?? "All Batches"}</td>
								<td>{assignment.batch?.timing ?? "—"}</td><td>{assignment.batch?.days ?? "—"}</td><td>{assignment.batch?.room ?? "—"}</td>
							</tr>)}
							{!assignments.length && <tr><td colSpan={6} className="empty-state">No classes assigned yet.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>
			{visibleTests.length > 0 && (
				<section className="teacher-section" aria-labelledby="recent-tests-title">
					<div className="teacher-section-heading"><h3 className="teacher-section-title" id="recent-tests-title">Recent tests</h3><Link href="/teacher/tests" className="button quiet">View all</Link></div>
					<div className="data-table">
						<table>
							<thead><tr><th>Title</th><th>Status</th><th>Creator</th></tr></thead>
							<tbody>
								{recentTests.map((test) => (
									<tr key={test.id}><td>{test.title}</td><td>{test.status}</td><td>{test.created_by_teacher_id === teacher?.id ? "You" : "Assigned teacher"}</td></tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}
		</section>
	);
}
