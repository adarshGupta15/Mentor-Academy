"use client";

import { useMemo, useState } from "react";
import type { TeacherStudent } from "@/lib/teacher/data";

export function TeacherStudentsTable({ students }: { students: TeacherStudent[] }) {
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [batchId, setBatchId] = useState("");
  const classes = [...new Map(students.map((student) => [student.class_id, student.class_name])).entries()];
  const batches = [...new Map(students.filter((student) => student.batch_id).map((student) => [student.batch_id as string, student.batch_name ?? "Batch"])).entries()];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) =>
      (!query || student.name.toLowerCase().includes(query) || student.student_id.toLowerCase().includes(query))
      && (!classId || student.class_id === classId)
      && (!batchId || student.batch_id === batchId),
    );
  }, [students, search, classId, batchId]);

  return <>
    <div className="teacher-filters">
      <label>Search students<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or student ID" /></label>
      <label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">All classes</option>{classes.map(([id, name]) => <option value={id} key={id}>Class {name}</option>)}</select></label>
      <label>Batch<select value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">All batches</option>{batches.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
      <span className="teacher-result-count">{filtered.length} students</span>
    </div>
    <div className="data-table">
      <table>
        <thead><tr><th>Student</th><th>Student ID</th><th>Class</th><th>Batch</th></tr></thead>
        <tbody>
          {filtered.map((student) => <tr key={student.id}><td>{student.name}</td><td>{student.student_id}</td><td>Class {student.class_name}</td><td>{student.batch_name ?? "—"}</td></tr>)}
          {!filtered.length && <tr><td colSpan={4} className="empty-state">{students.length ? "No students match these filters." : "No students in your assigned scope yet."}</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}