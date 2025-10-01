# Browser Extension Installation Guide

## Overview

The Pensive Index Browser Extension enables seamless story submission directly from fanfiction websites. This guide covers installation, setup, and usage across supported browsers and platforms.

## System Requirements

### Supported Browsers
- **Chrome**: Version 88+ (Recommended)
- **Edge**: Version 88+ (Chromium-based)
- **Firefox**: Version 85+ (Limited support)
- **Opera**: Version 74+ (Chromium-based)

### Supported Websites
- **Archive of Our Own** (archiveofourown.org)
- **FanFiction.Net** (fanfiction.net)
- **Wattpad** (wattpad.com) - *Coming Soon*
- **Additional Sites** - *Planned for future releases*

### Operating Systems
- **Windows**: 10, 11
- **macOS**: 10.15+
- **Linux**: Ubuntu 18.04+, other distributions
- **Chrome OS**: Version 88+

## Installation Methods

### Method 1: Chrome Web Store (Recommended)

1. **Visit Chrome Web Store**
   ```
   https://chrome.google.com/webstore/detail/the-pensive-index/[extension-id]
   ```

2. **Install Extension**
   - Click "Add to Chrome"
   - Confirm permissions when prompted
   - Wait for installation to complete

3. **Verify Installation**
   - Look for the Pensive Index icon in your toolbar
   - Icon should appear as 📚 or the Pensive Index logo

### Method 2: Manual Installation (Developer Mode)

#### For Chrome/Edge:

1. **Download Extension Package**
   ```
   https://github.com/your-org/the-pensive-index/releases/latest
   ```

2. **Enable Developer Mode**
   - Open `chrome://extensions/` or `edge://extensions/`
   - Toggle "Developer mode" in top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked"
   - Select the downloaded extension folder
   - Confirm installation

4. **Pin Extension** (Optional)
   - Click the puzzle piece icon in toolbar
   - Find "The Pensive Index" and click pin icon

#### For Firefox:

1. **Download Firefox Add-on**
   ```
   https://addons.mozilla.org/addon/the-pensive-index/
   ```

2. **Install Add-on**
   - Click "Add to Firefox"
   - Grant requested permissions
   - Restart browser if required

### Method 3: Enterprise Deployment

#### Group Policy Installation (Windows)
```powershell
# Add to Chrome Enterprise Policy
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist" `
  -Name "1" -Value "extension-id;https://clients2.google.com/service/update2/crx"
```

#### macOS Enterprise Installation
```bash
# Using configuration profile
sudo defaults write /Library/Preferences/com.google.Chrome ExtensionInstallForcelist -array-add "extension-id;https://clients2.google.com/service/update2/crx"
```

## Initial Setup

### First Launch Configuration

1. **Open Extension**
   - Click the Pensive Index icon in your browser toolbar
   - The setup wizard will appear

2. **Account Setup**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 🎉 Welcome to The Pensive Index Extension!                 │
   │                                                             │
   │ Let's get you set up for seamless story submissions.       │
   │                                                             │
   │ Email Address (for notifications):                          │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ your.email@example.com                                  │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │                                                             │
   │ Default Fandom (optional):                                  │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ ▼ Select your most-read fandom...             │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │                                                             │
   │ [Continue Setup] [Skip for Now]                            │
   └─────────────────────────────────────────────────────────────┘
   ```

3. **Permission Configuration**
   - Review requested permissions
   - Grant access to fanfiction websites
   - Configure notification preferences

4. **Test Installation**
   - Navigate to a supported fanfiction site
   - The extension icon should activate
   - Test story parsing functionality

### Permission Settings

#### Required Permissions
- **Active Tab**: Access current page content for story parsing
- **Storage**: Save user preferences and cached data
- **Background**: Process submissions and sync with server

#### Optional Permissions
- **Notifications**: Desktop notifications for submission updates
- **Bookmarks**: Integration with browser bookmarks (future feature)
- **History**: Usage analytics (opt-in only)

## Usage Guide

### Basic Story Submission

1. **Navigate to Story**
   - Go to any story page on supported sites
   - Extension icon will show active state

2. **Open Extension Popup**
   - Click the Pensive Index icon
   - Story information will be automatically parsed

3. **Review Parsed Data**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 📖 Submit Story: "The Time Turner's Dilemma"               │
   │                                                             │
   │ Story Information (Auto-detected):                          │
   │ Title: The Time Turner's Dilemma                           │
   │ Author: J.K.Rowling2024                                    │
   │ URL: https://archiveofourown.org/works/123456              │
   │                                                             │
   │ 📝 Edit if needed                                          │
   │ ✅ Information looks correct                               │
   └─────────────────────────────────────────────────────────────┘
   ```

4. **Select Fandom and Tags**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ Fandom:                                                     │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ ▼ Harry Potter - J. K. Rowling              │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │                                                             │
   │ Tags (comma-separated):                                     │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ time-travel, hermione/harry, angst, fix-it             │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │                                                             │
   │ 💡 Tip: Use specific tags for better discoverability      │
   └─────────────────────────────────────────────────────────────┘
   ```

