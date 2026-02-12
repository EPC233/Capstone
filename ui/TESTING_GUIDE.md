# TypeScript Migration Testing Guide

## Quick Test Commands

### 1. Type Checking
```bash
npm run type-check
```
✅ Should pass with no errors

### 2. Build Test
```bash
npm run build
```
✅ Should build successfully (warnings about chunk sizes are normal)

### 3. Development Server
```bash
npm run dev
```
✅ Should start without errors

### 4. Linting (Optional)
```bash
npm run lint:check
```

### 5. Formatting (Optional)
```bash
npm run format:check
```

## Manual Testing Checklist

### Core Functionality
- [ ] **Authentication**
  - [ ] Login works
  - [ ] Logout works
  - [ ] Registration works
  - [ ] Password reset works

- [ ] **Dashboard**
  - [ ] Dashboard loads
  - [ ] Navigation works
  - [ ] User info displays correctly

### Course Management
- [ ] **Courses Page**
  - [ ] List of courses displays
  - [ ] Create new course works
  - [ ] Edit course works
  - [ ] Course images upload correctly

- [ ] **Course Detail Page**
  - [ ] Course details display
  - [ ] Modules list shows correctly
  - [ ] Manage modules modal works
  - [ ] Module ordering (drag & drop) works

- [ ] **Module Detail Page**
  - [ ] Module details display
  - [ ] Posts list shows correctly
  - [ ] Manage posts modal works
  - [ ] Post ordering (drag & drop) works
  - [ ] Edit module works (color picker, etc.)

### Post Management
- [ ] **Create/Edit Post**
  - [ ] Create new post works
  - [ ] Edit existing post works
  - [ ] Markdown editor works
  - [ ] File uploads work

### Quiz Functionality
- [ ] **Quiz Management**
  - [ ] Create quiz works
  - [ ] Edit quiz works
  - [ ] Add questions works
  - [ ] Edit questions works
  - [ ] Delete questions works

- [ ] **Quiz Taking**
  - [ ] Start quiz attempt works
  - [ ] Answer questions (all types: true/false, short answer, radio, checkbox)
  - [ ] Submit quiz works
  - [ ] Results display correctly
  - [ ] Score calculation is correct

### User Management
- [ ] **Users Page**
  - [ ] List of users displays
  - [ ] Create user works
  - [ ] Edit user works
  - [ ] User avatars display
  - [ ] View mode toggle (table/card) works

### Group Management
- [ ] **Groups Page**
  - [ ] List of groups displays
  - [ ] Create group works
  - [ ] Edit group works

- [ ] **Group Detail Page**
  - [ ] Group details display
  - [ ] Members list shows correctly
  - [ ] Invite user works
  - [ ] Add existing user works
  - [ ] Remove member works
  - [ ] View mode toggle (table/card) works
  - [ ] Member progress displays (if admin)
  - [ ] Add course to group works

### Progress Tracking
- [ ] **User Progress**
  - [ ] Mark posts as complete works
  - [ ] Progress percentages calculate correctly
  - [ ] Module progress displays
  - [ ] Course progress displays

### UI Components
- [ ] **Navigation**
  - [ ] Breadcrumbs work
  - [ ] Navbar works
  - [ ] Sidebar works
  - [ ] Links navigate correctly

- [ ] **Modals**
  - [ ] Edit Course Modal works
  - [ ] Edit Module Modal works
  - [ ] Edit Quiz Modal works
  - [ ] Manage Course Modules Modal works
  - [ ] Manage Module Posts Modal works

- [ ] **Forms**
  - [ ] All form inputs work
  - [ ] Validation works
  - [ ] File uploads work
  - [ ] Color picker works

## Browser Console Testing

1. Open browser DevTools (F12)
2. Check Console tab for:
   - ❌ No TypeScript errors
   - ❌ No runtime errors
   - ⚠️ Warnings are usually okay (deprecation notices, etc.)

3. Check Network tab:
   - ✅ API calls succeed
   - ✅ No 404 errors for assets

## Common Issues to Watch For

### Type Errors
- If you see TypeScript errors in the console, run `npm run type-check` to see details
- Check that all imports are using `.tsx` or `.ts` files, not `.jsx` or `.js`

### Runtime Errors
- Check browser console for JavaScript errors
- Check Network tab for failed API requests
- Verify environment variables are set correctly

### Build Issues
- If build fails, check for:
  - Missing type definitions
  - Incorrect import paths
  - Type mismatches

## Testing Specific Converted Components

### Recently Converted (Test These First!)
1. **EditCourseModal** - Edit a course, change title/description, upload image
2. **EditModuleModal** - Edit a module, change color, title, description
3. **EditQuizModal** - Edit a quiz, change name, description, settings
4. **ManageCourseModulesModal** - Add/remove/reorder modules in a course
5. **ManageModulePostsModal** - Add/remove/reorder posts in a module
6. **QuizTaking** - Take a quiz, answer questions, submit, view results

## Performance Testing

- [ ] Page load times are reasonable
- [ ] No memory leaks (check with browser DevTools)
- [ ] Large lists render without lag
- [ ] Images load correctly

## Next Steps After Testing

1. ✅ If all tests pass: Proceed to Phase 11 (Update ESLint config)
2. ❌ If issues found: Fix type errors and retest
3. 📝 Document any known issues or limitations

