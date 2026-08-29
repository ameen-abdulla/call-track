# Call Track — User Guide

> This guide is for the two people who use the app: the **Secretary** (who makes calls) and the **Admin** (who manages contacts and monitors progress). No technical knowledge is needed.

---

## Before You Start — First-Time Setup (Admin only, done once)

1. Open a terminal and go to the `call-track` folder on the computer
2. Run these three commands one by one:
   ```
   npm run db:push
   npm run db:seed
   npm run build
   ```
3. Then every day to start the app, just run:
   ```
   npm run start
   ```
4. Open your browser and go to **https://calltrack.flexibook.ai**

> **The app is hosted at [https://calltrack.flexibook.ai](https://calltrack.flexibook.ai)** — accessible from any device on any network.

---

## Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@calltrack.local` | `admin123` |
| Secretary | `secretary@calltrack.local` | `secretary123` |

> ⚠️ **Change these passwords** once you are set up. Ask your IT person to update them in the database.

---

## Installing the App on Your Phone (Optional but recommended)

The app works as a mobile app you can install on your phone's home screen:

1. Open the app URL in **Chrome** (Android) or **Safari** (iPhone)
2. Tap the **Share** button → "Add to Home Screen"
3. The app icon will appear on your home screen just like a real app

---
---

# 📞 Secretary Guide

*You are the person who makes the calls. The Admin assigns contacts to you and tells you what to discuss. Your job is to call them, record what happened, and schedule the next step.*

---

## Logging In

1. Go to the app URL in your browser
2. Make sure **Secretary** is selected (it should be by default)
3. Enter your email and password
4. Tap **Sign in as Secretary**

You will land on your personal **Dashboard**.

---

## Your Dashboard — 3 Tabs

Your dashboard has three sections you can switch between by tapping the tabs at the top.

---

### Tab 1: My Queue

This is your main working list — contacts the Admin has assigned to you that you haven't called yet.

**Urgency Summary Strip & Sort Button:**
At the top of your queue, you will see a colored breakdown of your queue:
- **Red (Urgent)**: Assigned more than 72 hours ago — contact immediately!
- **Orange (Pending)**: Assigned 24 to 72 hours ago — approaching SLA.
- **Green (Fresh)**: Assigned within the last 24 hours.
- **Attempted**: A call link has already been tapped for this lead.
- **Sort Toggle**: Tap the **"Urgent First"** / **"Priority Sort"** button to sort your leads by urgency (most overdue first) or by default priority.

**What you'll see on each card:**
- The contact's name and phone number
- An **Urgency Badge** (e.g. *Fresh*, *Pending: 30h*, *Urgent: 74h*, or *Attempted*) — hover or tap to see exact details
- Their company (if added)
- A **blue box** showing the **Topic to discuss** — this is what the Admin wants you to talk about on this call. Read this before calling!
- A green **Call** button

**To start a call:**
1. Read the topic in the blue box
2. Tap the green **Call** button on the contact's card
3. You will go to the **Call & Feedback screen** for that contact

**Quick shortcut:** The **"Next Lead in Queue"** card at the top shows the highest priority lead and its urgency badge. Tap **Start Call Session** to begin immediately.

---

### Tab 2: Today's Calls

This shows activities that were scheduled for today specifically — things you or the Admin set as a follow-up call due today.

- Same layout as the Queue, with the scheduled time shown
- Tap **Call** to open the Call & Feedback screen

---

### Tab 3: Follow-ups

This shows contacts where a follow-up is due or overdue.

- Items with a red **"Overdue"** badge are past their scheduled date — handle these first
- Tap **Call** to open the Call & Feedback screen for that contact

---

## The Call & Feedback Screen

This is where you record what happened during a call.

### Step 1 — Make the call
- Tap the big green **"Call [phone number]"** button — this opens your phone's dialer automatically
- The **Topic to discuss** is shown clearly in a blue box — keep it in mind during the call

### Step 2 — Record the outcome
After the call, select what happened (tap one chip):

| Outcome | When to use it |
|---|---|
| **Connected** | You spoke to them |
| **No Answer** | Phone rang but they didn't pick up |
| **Busy** | Line was busy |
| **Wrong Number** | Incorrect number |
| **Not Interested** | They said they don't want to be contacted |
| **Callback Requested** | They asked you to call back later |

### Step 3 — Add feedback (only if Connected)
If you selected **Connected**, a feedback section appears:

- **Interest Level**: Choose Hot 🔥 (very interested), Warm ☀️ (somewhat interested), or Cold 🧊 (not very interested)
- **Notes**: Type anything important from the conversation — what they said, what they asked, any specific details

### Step 4 — Schedule next activity
- Choose the type: **Call**, **Email**, or **Meeting**
- The date defaults to 2 days from now — change it if needed by tapping the date field
- This creates a reminder that will appear in your Follow-ups tab on the due date

### Step 5 — Save
Tap the blue **Save Call Record** button. The app saves everything and takes you back to your dashboard.

---

## Call History

At the bottom of the Call & Feedback screen, you'll see **"Call History"** — tap it to expand and see all past calls with this contact, including previous notes and outcomes.

---

## Notifications (Bell Icon 🔔)

The bell icon in the top right shows your notifications:
- **Red number badge** = you have unread notifications
- Tap the bell to see them
- Notifications include: new contact assignments from the Admin, reminders about overdue follow-ups
- Tap a notification to mark it as read

---

## Secretary Daily Workflow

```
Morning:
  1. Open app → check Follow-ups tab for anything overdue
  2. Check Today's Calls tab for scheduled calls
  3. Work through My Queue for new assignments

During the day:
  4. Tap Call → dial → come back to app → record outcome
  5. Set next activity date before saving
  6. Check notification bell for any Admin reminders

End of day:
  7. Make sure all calls are logged
  8. Any overdue items flagged in red need attention first tomorrow
```

---
---

# 🛠️ Admin Guide

*You manage the contacts, assign work to the Secretary, and monitor progress. You don't need to be on the same computer as the Secretary — you can access the app from any browser on the network.*

---

## Logging In

1. Go to the app URL
2. Tap **Admin** on the toggle at the top
3. Enter your email and password
4. Tap **Sign in as Admin**

You will land on the **Admin Dashboard**.

---

## Admin Dashboard — KPI Strip

At the top you'll see four numbers at a glance:

| Metric | What it means |
|---|---|
| **Total Contacts** | All contacts in the system |
| **Calls Today** | Calls logged by all secretaries today |
| **Conversion Rate** | % of contacts marked as "converted" |
| **Overdue Follow-ups** | Activities past their due date |

---

## Admin Dashboard — 3 Tabs

---

### Tab 1: Contacts

Your main view of all contacts in the system.

**Search and filter:**
- Type in the search box to find contacts by name, company, or phone
- Use the status dropdown to filter: New, Queued, Contacted, Follow Up, Converted, Lost

**Contact status explained:**

| Status | Meaning |
|---|---|
| **New** | Just added, not yet assigned |
| **Queued** | Assigned to Secretary, waiting to be called |
| **Contacted** | Secretary has spoken to them |
| **Follow Up** | A follow-up has been scheduled |
| **Converted** | Became a customer |
| **Lost** | No longer interested |

**Adding a contact:**
1. Tap **Add** (the blue button with a person icon)
2. Fill in Name and Phone (required), plus any other details
3. You can add a **Topic to discuss** right when creating the contact
4. Tap **Add Contact**

**Importing contacts from Excel/CSV:**
1. In Excel, save your file as **CSV** (File → Save As → CSV)
2. Make sure columns are named: `name`, `phone`, `email`, `company`, `source`
3. Tap the **CSV** button in the app
4. Select your file
5. The app will import all rows with a name and phone number

**Assigning a contact to the Secretary:**
1. Find the contact in the list
2. Tap the **Assign** button (purple, on the right)
3. Select the Secretary from the dropdown
4. Type the **Topic to discuss** — this is what you want them to talk about on the call
5. Tap **Assign Contact**

The Secretary will receive a notification immediately and the contact will appear in their Queue.

**Viewing a contact's full history:**
- Tap anywhere on the contact's name/card (not the Assign button)
- A panel opens showing all details: phone, email, company, status, topic, and full call history with all notes

---

### Tab 2: Overdue

This shows all follow-up activities that are past their due date across all secretaries.

Each row shows:
- The contact's name and phone
- The type of activity (call/email/meeting) and when it was due
- Which secretary it's assigned to

**Sending a reminder:**
- Tap the **Remind** button (orange bell icon) on any row
- The Secretary instantly gets a notification in their app
- Use this when something is overdue and the Secretary hasn't acted on it

---

### Tab 3: Performance & Analytics

A comprehensive view of team productivity and pipeline health:
- **Lead Outreach Urgency Meter**: Monitors response times for assigned leads awaiting first outreach. Shows **Critical (>72h)**, **Pending (24–72h)**, **Fresh (<24h)**, and **Attempted** outreach counts, along with a per-caller progress breakdown. Click any card to drill down into those contacts.
- **Top KPIs**: Calls logged today, conversion rate, total prospects, and follow-ups due.
- **Caller Workload Table**: Workload, connected call rate, and verified call percentages per caller.

---

## Admin Daily Workflow

```
Morning:
  1. Open app → check KPI strip and the Lead Outreach Urgency Meter in Analytics
  2. Check for Critical (>72h) leads: reassign to an available caller if one caller is bottlenecked
  3. Go to Overdue tab → send reminders for anything critical
  4. Add or import new contacts from leads received

During the day:
  5. Assign new contacts: Contacts tab → Assign → set topic
  6. Check KPI strip — Calls Today should be going up
  7. Monitor Overdue tab and send reminders as needed

End of day/week:
  8. Filter Contacts by status and check Urgency Badges across the team
  9. Check Conversion Rate trend and sales funnel drop-offs
  10. Add any new contacts for tomorrow's queue
```

---

## Admin Tips

### Writing good topics
The topic field is what the Secretary reads before calling. Be specific:
- ❌ Bad: "Talk to them about our product"
- ✅ Good: "Follow up on the demo we sent Tuesday — ask if they have questions and try to get a meeting scheduled for next week"

### Understanding the pipeline flow
```
New → [Admin assigns] → Queued → [Secretary calls] → Contacted
     → [if follow-up needed] → Follow Up → [Secretary calls again]
     → [if successful] → Converted
     → [if rejected] → Lost
```

### CSV import format
Your CSV file's first row must have these exact column names:
```
name,phone,email,company,source
Ahmed Ali,+971501234567,ahmed@example.com,ABC Trading,website
```
Columns `email`, `company`, and `source` are optional but `name` and `phone` are required for each row.

---

## Common Questions

**Q: The Secretary says they can't see a contact I assigned.**
A: Check that you used the Assign button and selected the Secretary. The contact's status should show "Queued". If it still shows "New", the assignment didn't complete.

**Q: Where do I see the notes the Secretary wrote after a call?**
A: Click on the contact's name in the Contacts tab. The full call history with all notes appears in the panel that opens.

**Q: A follow-up is showing as overdue but the Secretary says they handled it.**
A: The Secretary needs to log the call in the app. When they tap Save on the Call & Feedback screen, it creates a new activity and updates the contact status. If they made the call but didn't log it in the app, it will stay overdue.

**Q: How do I add a second secretary in the future?**
A: Ask your IT person to run this command, replacing the details:
```
# In the call-track folder, open prisma studio:
npm run db:studio
```
Or they can add the new user directly through the database. The system is designed to support multiple secretaries without any code changes.

**Q: The app isn't starting.**
A: Make sure you ran `npm run start` in the `call-track` folder. The app must be running on the computer for anyone to access it. If the computer restarted, you need to run `npm run start` again.

---

## Security Reminder

> ⚠️ Change the default passwords before real use. The default passwords (`admin123` and `secretary123`) are only for initial testing. Ask your IT person to update them before the Secretary starts making real calls with client data.
