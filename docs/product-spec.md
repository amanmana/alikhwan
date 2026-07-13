# Product Specification: e-Kariah Al-Ikhwan

`e-Kariah Al-Ikhwan` is a mobile-first member management and directory web application designed for **Surau Al-Ikhwan** in Malaysia. It simplifies community directory search, membership registration, account claims for imported legacy members, and admin record reviews.

---

## 1. Target Audience & Mobile-First Approach
- **Demographics:** Members aged 18 to 90 years old. Many older users have limited technical expertise.
- **Form Factor:** 90% of usage is on mobile phones. Layouts must scale starting at **360px** viewport width up to desktop.
- **Language:** All user-facing text is in simple, friendly, and non-technical **Bahasa Melayu**.

---

## 2. Terminology & Translations (Bahasa Melayu)

| English Term | Malay Translation | Description / Context |
| :--- | :--- | :--- |
| Home | Utama | Main landing page |
| Directory / Member List | Senarai Ahli | Publicly searchable list of approved members |
| Register Member | Daftar Ahli | Multi-step sign-up form |
| Check Membership | Semak Keahlian | Public checking tool using IC/Phone (privacy-safe) |
| Claim Old Account | Tuntut Akaun | Credential creation for legacy members |
| Log In | Log Masuk | Member and Admin login |
| My Profile | Profil Saya | Logged-in member profile dashboard |
| Personal Information | Maklumat Peribadi | Name, IC, Birth Date |
| Contact Information | Maklumat Perhubungan | Phone, Address, General Area |
| Pending Verification | Menunggu Pengesahan | Record registered but not approved by Admin |
| Active Member | Ahli Aktif | Approved and active kariah member |
| Inactive | Tidak Aktif | Deactivated member record |
| Needs Review | Perlu Semakan | Flagged legacy record due to missing or invalid data |
| Save Changes | Simpan Perubahan | Form submit action |
| Request Submitted | Permohonan berjaya dihantar | Form completion message |
| No Records Found | Tiada rekod ditemui | Empty search query result |
| Please Check Input | Sila semak maklumat | Inline validation feedback |

---

## 3. Brand Identity & Visual Tokens

The application design is **calm, clean, welcoming, and respectful**, featuring a subtle Islamic geometric motif in decorative areas.

- **Primary Color:** `#0F766E` (Deep Teal - represents peace and nature)
- **Secondary Color:** `#14B8A6` (Muted Teal - highlights and secondary buttons)
- **Accent Color:** `#F59E0B` (Amber - alert warnings, status labels)
- **Background Color:** `#F8FAF7` (Off-white, soft green undertone - reduces glare)
- **Surface Color:** `#FFFFFF` (White cards/containers)
- **Primary Text:** `#17352F` (Very dark green-gray - high readability contrast)
- **Muted Text:** `#52645F` (Medium gray-green - secondary info)
- **Success State:** `#15803D` (Green - success messages, active status)
- **Danger State:** `#B91C1C` (Red - validation errors, reject actions)
- **Typography:** System font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) to ensure fast page loads without waiting for external web font downloads.

---

## 4. User Roles & Key Journeys

### A. Public Visitor (Pelawat)
1. **Daftar Sebagai Ahli:** Complete a 3-step wizard with personal info, contact info, and credentials. Auto-login upon completion and redirect to `/profil` (status: pending).
2. **Semak Keahlian & Tuntut Akaun:** Check if their legacy record exists using IC + phone number. If it matches, they proceed to `/tuntut-akaun` where they set a username/password.
3. **Senarai Ahli (Directory):** Type a name (minimum 2 chars) to search active members who have consented to be listed. Displays name, status label, and general area only.

### B. Registered Member (Ahli Berdaftar)
1. **Log Masuk:** Sign in with their username and password.
2. **Profil Saya:** View their own details. The IC number is masked by default (`******-**-1234`) and can be revealed by clicking a show/hide toggle.
3. **Kemas Kini Profil:** Change directory consent immediately. Any changes to name, IC, phone, or address create a pending "correction request" for Admin approval instead of overwriting the record directly.
4. **Tukar Kata Laluan:** Update password by providing the current password.

### C. Administrator (Pentadbir)
1. **Daftar Peranti (Device Enrollment):** Input the Worker secret magic keyword under `/admin/login` to authorize the browser profile. Sessions persist securely for up to 180 days.
2. **Urus Ahli (Manage Members):** Search members by name, full 12-digit IC, phone, status, or account state. Sort by name or registration date.
3. **Kelulusan (Approvals):** Review pending registrations, account claims, and profile correction requests. Approve or reject (requiring reasons).
4. **Log Audit:** View chronological system actions. Sensitive data is masked.
