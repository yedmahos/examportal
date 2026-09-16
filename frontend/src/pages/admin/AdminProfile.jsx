import React, { useState } from 'react';
import { Shield, Mail, Award, CheckCircle2, User, Phone, Edit2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import Input from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: user?.name || 'Dr. Jusuf Pariaman',
    designation: user?.designation || 'Chief Controller of Examinations',
    phone: user?.phone || '+1 (555) 880-9921',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await profileService.updateProfile(user?.id, form);
      updateUser(res.data);
      setIsModalOpen(false);
      showToast('Admin profile updated successfully', 'success');
    } catch (e) {
      showToast('Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-profile-page animate-fade-in">
      <PageHeader
        title="Administrative Officer Profile"
        subtitle="Examination Directorate credential and security permissions"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Edit2}
            onClick={() => setIsModalOpen(true)}
          >
            Edit Profile
          </Button>
        }
      />

      <div className="profile-layout-grid">
        <div className="profile-hero-card">
          <div className="profile-hero-top">
            <Avatar src={user?.avatar} name={user?.name || 'Admin'} size="xl" />
            <div className="profile-name-stack">
              <h2 className="profile-full-name">{user?.name}</h2>
              <span className="profile-student-id">{user?.designation || 'Controller of Examinations'}</span>
              <div className="profile-status-row">
                <StatusBadge status="Active" />
                <span className="profile-program-tag">Admin Role</span>
              </div>
            </div>
          </div>

          <div className="admin-permissions-list">
            <h4 className="perm-title">Privileged Access Scope</h4>
            <div className="perm-item">
              <CheckCircle2 size={15} className="text-success" />
              <span>Timetable & Hall Scheduling</span>
            </div>
            <div className="perm-item">
              <CheckCircle2 size={15} className="text-success" />
              <span>Marksheet Verification & Publication</span>
            </div>
            <div className="perm-item">
              <CheckCircle2 size={15} className="text-success" />
              <span>Candidate Dossier & Registry</span>
            </div>
            <div className="perm-item">
              <CheckCircle2 size={15} className="text-success" />
              <span>Portal Circular Broadcasting</span>
            </div>
          </div>
        </div>

        <div className="profile-info-column">
          <div className="profile-section-card">
            <div className="section-card-title-row">
              <Shield size={18} className="text-primary" />
              <h3 className="section-card-title">Institutional Appointment</h3>
            </div>

            <div className="profile-fields-grid">
              <div className="p-field-item">
                <span className="p-field-label">Directorate</span>
                <span className="p-field-value">{user?.department || 'Examination Directorate'}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Designation</span>
                <span className="p-field-value">{user?.designation || 'Chief Controller of Examinations'}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Official Email</span>
                <span className="p-field-value">{user?.email}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Direct Phone Line</span>
                <span className="p-field-value">{user?.phone || '+1 (555) 880-9921'}</span>
              </div>
            </div>
          </div>

          <div className="profile-section-card">
            <div className="section-card-title-row">
              <Lock size={18} className="text-primary" />
              <h3 className="section-card-title">Security & Role Governance</h3>
            </div>
            <p className="security-notice-text">
              System administrator accounts are protected under institutional policy. Account privileges, roles, and authorization keys can only be modified through the IT Governance Board.
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="Edit Administrator Record"
        subtitle="Update officer contact details and official designation"
        footer={
          <div className="modal-footer-btns">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave}>
          <FormField label="Full Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Official Designation" required>
            <Input
              value={form.designation}
              onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Contact Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              disabled={isSaving}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProfile;
