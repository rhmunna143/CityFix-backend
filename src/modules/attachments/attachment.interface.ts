export interface IUploadAttachmentPayload {
  complaintId: string;
  stage: 'SUBMISSION' | 'RESOLUTION';
  fileType: 'IMAGE' | 'DOCUMENT';
}
