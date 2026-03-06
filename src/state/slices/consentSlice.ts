import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

interface ConsentRecord {
  granted: boolean
  grantedAt: string | null
}

interface ConsentState {
  consents: Record<string, ConsentRecord>
  isLoading: boolean
  pendingConsentType: string | null
  showConsentModal: boolean
  hasFetched: boolean
}

const initialState: ConsentState = {
  consents: {},
  isLoading: false,
  pendingConsentType: null,
  showConsentModal: false,
  hasFetched: false,
}

export const fetchConsents = createAsyncThunk(
  'consent/fetchConsents',
  async () => {
    const response = await fetch('/api/consents')
    if (!response.ok) throw new Error('Failed to fetch consents')
    const data = await response.json()
    return data.data as Record<string, ConsentRecord>
  }
)

export const updateConsent = createAsyncThunk(
  'consent/updateConsent',
  async ({ consentType, granted }: { consentType: string; granted: boolean }) => {
    const response = await fetch('/api/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentType, granted }),
    })
    if (!response.ok) throw new Error('Failed to update consent')
    const data = await response.json()
    return data.data as { consentType: string; granted: boolean; grantedAt: string | null }
  }
)

export const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    requestConsent: (state, action: PayloadAction<string>) => {
      state.pendingConsentType = action.payload
      state.showConsentModal = true
    },
    dismissConsent: (state) => {
      state.pendingConsentType = null
      state.showConsentModal = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConsents.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchConsents.fulfilled, (state, action) => {
        state.isLoading = false
        state.consents = action.payload
        state.hasFetched = true
      })
      .addCase(fetchConsents.rejected, (state) => {
        state.isLoading = false
        state.hasFetched = true
      })
      .addCase(updateConsent.fulfilled, (state, action) => {
        state.consents[action.payload.consentType] = {
          granted: action.payload.granted,
          grantedAt: action.payload.grantedAt,
        }
        state.showConsentModal = false
        state.pendingConsentType = null
      })
  },
})

export const { requestConsent, dismissConsent } = consentSlice.actions

export const selectConsents = (state: RootState) => state.consent.consents
export const selectHasConsent = (consentType: string) => (state: RootState) =>
  state.consent.consents[consentType]?.granted === true
export const selectShowConsentModal = (state: RootState) => state.consent.showConsentModal
export const selectPendingConsentType = (state: RootState) => state.consent.pendingConsentType
export const selectConsentLoading = (state: RootState) => state.consent.isLoading
export const selectConsentHasFetched = (state: RootState) => state.consent.hasFetched

export default consentSlice.reducer