5. **Submit Story**
   - Review all information for accuracy
   - Agree to submission terms
   - Click "Submit Story"
   - Receive confirmation with submission ID

### Advanced Features

#### Bulk Submission Mode
```
For submitting multiple stories in a series:

┌─────────────────────────────────────────────────────────────┐
│ 📚 BULK SUBMISSION MODE                                     │
│                                                             │
│ Detected Series: "Time Turner Chronicles"                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Chapter 1: The Beginning                              │ │
│ │ ☑ Chapter 2: The Discovery                              │ │
│ │ ☑ Chapter 3: The Consequences                           │ │
│ │ ☐ Chapter 4: The Resolution                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Apply same tags to all: ☑                                  │
│ Same fandom for all: ☑                                     │
│                                                             │
│ [Submit All Selected] [Individual Review]                   │
└─────────────────────────────────────────────────────────────┘
```

#### Custom Parsing Rules
```
For advanced users, create custom parsing rules:

┌─────────────────────────────────────────────────────────────┐
│ ⚙️ CUSTOM PARSING SETTINGS                                  │
│                                                             │
│ Site: archiveofourown.org                                   │
│                                                             │
│ Title Selector:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ h2.title.heading                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Author Selector:                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ a[rel="author"]                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Test Selectors] [Save Custom Rules] [Reset to Default]    │
└─────────────────────────────────────────────────────────────┘
```

### Submission Tracking

#### Track Submission Status
1. **Open Extension Popup**
2. **Click "View Submissions"**
3. **Monitor Progress**

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 YOUR SUBMISSIONS                                         │
│                                                             │
│ Recent Submissions:                                         │
│                                                             │
│ ✅ "The Time Turner's Dilemma"                            │
│    Status: Approved | Submitted: 3 days ago               │
│    📧 Notification sent                                    │
│                                                             │
│ 🔄 "Hermione's Secret Mission"                            │
│    Status: Under Review | Submitted: 1 day ago            │
│    👤 Assigned to: Alice Johnson                           │
│                                                             │
│ ⏳ "Harry's Hidden Heritage"                              │
│    Status: Pending | Submitted: 2 hours ago               │
│    📍 Queue Position: #7                                   │
│                                                             │
│ [View All] [Refresh Status]                                │
└─────────────────────────────────────────────────────────────┘
```

## Site-Specific Instructions

### Archive of Our Own (AO3)

#### Supported Pages
- **Individual Work Pages**: `/works/[id]`
- **Series Pages**: `/series/[id]`
- **Collection Pages**: `/collections/[name]`

#### Parsed Information
- Story title and author
- Complete tag list (fandom, characters, relationships, additional tags)
- Work summary/description
- Word count and chapter information
- Rating and warning tags
- Publication and update dates

#### AO3-Specific Features
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 AO3 ENHANCED PARSING                                     │
│                                                             │
│ Detected Information:                                       │
│ • Fandom: Harry Potter - J. K. Rowling                    │
│ • Rating: Teen And Up Audiences                            │
│ • Warnings: No Archive Warnings Apply                     │
│ • Characters: Harry Potter, Hermione Granger              │
│ • Relationships: Hermione Granger/Harry Potter            │
│ • Additional Tags: Time Travel, Fix-It, Angst             │
│                                                             │
│ • Word Count: 45,230                                       │
│ • Chapters: 12/15                                          │
│ • Status: Work in Progress                                 │
│                                                             │
│ ✨ All tags automatically imported and categorized         │
└─────────────────────────────────────────────────────────────┘
```

### FanFiction.Net (FFNet)

#### Supported Pages
- **Story Pages**: `/s/[id]/[chapter]/[title]`
- **Author Profile Pages**: `/u/[id]/[username]`

#### Parsed Information
- Story title and author
- Fandom information
- Basic story statistics
- Chapter navigation
- Story description (when available)

#### FFNet-Specific Handling
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 FFNET PARSING ASSISTANCE                                │
│                                                             │
│ Detected Information:                                       │
│ • Title: The Time Turner's Dilemma                        │
│ • Author: JKRowlingFan2024                                │
│ • Fandom: Harry Potter                                     │
│ • Description: [Parsed from story summary]                │
│                                                             │
│ ⚠️ Manual Tag Entry Required:                              │
│ FFNet doesn't use detailed tagging. Please add            │
│ appropriate tags based on story content:                   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ time-travel, hermione/harry, angst, adventure          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 💡 Review our tagging guidelines for best practices       │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Common Installation Issues

#### Extension Not Loading
```
Problem: Extension icon appears grayed out or inactive

Solutions:
1. Check browser compatibility (Chrome 88+, Firefox 85+)
2. Verify extension is enabled in browser settings
3. Clear browser cache and reload pages
4. Disable conflicting extensions temporarily
5. Restart browser and try again
```

#### Permission Errors
```
Problem: "Access denied" or permission-related errors

Solutions:
1. Review and re-grant extension permissions
2. Check if site is in supported list
3. Disable other extensions that may interfere
4. Clear extension data and reconfigure
5. Try incognito/private mode to test
```

