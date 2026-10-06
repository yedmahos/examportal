import React, { useEffect, useState } from 'react';
import { Shield, Lock, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { departmentLabel, roleLabel } from '../../utils/roles';
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
import './AdminPages.css';

const display = (value) => (
  value === undefined || value === null || value === '' ? 'N/A' : value
);

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
  });

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const res = await profileService.getProfile();
      setProfile(res.data);
      updateUser(res.data);
      setForm({
        name: res.data?.name || '',
        phone: res.data?.phone || '',
        address: res.data?.address || '',
      });
    } catch (error) {
      showToast(error.message || 'Failed to load profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await profileService.updateProfile({
        name: form.name,
        phone: form.phone,
        address: form.address,
      });
      setProfile(res.data);
      updateUser(res.data);
      setIsModalOpen(false);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading profile..." />;

  const record = profile || user || {};
  const label = roleLabel(record.role || user?.role);
  const department = departmentLabel(record);

  return (
    <div className="admin-profile-page animate-fade-in">
      <PageHeader
        title={`${label} Profile`}
        subtitle={`${record.name || 'N/A'} · ${record.email || 'N/A'}`}
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
            <Avatar src={record.profileImage || record.avatar} name={record.name || 'User'} size="xl" />
            <div className="profile-name-stack">
              <h2 className="profile-full-name">{display(record.name)}</h2>
              <span className="profile-student-id">{display(record.email)}</span>
              <div className="profile-status-row">
                <StatusBadge status={record.status || 'N/A'} />
                <span className="profile-program-tag">{label}</span>
              </div>
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
                <span className="p-field-label">Name</span>
                <span className="p-field-value">{display(record.name)}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Role</span>
                <span className="p-field-value">{label}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Department</span>
                <span className="p-field-value">{display(department)}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Official Email</span>
                <span className="p-field-value">{display(record.email)}</span>
              </div>

              <div className="p-field-item">
                <span className="p-field-label">Phone</span>
                <span className="p-field-value">{display(record.phone)}</span>
              </div>

              <div className="p-field-item field-span-full">
                <span className="p-field-label">Address</span>
                <span className="p-field-value">{display(record.address)}</span>
              </div>
            </div>
          </div>

          <div className="profile-section-card">
            <div className="section-card-title-row">
              <Lock size={18} className="text-primary" />
              <h3 className="section-card-title">Security & Role Governance</h3>
            </div>
            <p className="security-notice-text">
              Password changes are not available in this portal. Account roles are managed by an administrator.
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="Edit profile"
        subtitle="Update your name, phone, and address"
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

          <FormField label="Contact Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              disabled={isSaving}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProfile;
