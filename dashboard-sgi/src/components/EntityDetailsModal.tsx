import { Modal } from './ui/Modal';
import { AttachmentsSection } from './AttachmentsSection';
import { CommentsSection } from './CommentsSection';
import { ApprovalSection } from './ApprovalSection';
import type { Attachment, Comment, Approval } from '../services/api';

interface EntityDetailsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entityType: Attachment['entityType'] | Comment['entityType'] | Approval['entityType'];
  entityId: string;
}

export const EntityDetailsModal = ({
  open,
  onClose,
  title,
  entityType,
  entityId,
}: EntityDetailsModalProps) => {
  if (!entityId) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="large">
      <div className="space-y-6">
        <ApprovalSection entityType={entityType as Approval['entityType']} entityId={entityId} />
        <AttachmentsSection entityType={entityType as Attachment['entityType']} entityId={entityId} />
        <CommentsSection entityType={entityType as Comment['entityType']} entityId={entityId} />
      </div>
    </Modal>
  );
};

