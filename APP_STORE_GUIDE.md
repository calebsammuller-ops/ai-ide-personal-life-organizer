# LockIN Life Organizer - App Store Submission Guide

## Prerequisites Checklist

- [ ] Mac computer with macOS
- [ ] Xcode 15+ installed (free from Mac App Store)
- [ ] Apple Developer Account ($99/year) at [developer.apple.com](https://developer.apple.com)
- [ ] Your app deployed to a public URL (Vercel, etc.)

---

## Step 1: Deploy Your App

First, deploy your Next.js app to get a live URL:

### Option A: Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Option B: Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

After deploying, update `capacitor.config.ts` with your production URL:
```typescript
server: {
  url: 'https://your-app-name.vercel.app',  // Your deployed URL
}
```

---

## Step 2: Update iOS Project

After updating your config:
```bash
npx cap sync ios
```

---

## Step 3: Open in Xcode

```bash
npx cap open ios
```

This opens your project in Xcode.

---

## Step 4: Configure Xcode

### 4.1 Set Bundle Identifier
1. Select the project in the navigator (top item)
2. Select the "App" target
3. Go to "Signing & Capabilities" tab
4. Set Bundle Identifier: `com.lockin.lifeorganizer`
5. Select your Team (requires Apple Developer Account)

### 4.2 Add App Icons
1. In Xcode, open `Assets.xcassets`
2. Select `AppIcon`
3. Add your app icon images (various sizes needed)
4. Or use a tool like [AppIcon.co](https://appicon.co) to generate all sizes from one image

### 4.3 Configure Info.plist
Add these keys for iOS features:
- `NSCameraUsageDescription` - "Used to scan food items"
- `NSPhotoLibraryUsageDescription` - "Used to select photos"

---

## Step 5: Test Your App

### Run on Simulator
1. In Xcode, select an iPhone simulator from the device dropdown
2. Press Cmd+R or click the Play button
3. Test all features

### Run on Real Device
1. Connect your iPhone via USB
2. Select your device from the dropdown
3. Press Cmd+R to build and run
4. Trust the developer certificate on your iPhone (Settings > General > Device Management)

---

## Step 6: Prepare for App Store

### 6.1 Create App Store Connect Listing
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click "My Apps" > "+" > "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: LockIN Life Organizer
   - **Primary Language**: English
   - **Bundle ID**: com.lockin.lifeorganizer
   - **SKU**: lockin-life-organizer

### 6.2 App Information Required
- App description (up to 4000 characters)
- Keywords (up to 100 characters)
- Support URL
- Marketing URL (optional)
- Privacy Policy URL (required)

### 6.3 Screenshots Required
Take screenshots of your app at these sizes:
- 6.7" iPhone (1290 x 2796)
- 6.5" iPhone (1242 x 2688)
- 5.5" iPhone (1242 x 2208)

---

## Step 7: Archive & Submit

### 7.1 Create Archive
1. In Xcode, select "Any iOS Device" as the build target
2. Go to Product > Archive
3. Wait for archive to complete

### 7.2 Upload to App Store
1. In Organizer window, select your archive
2. Click "Distribute App"
3. Select "App Store Connect"
4. Follow the prompts to upload

### 7.3 Submit for Review
1. Go to App Store Connect
2. Select your app
3. Add the build you uploaded
4. Fill in all required information
5. Click "Submit for Review"

---

## App Store Review Guidelines

Make sure your app:
- [ ] Works without crashing
- [ ] Has a clear purpose and functionality
- [ ] Includes a privacy policy
- [ ] Does not contain placeholder content
- [ ] Works offline (or gracefully handles offline state)
- [ ] Uses iOS design patterns appropriately

---

## Estimated Timeline

1. **Setup & Configuration**: 1-2 hours
2. **Testing**: 2-4 hours
3. **App Store Connect Setup**: 1-2 hours
4. **Apple Review**: 1-7 days (varies)

---

## Quick Commands Reference

```bash
# Sync changes to iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios

# Update Capacitor
npm update @capacitor/core @capacitor/cli @capacitor/ios
```

---

## Troubleshooting

### "No signing certificate" error
- Make sure you have an Apple Developer account
- In Xcode: Preferences > Accounts > Add your Apple ID
- Let Xcode manage signing automatically

### App shows blank screen
- Check that your deployed URL is correct in `capacitor.config.ts`
- Ensure the URL is accessible from your device
- Check browser console for errors

### Build fails
- Clean build: Product > Clean Build Folder (Cmd+Shift+K)
- Delete derived data: ~/Library/Developer/Xcode/DerivedData

---

## Need Help?

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
