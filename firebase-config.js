// ============================================================
//  STEP: paste your Firebase web config + admin email here.
//  (Firebase console → Project settings → Your apps → Web app → Config)
// ============================================================
window.GHAR_CONFIG = {
  firebase: {
    apiKey: "PASTE_API_KEY",
    authDomain: "PASTE_PROJECT.firebaseapp.com",
    projectId: "PASTE_PROJECT_ID",
    storageBucket: "PASTE_PROJECT.appspot.com",
    messagingSenderId: "PASTE_SENDER_ID",
    appId: "PASTE_APP_ID"
  },
  // The admin approves everyone else. Use the SAME email in firestore.rules.
  adminEmail: "mrugraj321@gmail.com"
};
