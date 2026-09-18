export interface UploadRef {
  /** Client-generated id so other records (e.g. a logo placement) can reference this specific upload. */
  id?: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface DesignLogoPlacement {
  /** References an UploadRef.id from the design project's uploaded artwork. */
  uploadId: string;
  /** Which product view (front/back/left-sleeve/wrap/...) this logo sits on. */
  viewId: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  zIndex: number;
}

export interface DesignProjectSummary {
  productSlug: string;
  productName: string;
  variantLabel: string;
  colorLabel: string;
  colorHex: string;
  quantity: number;
  logos: DesignLogoPlacement[];
  /** Generated composite preview images, one per product view, uploaded like any other artwork. */
  mockupUploads: UploadRef[];
}

export interface EnquirySubmission {
  submissionId?: string;
  id?: string;
  type: 'standard' | 'trade';
  fullName: string;
  company?: string;
  email: string;
  role: string;
  projectType: string;
  preferredMaterial?: string;
  estimatedQuantity?: string;
  targetTimeline?: string;
  businessType?: string;
  orderVolume?: string;
  honeypot?: string;
  projectDescription: string;
  fileUploads: UploadRef[];
  sourcePage: string;
  leadTags: string[];
  createdAt?: string;
  /** Present when this enquiry originated from the Product Customization Studio. */
  designProject?: DesignProjectSummary;
}

export interface TradeApplication {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  role: string;
  projectType: string;
  estimatedQuantity: string;
  materialPreference?: string;
  timeline?: string;
  notes?: string;
  specSheetUploads: UploadRef[];
  leadTags: string[];
  createdAt?: string;
}
