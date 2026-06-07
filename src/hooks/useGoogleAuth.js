import { GoogleSignin, isCancelledResponse, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

const SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
];

let isConfigured = false;

function ensureGoogleConfigured() {
  if (isConfigured) return;

  GoogleSignin.configure({
    scopes: SCOPES,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || undefined,
  });

  isConfigured = true;
}

export async function signInWithGoogle({ forceAccountPicker = false } = {}) {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  if (forceAccountPicker) {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore sign-out failures before a fresh account picker attempt.
    }
  }

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    if (isCancelledResponse(response)) return null;
    throw new Error('Google sign-in was not completed.');
  }

  const tokens = await GoogleSignin.getTokens();
  return {
    accessToken: tokens.accessToken,
    email: response.data.user.email,
    user: response.data.user,
  };
}

export async function signOutGoogle() {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Best-effort cleanup only.
  }
}

export function getGoogleAuthErrorMessage(error) {
  if (!isErrorWithCode(error)) return 'Something went wrong. Please try again.';

  switch (error.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return '';
    case statusCodes.IN_PROGRESS:
      return 'Google sign-in is already in progress.';
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services is unavailable on this device.';
    default:
      return 'Google sign-in failed. Check the Google Cloud OAuth setup and try again.';
  }
}
