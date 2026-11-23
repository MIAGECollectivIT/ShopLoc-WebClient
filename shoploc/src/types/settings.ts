export interface CitizenCardEmailSettingResponse {
  email: string;
  defaultEmail: string;
  isCustomized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  // Backward/forward compatibility aliases
  effectiveEmail?: string;
  customized?: boolean;
}

export interface CitizenCardEmailSettingUpdateRequest {
  email: string;
}
