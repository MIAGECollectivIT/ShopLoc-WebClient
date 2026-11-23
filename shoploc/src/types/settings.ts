export interface CitizenCardEmailSettingResponse {
  configuredEmail: string | null;
  effectiveEmail: string;
  defaultEmail: string;
  customized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CitizenCardEmailSettingUpdateRequest {
  email: string;
}
