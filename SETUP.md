# Ghar Diary – one-time setup (about 10 minutes)

## 1. Create a free Firebase project
1. Go to https://console.firebase.google.com and sign in with your Google account.
2. **Create a project** → name it `ghar-diary` → you can turn off Google Analytics → **Create**.
   Stay on the free **Spark** plan; no card is needed.

## 2. Turn on email login
1. Left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → switch on **Enable** → **Save**.
3. **Settings** tab → **Authorized domains** → **Add domain** → type `YOUR-GITHUB-USERNAME.github.io` → Add.

## 3. Create the database
1. Left menu: **Build → Firestore Database → Create database**.
2. Location: **asia-south1 (Mumbai)** → Next → **Start in production mode** → Create.

## 4. Paste the security rules (this is what makes admin approval work)
1. In Firestore, open the **Rules** tab.
2. Delete everything, paste the full contents of `firestore.rules`, then click **Publish**.
   (If your admin email isn't `mrugraj321@gmail.com`, change it in that file AND in `firebase-config.js`.)

## 5. Connect the app
1. Click the gear icon → **Project settings** → scroll to **Your apps** → click the **</>** (Web) icon.
2. App nickname: `ghar-diary` → **Register app** (skip Hosting).
3. Copy the values inside `firebaseConfig = { ... }` into `firebase-config.js` in place of the `PASTE_...` text.
   These keys are safe to put on GitHub: the security rules protect the data.

## 6. Put it on GitHub Pages
1. Upload every file in this folder to the root of your repo (replace the old `index.html` and `sw.js`).
2. Repo **Settings → Pages → Deploy from a branch → main / (root)** → Save.
3. Your link: `https://YOUR-GITHUB-USERNAME.github.io/REPO-NAME/`

## 7. First login (admin)
1. Open the link in Safari → **Create an account** with the admin email.
2. Open the verification email (check spam) → tap the link → back in the app tap **I've verified**.
3. Share → **Add to Home Screen**.

## 8. Add family
- Send them the link. They open it in Safari, tap **Create an account**, and add it to their home screen.
- They'll see "Waiting for approval". In your **Users** tab tap **Approve**, and their app opens right away.
- **Remove** blocks someone at any time.

## Good to know
- Everyone's bills sync live to every approved phone and laptop. Each bill shows who added it.
- No signal? Entries save on the phone and sync when you're back online.
- Old phone-only bills: **Users/Account → Upload bills saved on this phone** (open the new app from the same home-screen icon as before).
- Want to try it before setup? Open the link with `?demo` on the end to see sample data.
- The free plan allows 50,000 reads and 20,000 writes a day, far more than a household uses.
