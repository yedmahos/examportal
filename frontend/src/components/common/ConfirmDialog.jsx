import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './Modal.css';

const ConfirmDialog = ({
  isOpen = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary', // 'primary' | 'danger' | 'warning'
  type = 'warning', // 'warning' | 'danger' | 'info'
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="confirm-icon icon-danger" size={28} />;
      case 'info':
        return <Info className="confirm-icon icon-info" size={28} />;
      default:
        return <AlertTriangle className="confirm-icon icon-warning" size={28} />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      className="confirm-modal"
      footer={
        <div className="confirm-footer-btns">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="confirm-content">
        <div className="confirm-icon-wrap">
          {getIcon()}
        </div>
        <div className="confirm-text">
          <h4 className="confirm-title">{title}</h4>
          <p className="confirm-desc">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
