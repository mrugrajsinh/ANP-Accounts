// Firebase web config for ANP Accounts + admin email.
window.GHAR_CONFIG = {
  firebase: {
    apiKey: "AIzaSyAt-mRGnyqGGf3Pw1jp7budKYxv4KXw_xY",
    authDomain: "anp-accounts.firebaseapp.com",
    projectId: "anp-accounts",
    storageBucket: "anp-accounts.firebasestorage.app",
    messagingSenderId: "975679826238",
    appId: "1:975679826238:web:5793d66e23e9e4caa8a46f",
    measurementId: "G-SD1SRPX13X"
  },
  // The admin approves everyone else. Same email as in the Firestore rules.
  adminEmail: "mrugraj321@gmail.com",
  // Sender for lock-screen alerts (Cloudflare Worker)
  pushUrl: "https://anp-push.mrugraj321.workers.dev/"
};
