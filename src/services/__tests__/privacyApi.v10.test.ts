import { getPrivacySettings,patchPrivacySettings,postPrivacyExport,postPrivacyDeleteRequest } from '../privacyApi';
import { apiGet,apiPatch,apiPost } from '@/lib/api';
jest.mock('@/lib/api',()=>({ apiGet:jest.fn(),apiPatch:jest.fn(),apiPost:jest.fn() }));
test('privacy/export/deletion use one API prefix and bind the initiating account',()=>{
  getPrivacySettings('A');patchPrivacySettings({ saveHistory:false },'A');postPrivacyExport('A');postPrivacyDeleteRequest('A');
  expect(apiGet).toHaveBeenCalledWith('/v1/settings/privacy',undefined,{ expectedUserId:'A' });
  expect(apiPatch).toHaveBeenCalledWith('/v1/settings/privacy',{ saveHistory:false },{ expectedUserId:'A' });
  expect(apiPost).toHaveBeenCalledWith('/v1/settings/export',undefined,{ expectedUserId:'A' });
  expect(apiPost).toHaveBeenCalledWith('/v1/settings/delete-request',undefined,{ expectedUserId:'A' });
});
