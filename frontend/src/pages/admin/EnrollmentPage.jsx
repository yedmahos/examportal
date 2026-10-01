import React, { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import Select from "../../components/common/Select";
import Input from "../../components/common/Input";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/Toast";
import { studentService } from "../../services/studentService";
import {
  enrollmentService,
  registrationService,
  programService,
  batchService,
  sectionService,
  academicYearService,
  subjectService,
} from "../../services/resourceService";
import "./AdminPages.css";

const EnrollmentPage = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentForm, setEnrollmentForm] = useState({
    student: "", program: "", batch: "", section: "", academicYear: "", semester: "", status: "active",
  });
  const [registrationForm, setRegistrationForm] = useState({
    student: "", subject: "", academicYear: "", semester: "", registrationStatus: "registered",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [studentRes, programRes, batchRes, sectionRes, yearRes, subjectRes, enrollmentRes, registrationRes] = await Promise.all([
        studentService.getAll({ limit: 100 }),
        programService.list({ limit: 100, status: "active" }),
        batchService.list({ limit: 100, status: "active" }),
        sectionService.list({ limit: 100, status: "active" }),
        academicYearService.list({ limit: 100 }),
        subjectService.list({ limit: 100, status: "active" }),
        enrollmentService.list({ limit: 20 }),
        registrationService.list({ limit: 20 }),
      ]);
      setStudents(studentRes.data.items || []);
      setPrograms(programRes.data.items);
      setBatches(batchRes.data.items);
      setSections(sectionRes.data.items);
      setYears(yearRes.data.items);
      setSubjects(subjectRes.data.items);
      setEnrollments(enrollmentRes.data.items);
      setRegistrations(registrationRes.data.items);
    } catch (err) {
      showToast(err.message || "Failed to load enrollment data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveEnrollment = async (event) => {
    event.preventDefault();
    try {
      await enrollmentService.create(enrollmentForm);
      showToast("Student enrolled", "success");
      load();
    } catch (err) {
      showToast(err.message || "Enrollment failed", "error");
    }
  };

  const saveRegistration = async (event) => {
    event.preventDefault();
    try {
      await registrationService.create(registrationForm);
      showToast("Subject registration saved", "success");
      load();
    } catch (err) {
      showToast(err.message || "Registration failed", "error");
    }
  };

  const studentOptions = students.map((item) => ({
    value: item.id,
    label: `${item.studentId || "Student"} · ${item.name}`,
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Enrollment" subtitle="Enroll students and register them for subjects" />
      <div className="phase1-split">
        <form className="admin-panel-card phase1-form" onSubmit={saveEnrollment}>
          <h3>Enroll student</h3>
          <FormField label="Student" required>
            <Select value={enrollmentForm.student} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, student: e.target.value })} options={studentOptions} placeholder="Select student" />
          </FormField>
          <FormField label="Program" required>
            <Select value={enrollmentForm.program} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, program: e.target.value })} options={programs.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select program" />
          </FormField>
          <FormField label="Academic year" required>
            <Select value={enrollmentForm.academicYear} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, academicYear: e.target.value })} options={years.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select year" />
          </FormField>
          <FormField label="Batch" required>
            <Select value={enrollmentForm.batch} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, batch: e.target.value })} options={batches.filter((item) => !enrollmentForm.program || item.program?.id === enrollmentForm.program).map((item) => ({ value: item.id, label: item.name }))} placeholder="Select batch" />
          </FormField>
          <FormField label="Section" required>
            <Select value={enrollmentForm.section} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, section: e.target.value })} options={sections.filter((item) => !enrollmentForm.batch || item.batch?.id === enrollmentForm.batch).map((item) => ({ value: item.id, label: item.name }))} placeholder="Select section" />
          </FormField>
          <FormField label="Semester" required>
            <Input type="number" min="1" max="12" value={enrollmentForm.semester} onChange={(e) => setEnrollmentForm({ ...enrollmentForm, semester: e.target.value })} required />
          </FormField>
          <Button type="submit">Save enrollment</Button>
        </form>
        <form className="admin-panel-card phase1-form" onSubmit={saveRegistration}>
          <h3>Register subject</h3>
          <FormField label="Student" required>
            <Select value={registrationForm.student} onChange={(e) => setRegistrationForm({ ...registrationForm, student: e.target.value })} options={studentOptions} placeholder="Select student" />
          </FormField>
          <FormField label="Subject" required>
            <Select value={registrationForm.subject} onChange={(e) => setRegistrationForm({ ...registrationForm, subject: e.target.value })} options={subjects.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} placeholder="Select subject" />
          </FormField>
          <FormField label="Academic year" required>
            <Select value={registrationForm.academicYear} onChange={(e) => setRegistrationForm({ ...registrationForm, academicYear: e.target.value })} options={years.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select year" />
          </FormField>
          <FormField label="Semester" required>
            <Input type="number" min="1" max="12" value={registrationForm.semester} onChange={(e) => setRegistrationForm({ ...registrationForm, semester: e.target.value })} required />
          </FormField>
          <FormField label="Status">
            <Select value={registrationForm.registrationStatus} onChange={(e) => setRegistrationForm({ ...registrationForm, registrationStatus: e.target.value })} options={[{ value: "registered", label: "Registered" }, { value: "pending", label: "Pending" }, { value: "dropped", label: "Dropped" }]} placeholder="" />
          </FormField>
          <Button type="submit">Save registration</Button>
        </form>
      </div>
      <div className="admin-table-panel">
        <h3 className="admin-panel-title">Recent enrollments</h3>
        <DataTable
          isLoading={loading}
          data={enrollments}
          emptyTitle="No enrollments"
          emptyDescription="Enroll a student in a batch and section."
          columns={[
            { title: "Student", key: "student", render: (value) => value?.name || "N/A" },
            { title: "Program", key: "program", render: (value) => value?.name || "N/A" },
            { title: "Batch", key: "batch", render: (value) => value?.name || "N/A" },
            { title: "Section", key: "section", render: (value) => value?.name || "N/A" },
            { title: "Semester", key: "semester" },
            { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
          ]}
        />
      </div>
      <div className="admin-table-panel">
        <h3 className="admin-panel-title">Recent registrations</h3>
        <DataTable
          isLoading={loading}
          data={registrations}
          emptyTitle="No registrations"
          emptyDescription="Register a student for a subject."
          columns={[
            { title: "Student", key: "student", render: (value) => value?.name || "N/A" },
            { title: "Subject", key: "subject", render: (value) => value?.name || "N/A" },
            { title: "Semester", key: "semester" },
            { title: "Status", key: "registrationStatus", render: (value) => <StatusBadge status={value} size="sm" /> },
          ]}
        />
      </div>
    </div>
  );
};

export default EnrollmentPage;
