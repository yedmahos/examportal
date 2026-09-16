import React, { useState, useEffect } from 'react';
import { User, Mail, Hash, BookOpen, GraduationCap, Phone, Calendar, MapPin, Edit3, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import Input from '../../components/common/Input';
import LoadingState from '../../components/common/LoadingState';
import { useToast } from '../../components/common/Toast';
import './StudentPages.css';

const StudentProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await profileService.getProfile(user?.id);
      setProfile(res.data);
      setEditForm({
        name: res.data.name || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await profileService.updateProfile(user?.id, editForm);
      setProfile(res.data);
      updateUser(res.data);
      setIsEditModalOpen(false);
      showToast('Profile information successfully updated', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading student profile..." />;
  if (!profile) return null;

  return (
    <div className="student-profile-page animate-fade-in">
      <PageHeader
        title="Student Profile"
        subtitle="Verified academic credentials and contact record"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Edit3}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Profile
          </Button>
        }
      />

      <div className="profile-layout-grid">
        {/* Left Column: Profile Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-top">
            <Avatar
              src={profile.avatar}
              name={profile.name}
              size="xl"
              className="profile-avatar-large"
            />
            <div className="profile-name-stack">
              <h2 className="profile-full-name">{profile.name}</h2>
              <span className="profile-student-id">{profile.studentId}</span>
              <div className="profile-status-row">
                <StatusBadge status={profile.status || 'Active'} size="md" />
                <span className="profile-program-tag">{profile.semester}</span>
              </div>
            </div>
          </div>

          <div className="profile-quick-stats">
            <div className="p-stat-box">
              <span className="p-stat-num text-primary">{profile.gpa ? profile.gpa.toFixed(2) : '3.75'}</span>
              <span className="p-stat-lbl">Cumulative GPA</span>
            </div>
            <div className="p-stat-box">
              <span className="p-stat-num">{profile.creditsCompleted || 120}</span>
              <span className="p-stat-lbl">Credits Done</span>
            </div>
            <div className="p-stat-box">
              <span className="p-stat-num text-success">Good</span>
              <span className="p-stat-lbl">Academic Standing</span>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Academic and Contact Specifications */}
        <div className="profile-info-column">
          {/* Academic Information */}
          <div className="profile-section-card">
            <div className="section-card-title-row">
              <GraduationCap size={18} className="text-primary" />
              <h3 className="section-card-title">Academic Details</h3>
            </div>

            <div className="profile-fields-grid">
              <div className="p-field-item">
                <span className="p-field-label">Department</span>
                <span className="p-field-value">{profile.department}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Degree Program</span>
                <span className="p-field-value">{profile.program}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Current Semester</span>
                <span className="p-field-value">{profile.semester}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Academic Year</span>
                <span className="p-field-value">{profile.academicYear}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Total Program Credits</span>
                <span className="p-field-value">{profile.totalCredits || 144} Credits Required</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Enrollment Date</span>
                <span className="p-field-value">{profile.enrollmentDate || '2023-09-01'}</span>
              </div>
            </div>
          </div>

          {/* Contact & Personal Information */}
          <div className="profile-section-card">
            <div className="section-card-title-row">
              <User size={18} className="text-primary" />
              <h3 className="section-card-title">Personal & Contact Record</h3>
            </div>

            <div className="profile-fields-grid">
              <div className="p-field-item">
                <span className="p-field-label">Institutional Email</span>
                <span className="p-field-value">{profile.email}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Phone Contact</span>
                <span className="p-field-value">{profile.phone || 'Not provided'}</span>
              </div>

              <div className="p-field-item field-span-full">
                <span className="p-field-label">Mailing Address</span>
                <span className="p-field-value">{profile.address || 'Campus View Apartments #402, Academic City'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isSaving && setIsEditModalOpen(false)}
        title="Edit Profile Information"
        subtitle="Update your personal contact details (Academic fields require Dean approval)"
        footer={
          <div className="modal-footer-btns">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveProfile}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveProfile}>
          <FormField label="Full Name" required>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full Name"
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Phone Number" required>
            <Input
              value={editForm.phone}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Mailing Address">
            <Input
              value={editForm.address}
              onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g. Campus View Apartments, Room 402"
              disabled={isSaving}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default StudentProfile;