#### Parsing Issues
```
Problem: Story information not detected correctly

Solutions:
1. Ensure you're on a story page (not search/browse)
2. Wait for page to fully load before opening extension
3. Check if site layout has changed recently
4. Try refreshing the page
5. Report parsing issues through extension feedback
```

### Performance Issues

#### Slow Loading
- **Check Internet Connection**: Verify stable connection
- **Clear Extension Data**: Reset cached information
- **Update Extension**: Ensure you have latest version
- **Browser Resources**: Close unnecessary tabs and extensions

#### Memory Usage
- **Monitor Extension Impact**: Check browser task manager
- **Clear Storage**: Remove old cached data
- **Restart Browser**: Fresh start can resolve memory leaks
- **Report Issues**: Contact support for persistent problems

### Error Messages

#### Common Error Codes
```
E001: Network Connection Error
→ Check internet connection and try again

E002: Site Parsing Failed
→ Page format not recognized, report to developers

E003: Server Communication Error
→ Temporary server issue, retry in a few minutes

E004: Authentication Failed
→ Re-enter email address in extension settings

E005: Invalid Story URL
→ Navigate to a supported story page
```

#### Debugging Mode
```
Enable debugging for detailed error information:

1. Right-click extension icon
2. Select "Inspect popup" (Chrome/Edge)
3. Check console tab for detailed errors
4. Include console output in bug reports
```

## Updates and Maintenance

### Automatic Updates
- **Chrome Web Store**: Updates installed automatically
- **Manual Installs**: Check GitHub releases for updates
- **Enterprise**: Updates through managed deployment

### Version History
- **Check Current Version**: Right-click extension → "Manage extensions"
- **Release Notes**: Available on GitHub and extension store
- **Rollback**: Instructions for reverting problematic updates

### Data Backup
```
Extension data is automatically synced across devices when you're
signed into your browser account. Manual backup options:

1. Export Settings:
   Extension Settings → Advanced → Export Configuration

2. Submission History:
   Your Submissions → Export → CSV/JSON format

3. Custom Rules:
   Parsing Settings → Export → Save as .json file
```

## Privacy and Security

### Data Collection
- **Minimal Data**: Only story URLs and submission metadata
- **No Personal Browsing**: Extension only activates on supported sites
- **Secure Transmission**: All data encrypted in transit
- **User Control**: Full control over data sharing preferences

### Permissions Explained
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 PERMISSION BREAKDOWN                                     │
│                                                             │
│ "Read and change data on fanfiction sites"                │
│ → Required to parse story information from pages           │
│                                                             │
│ "Store unlimited client-side data"                         │
│ → Cache story data and user preferences locally            │
│                                                             │
│ "Communicate with cooperating websites"                     │
│ → Submit stories to The Pensive Index servers             │
│                                                             │
│ "Display notifications"                                     │
│ → Show submission status updates (optional)                │
└─────────────────────────────────────────────────────────────┘
```

### Security Best Practices
- **Keep Extension Updated**: Install security patches promptly
- **Review Permissions**: Regularly check granted permissions
- **Report Suspicious Activity**: Contact support for security concerns
- **Use Official Sources**: Only install from official stores/repositories

## Support and Feedback

### Getting Help

#### Documentation
- **User Guide**: Complete usage instructions and tips
- **FAQ**: Frequently asked questions and solutions
- **Video Tutorials**: Step-by-step video guides
- **Community Forums**: User discussion and peer support

#### Contact Options
- **Email Support**: extension-support@pensiveindex.com
- **GitHub Issues**: Bug reports and feature requests
- **Community Discord**: Real-time chat and support
- **Feedback Form**: Built into extension settings

### Feature Requests
```
Have an idea for improving the extension?

1. Check existing feature requests on GitHub
2. Submit detailed request with use case
3. Participate in community voting
4. Beta test new features when available
```

### Contributing
- **Beta Testing**: Test pre-release versions
- **Translation**: Help translate to other languages
- **Documentation**: Improve guides and tutorials
- **Code Contributions**: Submit pull requests on GitHub

## Appendix

### Browser-Specific Notes

#### Chrome/Chromium
- Best performance and feature support
- Automatic updates through Web Store
- Full API compatibility

#### Firefox
- Limited Manifest V3 support
- Some features may be unavailable
- Manual update process required

#### Edge
- Full compatibility with Chrome extensions
- Enterprise deployment support
- Integrated with Microsoft accounts

#### Safari
- Not currently supported
- Planned for future development
- Different architecture requirements

### Keyboard Shortcuts
```
Default Shortcuts (configurable):
• Ctrl+Shift+P (Cmd+Shift+P on Mac): Open extension popup
• Ctrl+Shift+S (Cmd+Shift+S on Mac): Quick submit current page
• Escape: Close extension popup
```

### Advanced Configuration
```json
{
  "autoSubmit": false,
  "defaultTags": ["community-submitted"],
  "notificationLevel": "all",
  "parseTimeout": 5000,
  "retryAttempts": 3,
  "customSelectors": {
    "archiveofourown.org": {
      "title": "h2.title",
      "author": "a[rel='author']"
    }
  }
}
```