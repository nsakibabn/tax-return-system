# Bangladesh Tax Return Management System
# সম্পূর্ণ System Design Document

**Version:** 1.0  
**Assessment Year:** 2026-27 (Income Year 2025-26)  
**Technology:** Node.js + Express.js + MongoDB + JWT  
**Author:** Software Architecture Design

---

# অধ্যায় ১: System Overview

## ১.১ System কী করবে?

```
┌──────────────────────────────────────────────────────────────────────┐
│            Bangladesh Tax Return Management System                   │
│                                                                      │
│  TARGET USERS:                                                       │
│  ├── Salaried Employee   → বেতনভোগী কর্মী                          │
│  ├── Business Owner      → ব্যবসায়ী                                 │
│  ├── Freelancer          → ফ্রিল্যান্সার                            │
│  ├── Property Owner      → সম্পত্তি মালিক                           │
│  └── Admin               → System পরিচালক                           │
│                                                                      │
│  CORE VALUE:                                                         │
│  ব্যবহারকারী তার সব Income, TDS, Investment তথ্য দেবেন,            │
│  System স্বয়ংক্রিয়ভাবে বাংলাদেশের NBR নিয়ম অনুযায়ী              │
│  কর হিসাব করবে এবং Tax Return তৈরি করতে সাহায্য করবে।             │
└──────────────────────────────────────────────────────────────────────┘
```

## ১.২ System Boundary (কী করবে, কী করবে না)

```
করবে ✅                              করবে না ❌
─────────────────────────────────    ─────────────────────────────────
Income track করবে                   NBR তে সরাসরি submit করবে না
Tax হিসাব করবে                      Payment gateway নেই (Phase 1)
Return draft তৈরি করবে             Document scan করবে না
TDS adjustment করবে                Email notification নেই (Phase 1)
Investment rebate গণনা করবে        Mobile app নেই (Phase 1)
Report generate করবে               CA signature verify করবে না
Admin panel থাকবে
```

---

# অধ্যায় ২: Complete System Architecture

## ২.১ Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│         (Postman / Future Frontend / Mobile App)                │
│                    HTTP Requests                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ROUTING LAYER                               │
│   /api/v1/auth        → authRoutes.js                          │
│   /api/v1/profile     → profileRoutes.js                       │
│   /api/v1/income/     → income routes                          │
│   /api/v1/tds         → tdsRoutes.js                           │
│   /api/v1/investment  → investmentRoutes.js                    │
│   /api/v1/tax         → taxRoutes.js                           │
│   /api/v1/return      → returnRoutes.js                        │
│   /api/v1/report      → reportRoutes.js                        │
│   /api/v1/admin       → adminRoutes.js                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER                              │
│                                                                 │
│  [1] authenticate.js  → JWT token verify করে                   │
│      "তুমি কে? Token দেখাও"                                    │
│                                                                 │
│  [2] authorize.js     → Role check করে                         │
│      "তোমার কি permission আছে?"                                │
│                                                                 │
│  [3] validate.js      → Input data check করে                   │
│      "তুমি যা পাঠিয়েছ তা কি সঠিক?"                            │
│                                                                 │
│  [4] asyncHandler.js  → Async error ধরে                        │
│      "কোনো crash হলে gracefully handle করো"                    │
│                                                                 │
│  [5] rateLimiter.js   → Request throttle করে                   │
│      "একসাথে বেশি request করা যাবে না"                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONTROLLER LAYER                               │
│   কাজ: Request receive → Service call → Response send           │
│                                                                 │
│   authController       profileController    salaryController    │
│   businessController   professionalController rentalController  │
│   tdsController        investmentController  taxController      │
│   returnController     reportController      adminController    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER  ★                              │
│   কাজ: Business Logic — আসল কাজ এখানেই হয়                     │
│                                                                 │
│   authService          → JWT, bcrypt, token manage             │
│   incomeService        → Income aggregate করা                  │
│   taxCalculationService → কর হিসাবের মূল ইঞ্জিন               │
│   rebateService        → Section 78 rebate গণনা               │
│   tdsService           → TDS aggregate ও adjustment            │
│   returnService        → Return তৈরি ও status manage          │
│   reportService        → MongoDB Aggregation দিয়ে report       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MODEL LAYER                                  │
│   কাজ: Database এর সাথে কথা বলা (Mongoose ODM)                 │
│                                                                 │
│   User  TaxProfile  SalaryIncome  BusinessIncome                │
│   ProfessionalIncome  RentalIncome  TdsRecord                  │
│   Investment  TaxReturn  TaxRule  AuditLog                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│              MongoDB (Mongoose ODM)                             │
│                                                                 │
│   Database: tax_return_system                                   │
│   Collections: 12 টি                                           │
└─────────────────────────────────────────────────────────────────┘
```

## ২.২ কেন এই Architecture?

```
সমস্যা                          সমাধান
────────────────────────────    ────────────────────────────────────
Controller এ সব logic         → Service Layer আলাদা করা
Testing কঠিন                  → Service pure function হওয়ায় easy
Tax rule পরিবর্তন হলে         → TaxRule Collection update করলেই হয়
Code duplication              → Service reuse করা যায়
Error handling জটিল           → asyncHandler + global errorHandler
```

---

# অধ্যায় ৩: Module Breakdown

## ৩.১ ১১টি Module এর বিবরণ

```
┌─────────────────────────────────────────────────────────────┐
│ Module 1: User Management                                   │
│ ─────────────────────────────────────────────────────────── │
│ • Register (name, email, password)                          │
│ • Login (JWT token পাবে)                                    │
│ • Profile দেখা ও আপডেট                                     │
│ • Password change                                           │
│ • Role: user / admin                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 2: Tax Profile                                       │
│ ─────────────────────────────────────────────────────────── │
│ • TIN নম্বর                                                 │
│ • NID নম্বর                                                 │
│ • Taxpayer Category (General/Female/Senior/Disabled...)     │
│ • Employee Type (Private/Govt)                              │
│ • Location (Dhaka-CTG/Other City/Other)                     │
│ • এই তথ্যই Tax Threshold ও Minimum Tax নির্ধারণ করে        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 3: Salary Income                                     │
│ ─────────────────────────────────────────────────────────── │
│ • Basic, HRA, Medical, Transport, Festival Bonus            │
│ • Overtime, Other Allowances                                │
│ • Vehicle Perquisite, Accommodation Perk                    │
│ • RPF Contribution                                          │
│ • Auto-calculate: Gross Salary, Exemption, Taxable Salary   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 4: Business Income                                   │
│ ─────────────────────────────────────────────────────────── │
│ • Revenue, Expenses, Depreciation                           │
│ • Auto-calculate: Net Profit                                │
│ • Agriculture Income (60% deemed expense rule)              │
│ • Capital Gains                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 5: Professional / Freelancer Income                  │
│ ─────────────────────────────────────────────────────────── │
│ • Service Income (IT, Consulting, Medical, Legal...)        │
│ • Professional Expenses                                     │
│ • Legal Foreign Remittance (করমুক্ত)                       │
│ • Net Professional Income                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 6: Rental / Property Income                          │
│ ─────────────────────────────────────────────────────────── │
│ • Multiple Properties support                               │
│ • Property Type: Residential (25% deduction) /              │
│                  Commercial (30% deduction)                  │
│ • Municipal Tax deduction                                   │
│ • Net Rental Income auto-calculate                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 7: TDS Management                                    │
│ ─────────────────────────────────────────────────────────── │
│ • Multiple TDS sources (Salary, Bank, Rent, Other)          │
│ • Advance Tax                                               │
│ • Total TDS auto-calculate                                  │
│ • Final Tax থেকে TDS adjust করা                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 8: Investment & Tax Rebate                           │
│ ─────────────────────────────────────────────────────────── │
│ • DPS, FDR, Life Insurance, RPF, Pension                    │
│ • Govt Securities, Mutual Fund                              │
│ • Zakat, Donation, New Shares (IPO)                         │
│ • Sanchayapatra (আলাদা — ১৫% rebate, income নয়)           │
│ • Section 78 Rebate auto-calculate                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 9: Tax Calculation Engine                            │
│ ─────────────────────────────────────────────────────────── │
│ • সব Income একত্র করা                                      │
│ • Tax-free Threshold apply করা                              │
│ • Progressive Slab Tax (10/15/20/25/30%)                    │
│ • Investment Rebate deduct করা                              │
│ • Minimum Tax floor apply করা                               │
│ • Wealth Surcharge (৪ কোটি+ সম্পদ)                        │
│ • TDS adjust করা                                            │
│ • Final Payable Tax বা Refund                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 10: Tax Return Management                            │
│ ─────────────────────────────────────────────────────────── │
│ • Draft Return তৈরি                                         │
│ • Review ও Edit                                             │
│ • Final Submit                                              │
│ • Status Track: draft→submitted→processing→approved         │
│ • Acknowledgement Number generate                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Module 11: Admin Panel                                      │
│ ─────────────────────────────────────────────────────────── │
│ • User Management (View/Activate/Deactivate)                │
│ • Tax Rule Management (Slabs, Thresholds update)            │
│ • Return Review (Approve/Reject)                            │
│ • System-wide Reports                                       │
└─────────────────────────────────────────────────────────────┘
```

---

# অধ্যায় ৪: MongoDB Database Design

## ৪.১ Collection তালিকা

```
#   Collection Name        উদ্দেশ্য
──  ─────────────────────  ──────────────────────────────────────────
01  users                  Account ও Authentication তথ্য
02  taxprofiles            Taxpayer বিস্তারিত পরিচিতি
03  salaryincomes          বেতন সংক্রান্ত সব তথ্য
04  businessincomes        ব্যবসায়িক আয় ও খরচ
05  professionalincomes    Freelancer / Consultant আয়
06  rentalincomes          ভাড়া / সম্পত্তি আয়
07  tdsrecords             TDS ও Advance Tax তথ্য
08  investments            বিনিয়োগ ও Sanchayapatra তথ্য
09  taxcalculations        Tax Engine এর হিসাবকৃত ফলাফল (cache)
10  taxreturns             চূড়ান্ত কর রিটার্ন
11  taxrules               Admin পরিচালিত কর নিয়ম ও স্ল্যাব
12  auditlogs              সিস্টেম কার্যকলাপের রেকর্ড
```

---

## ৪.২ Collection ১: users

**উদ্দেশ্য:** System এ login করার জন্য account তথ্য রাখে।

```
Field           Type       Req   Default      ব্যাখ্যা
──────────────  ─────────  ────  ───────────  ────────────────────────────────────
_id             ObjectId   auto  auto         MongoDB unique ID
name            String     ✅    —            পূর্ণ নাম "Mohammad Ali"
email           String     ✅    —            unique, lowercase, login এ ব্যবহার হয়
password        String     ✅    —            bcrypt hash (কখনো plain text নয়)
role            String     ✅    "user"       "user" বা "admin"
isActive        Boolean    —     true         false হলে login করতে পারবে না
isEmailVerified Boolean    —     false        Email verification (Phase 2+)
lastLoginAt     Date       —     null         সর্বশেষ login এর সময়
passwordChangedAt Date     —     null         password পরিবর্তনের সময়
createdAt       Date       auto  auto         Mongoose timestamps
updatedAt       Date       auto  auto         Mongoose timestamps

Indexes:
  email → unique: true (duplicate email হবে না)

Validation Rules:
  name:     minimum 2 characters, maximum 50 characters
  email:    valid email format (regex)
  password: minimum 8 characters (plain text validation, hash করে store)
  role:     enum ["user", "admin"]
```

---

## ৪.৩ Collection ২: taxprofiles

**উদ্দেশ্য:** Taxpayer এর বিস্তারিত তথ্য — Tax Threshold ও Minimum Tax এই তথ্যের উপর নির্ভর করে।

```
Field               Type      Req   Default    ব্যাখ্যা
──────────────────  ────────  ────  ─────────  ──────────────────────────────────────
_id                 ObjectId  auto  auto       MongoDB unique ID
userId              ObjectId  ✅    —          users._id → কোন user এর profile
tin                 String    ✅    —          Tax ID Number, unique, 10-12 digits
nid                 String    ✅    —          National ID number
dateOfBirth         Date      ✅    —          জন্মতারিখ (senior citizen check)
gender              String    ✅    —          "male" | "female" | "other"

taxpayerCategory    String    ✅    "general"  করমুক্ত সীমা নির্ধারণ করে
                                               "general"         → ৳৩,৭৫,০০০
                                               "female"          → ৳৪,২৫,০০০
                                               "senior"          → ৳৪,২৫,০০০
                                               "disabled"        → ৳৫,০০,০০০
                                               "thirdGender"     → ৳৫,০০,০০০
                                               "freedomFighter"  → ৳৫,২৫,০০০
                                               "julyWarrior"     → ৳৫,২৫,০০০

employeeType        String    ✅    "private"  "private" | "govt"
                                               Govt → SRO 225/2023 প্রযোজ্য
                                               (শুধু Basic ও Festival Bonus করযোগ্য)

isNewTaxpayer       Boolean   —     false      প্রথমবার রিটার্ন → min tax ৳১,০০০
                                               না হলে location অনুযায়ী min tax

locationKind        String    ✅    "other"    ন্যূনতম কর নির্ধারণ করে
                                               "dhaka_ctg" → ৳৫,০০০
                                               "other_city" → ৳৪,০০০
                                               "other"      → ৳৩,০০০

circleNo            String    —     —          কর সার্কেল নম্বর
zoneName            String    —     —          কর অঞ্চল
phone               String    —     —          মোবাইল নম্বর
presentAddress      String    —     —          বর্তমান ঠিকানা
permanentAddress    String    —     —          স্থায়ী ঠিকানা
createdAt           Date      auto  auto
updatedAt           Date      auto  auto

Indexes:
  userId → unique: true (একজন user এর একটিই profile)
  tin    → unique: true (duplicate TIN হবে না)

Relationships:
  userId → users._id (One-to-One)
```

---

## ৪.৪ Collection ৩: salaryincomes

**উদ্দেশ্য:** একজন user এর এক বছরের বেতন সংক্রান্ত সব তথ্য।

```
Field                  Type      Req   Default  ব্যাখ্যা
─────────────────────  ────────  ────  ───────  ──────────────────────────────────────
_id                    ObjectId  auto  auto
userId                 ObjectId  ✅    —        users._id
taxYear                String    ✅    —        "2025-26" (Income Year)

── বেতনের উপাদান (মাসিক) ──
basicSalary            Number    ✅    0        মূল বেতন (মাসিক)
houseRentAllowance     Number    —     0        বাড়িভাড়া ভাতা (মাসিক)
medicalAllowance       Number    —     0        চিকিৎসা ভাতা (মাসিক)
transportAllowance     Number    —     0        যাতায়াত ভাতা (মাসিক)
overtime               Number    —     0        ওভারটাইম (মাসিক)
otherAllowances        Number    —     0        অন্যান্য ভাতা (মাসিক)

── বার্ষিক উপাদান ──
festivalBonus          Number    —     0        উৎসব বোনাস (বার্ষিক, মাসিক নয়)
leaveEncashment        Number    —     0        ছুটির পাওনা (বার্ষিক)

── Perquisites (সুযোগ-সুবিধার আর্থিক মূল্য) ──
vehiclePerquisiteCC    String    —     "none"   "none"|"upto1500"|"1500to2000"|"above2000"
                                                System মাসিক মূল্য গণনা করবে:
                                                upto1500   → ৳১৫,০০০/মাস
                                                1500to2000 → ৳২৫,০০০/মাস
                                                above2000  → ৳৫০,০০০/মাস
accommodationPerk      Number    —     0        বাসস্থান সুবিধা (বার্ষিক)
otherPerquisites       Number    —     0        অন্যান্য সুবিধা (বার্ষিক)

── RPF ──
rpfEmployeeContribution Number  —     0        কর্মীর RPF চাঁদা (বার্ষিক)

── Employer তথ্য ──
employerName           String    —     —        নিয়োগকর্তার নাম
employerTin            String    —     —        নিয়োগকর্তার TIN

── হিসাবকৃত মান (Service layer calculate করবে) ──
annualBasicSalary      Number    —     0        basicSalary × 12
vehiclePerqAnnual      Number    —     0        CC অনুযায়ী মাসিক × 12
grossSalary            Number    —     0        সব উপাদানের যোগফল (বার্ষিক)
salaryExemption        Number    —     0        min(grossSalary/3, ৳৫,০০,০০০)
                                                Govt হলে: শুধু Basic + Festival ছাড়া সব exempt
taxableSalary          Number    —     0        grossSalary - salaryExemption

createdAt              Date      auto  auto
updatedAt              Date      auto  auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
  (একজন user এর এক বছরে একটিই salary record)

Validation:
  basicSalary:  min 0, required
  taxYear:      regex /^\d{4}-\d{2}$/  (যেমন: "2025-26")
```

---

## ৪.৫ Collection ৪: businessincomes

**উদ্দেশ্য:** ব্যবসায়িক আয়, কৃষি আয় ও মূলধনী লাভ।

```
Field                  Type      Req   Default  ব্যাখ্যা
─────────────────────  ────────  ────  ───────  ──────────────────────────────────────
_id                    ObjectId  auto  auto
userId                 ObjectId  ✅    —        users._id
taxYear                String    ✅    —        "2025-26"

── ব্যবসায়িক আয় ──
businessName           String    —     —        ব্যবসার নাম
businessType           String    —     "sole"   "sole"|"partnership"|"company"
grossRevenue           Number    —     0        মোট আয়
businessExpenses       Number    —     0        মোট খরচ
depreciation           Number    —     0        অবচয় (Depreciation)
netBusinessProfit      Number    —     0        হিসাবকৃত: revenue - expenses - depreciation

── কৃষি আয় ──
grossAgriIncome        Number    —     0        কৃষি আয়
hasAgriAccountsBook    Boolean   —     false    হিসাবের বই আছে?
                                                false → ৬০% deemed expense (৪০% করযোগ্য)
                                                true  → আসল খরচ বাদ দেওয়া যাবে
agriExpenses           Number    —     0        কৃষি খরচ (only if hasAgriAccountsBook: true)
netAgriIncome          Number    —     0        হিসাবকৃত

── মূলধনী লাভ ──
capitalGainsFromShares Number    —     0        শেয়ার বিক্রি থেকে লাভ
capitalGainsFromProperty Number  —     0        সম্পত্তি বিক্রি থেকে লাভ
otherCapitalGains      Number    —     0        অন্যান্য মূলধনী লাভ

── ব্যাংক আয় ──
bankInterest           Number    —     0        ব্যাংক সুদ
savingsCertificateIncome Number  —     0        সঞ্চয়পত্র আয় (final tax: ১০%)
dividendIncome         Number    —     0        লভ্যাংশ (final tax: ১০%)

── হিসাবকৃত মান ──
totalBusinessIncome    Number    —     0        সব ব্যবসায়িক আয়ের যোগফল
taxableBusinessIncome  Number    —     0        করযোগ্য ব্যবসায়িক আয়

createdAt              Date      auto  auto
updatedAt              Date      auto  auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
```

---

## ৪.৬ Collection ৫: professionalincomes

**উদ্দেশ্য:** Freelancer, Consultant, Doctor, Lawyer এর আয়।

```
Field                    Type      Req   Default       ব্যাখ্যা
───────────────────────  ────────  ────  ──────────    ──────────────────────────────────────
_id                      ObjectId  auto  auto
userId                   ObjectId  ✅    —             users._id
taxYear                  String    ✅    —             "2025-26"

serviceType              String    ✅    "other"       "it"|"consulting"|"medical"|"legal"|"other"
grossServiceIncome       Number    ✅    0             মোট service আয়
professionalExpenses     Number    —     0             পেশাদার খরচ

── বৈদেশিক আয় ──
legalForeignRemittance   Number    —     0             আইনি বৈদেশিক রেমিট্যান্স
                                                       (সম্পূর্ণ করমুক্ত — total income এ যোগ হবে না)
otherForeignIncome       Number    —     0             অন্যান্য বৈদেশিক আয় (করযোগ্য)

── অন্যান্য আয় ──
royaltiesIncome          Number    —     0             রয়্যালটি
prizesGifts              Number    —     0             পুরস্কার ও উপহার

── হিসাবকৃত মান ──
netProfessionalIncome    Number    —     0             grossServiceIncome - professionalExpenses

createdAt                Date      auto  auto
updatedAt                Date      auto  auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
```

---

## ৪.৭ Collection ৬: rentalincomes

**উদ্দেশ্য:** একাধিক ভাড়া সম্পত্তির তথ্য।

```
Field                    Type      Req   Default   ব্যাখ্যা
───────────────────────  ────────  ────  ────────  ──────────────────────────────────────
_id                      ObjectId  auto  auto
userId                   ObjectId  ✅    —         users._id
taxYear                  String    ✅    —         "2025-26"

── Properties Array (একাধিক সম্পত্তি) ──
properties               [Object]  ✅    —         Array of property objects

  properties[].propertyAddress  String   ✅  —     সম্পত্তির ঠিকানা
  properties[].propertyType     String   ✅  —     "residential" → ২৫% মেরামত ছাড়
                                                   "commercial"  → ৩০% মেরামত ছাড়
  properties[].annualRent       Number   ✅  0     বার্ষিক ভাড়া
  properties[].municipalTax     Number   —   0     পৌর কর
  properties[].mortgageInterest Number   —   0     বন্ধকী সুদ (যদি থাকে)

  ── হিসাবকৃত ──
  properties[].repairDeduction  Number   —   0     residential: rent×0.25
                                                   commercial:  rent×0.30
  properties[].netRentalIncome  Number   —   0     rent - repairDeduction - municipalTax

── হিসাবকৃত মান ──
totalNetRentalIncome     Number    —     0         সব property এর net income যোগফল

createdAt                Date      auto  auto
updatedAt                Date      auto  auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
```

---

## ৪.৮ Collection ৭: tdsrecords

**উদ্দেশ্য:** যেখানে যেখানে TDS কাটা হয়েছে তার রেকর্ড।

```
Field                    Type      Req   Default   ব্যাখ্যা
───────────────────────  ────────  ────  ────────  ──────────────────────────────────────
_id                      ObjectId  auto  auto
userId                   ObjectId  ✅    —         users._id
taxYear                  String    ✅    —         "2025-26"

── TDS Entries Array ──
tdsEntries               [Object]  —     []        Multiple TDS sources

  tdsEntries[].source        String  ✅  —         "salary"|"bank"|"rent"|"securities"|"other"
  tdsEntries[].deductorName  String  ✅  —         কে কেটেছে (নিয়োগকর্তা / ব্যাংক)
  tdsEntries[].deductorTin   String  —   —         কর্তনকারীর TIN
  tdsEntries[].amount        Number  ✅  0         কত টাকা কাটা হয়েছে
  tdsEntries[].period        String  —   —         কোন মাস/সময়কালে
  tdsEntries[].certificateNo String  —   —         TDS সনদ নম্বর

── অগ্রিম কর ──
advanceTax               Number    —     0         নিজে জমা দেওয়া অগ্রিম কর
advanceTaxChallanNo      String    —     —         Challan নম্বর

── Final Taxes (non-adjustable) ──
savingsCertTds           Number    —     0         সঞ্চয়পত্রে ১০% কাটা হয়েছে
dividendTds              Number    —     0         লভ্যাংশে ১০% কাটা হয়েছে

── হিসাবকৃত মান ──
totalAdjustableTds       Number    —     0         salary+bank+rent TDS + advance tax
totalFinalTds            Number    —     0         savings cert + dividend TDS
totalTdsPaid             Number    —     0         সম্পূর্ণ TDS এর যোগফল

createdAt                Date      auto  auto
updatedAt                Date      auto  auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
```

---

## ৪.৯ Collection ৮: investments

**উদ্দেশ্য:** Section 78 যোগ্য বিনিয়োগ ও Sanchayapatra তথ্য।

```
Field                    Type      Req   Default   ব্যাখ্যা
───────────────────────  ────────  ────  ────────  ──────────────────────────────────────
_id                      ObjectId  auto  auto
userId                   ObjectId  ✅    —         users._id
taxYear                  String    ✅    —         "2025-26"

── Section 78 যোগ্য বিনিয়োগ ──
dps                      Number    —     0         DPS (সর্বোচ্চ ৳১,২০,০০০ eligible)
fdr                      Number    —     0         Fixed Deposit Receipt
lifeInsurancePremium     Number    —     0         জীবন বিমা প্রিমিয়াম
lifeInsuranceSumAssured  Number    —     0         Sum Assured (প্রিমিয়াম cap: SA এর ১০%)
providentFund            Number    —     0         Provident Fund contribution
pensionScheme            Number    —     0         অনুমোদিত পেনশন স্কিম
govtSecurities           Number    —     0         সরকারি সিকিউরিটি (cap: ৳৫,০০,০০০)
mutualFund               Number    —     0         মিউচুয়াল ফান্ড (cap: ৳৫,০০,০০০)
zakat                    Number    —     0         যাকাত
approvedDonation         Number    —     0         অনুমোদিত দান/অনুদান
newSharesIPO             Number    —     0         নতুন শেয়ার (IPO/NTB/rights)
otherInvestments         Number    —     0         অন্যান্য যোগ্য বিনিয়োগ

── Sanchayapatra (আলাদা নিয়মে) ──
sanchayapatra            Number    —     0         সঞ্চয়পত্রে বিনিয়োগ
                                                   → income তে গণনা হয় না
                                                   → ১৫% tax rebate পাওয়া যায়

── হিসাবকৃত মান (Service calculate করবে) ──
totalRawInvestment       Number    —     0         সব বিনিয়োগের যোগ (cap প্রয়োগের আগে)
totalEligibleInvestment  Number    —     0         min(raw, 3%×income, ৳১০,০০,০০০)
investmentRebate         Number    —     0         totalEligible × 15%
sanchayapatraRebate      Number    —     0         sanchayapatra × 15%
totalRebate              Number    —     0         investmentRebate + sanchayapatraRebate

createdAt                Date      auto  auto
updatedAt                Date      auto  auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
```

---

## ৪.১০ Collection ৯: taxcalculations

**উদ্দেশ্য:** Tax Engine এর গণনার ফলাফল cache করে রাখা। প্রতিবার সব data নতুন করে গণনা না করে এখান থেকে পড়া যায়।

```
Field                    Type      Req   ব্যাখ্যা
───────────────────────  ────────  ────  ──────────────────────────────────────
_id                      ObjectId  auto
userId                   ObjectId  ✅    users._id
taxYear                  String    ✅    "2025-26"
calculatedAt             Date      auto  কখন গণনা হয়েছে
isStale                  Boolean   —     true হলে আবার calculate করতে হবে

── আয়ের সারসংক্ষেপ ──
taxableSalary            Number    —     করযোগ্য বেতন
netBusinessIncome        Number    —     নিট ব্যবসায়িক আয়
netProfessionalIncome    Number    —     নিট পেশাদার আয়
netRentalIncome          Number    —     নিট ভাড়া আয়
capitalGains             Number    —     মূলধনী লাভ
bankInterest             Number    —     ব্যাংক সুদ
otherIncome              Number    —     অন্যান্য আয়
totalIncome              Number    —     সব আয়ের যোগফল
taxableIncome            Number    —     totalIncome - taxFreeThreshold

── কর হিসাব ──
taxFreeThreshold         Number    —     taxpayer category অনুযায়ী
grossTax                 Number    —     স্ল্যাব অনুযায়ী কর
investmentRebate         Number    —     Section 78 rebate
sanchayapatraRebate      Number    —     সঞ্চয়পত্র rebate
totalRebate              Number    —     সব rebate এর যোগ
taxAfterRebate           Number    —     grossTax - totalRebate
minimumTax               Number    —     location অনুযায়ী minimum floor
minimumTaxApplied        Boolean   —     minimum tax floor প্রযোজ্য হয়েছে?
wealthSurcharge          Number    —     সম্পদ সারচার্জ (৪ কোটি+)
finalTaxBeforeTDS        Number    —     চূড়ান্ত কর (TDS বাদের আগে)

── TDS Adjustment ──
totalAdjustableTds       Number    —     adjustable TDS
netTaxPayable            Number    —     finalTaxBeforeTDS - totalAdjustableTds
isRefund                 Boolean   —     negative হলে true
refundAmount             Number    —     refund এর পরিমাণ

── স্ল্যাব বিবরণ ──
slabBreakdown            [Object]  —     [{ label, from, to, rate, taxAmount }]

createdAt                Date      auto
updatedAt                Date      auto

Indexes:
  { userId: 1, taxYear: 1 } → unique: true
```

---

## ৪.১১ Collection ১০: taxreturns

**উদ্দেশ্য:** চূড়ান্ত কর রিটার্ন document।

```
Field                    Type      Req   Default     ব্যাখ্যা
───────────────────────  ────────  ────  ──────────  ──────────────────────────────────────
_id                      ObjectId  auto  auto
userId                   ObjectId  ✅    —           users._id
taxYear                  String    ✅    —           "2025-26"
assessmentYear           String    ✅    —           "2026-27"
returnNo                 String    —     auto        "TR-2026-00001" (unique, auto generate)

── Snapshot (submit করার সময়ের data) ──
taxProfileSnapshot       Object    —     —           submit করার মুহূর্তের profile copy
incomeSnapshot           Object    —     —           সব income এর snapshot
calculationSnapshot      Object    —     —           taxcalculations এর snapshot

── Status Machine ──
status                   String    ✅    "draft"     "draft" → "submitted" → "processing"
                                                     → "approved" | "rejected"

── Timestamps ──
submittedAt              Date      —     null        submit করার সময়
processedAt              Date      —     null        processing শুরুর সময়
approvedAt               Date      —     null        approve করার সময়
acknowledgementNo        String    —     null        submit হলে generate হয়

── Admin ──
adminNotes               String    —     —           Admin এর মন্তব্য
reviewedBy               ObjectId  —     null        → users._id (admin)
rejectionReason          String    —     —           reject কারণ

createdAt                Date      auto  auto
updatedAt                Date      auto  auto

Status Transitions (State Machine):
  draft      → submitted   (User submit করলে)
  submitted  → processing  (Admin review শুরু করলে)
  processing → approved    (Admin approve করলে)
  processing → rejected    (Admin reject করলে)
  rejected   → draft       (User আবার edit করতে পারবে)

Indexes:
  { userId: 1, taxYear: 1 }
  returnNo → unique: true
```

---

## ৪.১২ Collection ১১: taxrules

**উদ্দেশ্য:** NBR এর কর নিয়ম ও স্ল্যাব। Admin পরিবর্তন করতে পারবে।

```
Field                    Type      Req   ব্যাখ্যা
───────────────────────  ────────  ────  ──────────────────────────────────────
_id                      ObjectId  auto
taxYear                  String    ✅    "2025-26" (unique)
assessmentYear           String    ✅    "2026-27"
isActive                 Boolean   —     true হলে এই বছরের নিয়ম ব্যবহার হবে

taxFreeThresholds        Object    ✅    {
                                          general: 375000,
                                          female: 425000,
                                          senior: 425000,
                                          disabled: 500000,
                                          thirdGender: 500000,
                                          freedomFighter: 525000,
                                          julyWarrior: 525000
                                        }

taxSlabs                 [Object]  ✅    [
                                          { upTo: 300000,   rate: 0.10, label: "প্রথম ৳৩,০০,০০০" },
                                          { upTo: 400000,   rate: 0.15, label: "পরবর্তী ৳৪,০০,০০০" },
                                          { upTo: 500000,   rate: 0.20, label: "পরবর্তী ৳৫,০০,০০০" },
                                          { upTo: 2000000,  rate: 0.25, label: "পরবর্তী ৳২০,০০,০০০" },
                                          { upTo: null,     rate: 0.30, label: "অবশিষ্ট" }
                                        ]

salaryExemption          Object    ✅    {
                                          divisor: 3,
                                          maxAmount: 500000
                                        }

investmentRebate         Object    ✅    {
                                          incomeRate: 0.03,
                                          investmentRate: 0.15,
                                          maxRebate: 1000000
                                        }

sanchayapatraRebateRate  Number    ✅    0.15

minimumTax               Object    ✅    {
                                          dhakaCTG: 5000,
                                          otherCity: 4000,
                                          other: 3000,
                                          newTaxpayer: 1000
                                        }

wealthSurcharge          [Object]  —     [
                                          { from: 40000000, to: 100000000, rate: 0.10 },
                                          { from: 100000000, to: 200000000, rate: 0.20 },
                                          { from: 200000000, to: 500000000, rate: 0.30 },
                                          { from: 500000000, to: null, rate: 0.35 }
                                        ]

repairDeductionRates     Object    ✅    {
                                          residential: 0.25,
                                          commercial: 0.30
                                        }

vehiclePerquisiteRates   Object    ✅    {
                                          upto1500: 15000,
                                          upto2000: 25000,
                                          above2000: 50000
                                        }

createdAt                Date      auto
updatedAt                Date      auto

Indexes:
  taxYear → unique: true
  isActive: true → শুধু একটি active থাকবে
```

---

## ৪.১৩ Collection ১২: auditlogs

**উদ্দেশ্য:** কে কখন কী করেছে তার রেকর্ড (Security ও Debugging)।

```
Field       Type      Req   ব্যাখ্যা
──────────  ────────  ────  ──────────────────────────────────────────
_id         ObjectId  auto
userId      ObjectId  ✅    কে করেছে
action      String    ✅    "LOGIN" | "RETURN_SUBMITTED" | "RULE_UPDATED" | "USER_DELETED"
resource    String    —     "taxreturn" | "user" | "taxrule"
resourceId  ObjectId  —     কোন document এর উপর action হয়েছে
details     Object    —     extra context (IP, changes)
ipAddress   String    —     request এর IP
createdAt   Date      auto  কখন হয়েছে

Indexes:
  userId, createdAt (TTL: 90 দিন পর auto delete)
```

---

# অধ্যায় ৫: Entity Relationship Diagram (Text Format)

```
┌──────────────┐        ┌────────────────┐
│    users     │        │   taxprofiles  │
│──────────────│        │────────────────│
│ _id (PK)     │◄──────┤ userId (FK)    │
│ name         │  1:1   │ tin (unique)   │
│ email        │        │ taxpayerCategory│
│ password     │        │ locationKind   │
│ role         │        │ employeeType   │
└──────┬───────┘        └────────────────┘
       │
       │ 1:1 (per year)
       ├──────────────────────────────────────────────────────────┐
       │                                                          │
       ▼                                                          ▼
┌─────────────────┐                                    ┌─────────────────┐
│  salaryincomes  │                                    │ businessincomes │
│─────────────────│                                    │─────────────────│
│ userId (FK)     │                                    │ userId (FK)     │
│ taxYear         │                                    │ taxYear         │
│ basicSalary     │                                    │ grossRevenue    │
│ grossSalary ●   │                                    │ netProfit ●     │
│ taxableSalary ● │                                    │ capitalGains    │
└─────────────────┘                                    └─────────────────┘

       │ 1:1 (per year)              │ 1:1 (per year)
       ▼                             ▼
┌──────────────────────┐   ┌──────────────────────┐
│ professionalincomes  │   │    rentalincomes      │
│──────────────────────│   │──────────────────────│
│ userId (FK)          │   │ userId (FK)           │
│ taxYear              │   │ taxYear               │
│ grossServiceIncome   │   │ properties [ ]        │
│ netProfessional ●    │   │ totalNetRental ●      │
└──────────────────────┘   └──────────────────────┘

       │ 1:1 (per year)              │ 1:1 (per year)
       ▼                             ▼
┌──────────────────┐       ┌──────────────────────┐
│   tdsrecords     │       │    investments        │
│──────────────────│       │──────────────────────│
│ userId (FK)      │       │ userId (FK)           │
│ taxYear          │       │ taxYear               │
│ tdsEntries [ ]   │       │ dps, fdr, insurance.. │
│ totalTdsPaid ●   │       │ sanchayapatra         │
└──────────────────┘       │ totalRebate ●         │
                           └──────────────────────┘

       ↓ সব data একত্রিত করে
┌──────────────────────┐
│  taxcalculations     │ ← Tax Engine এর output
│──────────────────────│
│ userId (FK)          │
│ taxYear              │
│ totalIncome ●        │
│ taxableIncome ●      │
│ grossTax ●           │
│ netTaxPayable ●      │
└──────────┬───────────┘
           │ snapshot নেয়
           ▼
┌──────────────────────┐       ┌──────────────┐
│    taxreturns        │       │   taxrules   │ ← Admin manage করে
│──────────────────────│       │──────────────│
│ userId (FK)          │       │ taxYear      │
│ taxYear              │ uses  │ taxSlabs     │
│ calculationSnapshot  │◄──────│ thresholds   │
│ status               │       │ rebate rules │
│ returnNo (unique)    │       └──────────────┘
└──────────────────────┘

● = System হিসাব করে, User দেয় না
FK = Foreign Key (অন্য collection এর _id)
```

---

# অধ্যায় ৬: API Endpoint Design

## ৬.১ Auth APIs

```
─────────────────────────────────────────────────────────────────────
POST /api/v1/auth/register
Auth: Public

Request Body:
{
  "name": "Mohammad Ali",
  "email": "ali@example.com",
  "password": "SecurePass123"
}

Success Response (201):
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "_id": "...", "name": "Mohammad Ali", "email": "ali@example.com", "role": "user" },
    "token": "eyJhbGciOi..."
  }
}

Error Response (400):
{ "success": false, "message": "Email already registered" }

─────────────────────────────────────────────────────────────────────
POST /api/v1/auth/login
Auth: Public

Request Body:
{
  "email": "ali@example.com",
  "password": "SecurePass123"
}

Success Response (200):
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Mohammad Ali", "role": "user" },
    "token": "eyJhbGciOi..."
  }
}

─────────────────────────────────────────────────────────────────────
GET /api/v1/auth/me
Auth: Required (JWT)

Success Response (200):
{
  "success": true,
  "data": { "_id": "...", "name": "...", "email": "...", "role": "user" }
}

─────────────────────────────────────────────────────────────────────
PUT /api/v1/auth/change-password
Auth: Required (JWT)

Request Body:
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

## ৬.২ Tax Profile APIs

```
─────────────────────────────────────────────────────────────────────
POST /api/v1/profile
Auth: Required (JWT, role: user)

Request Body:
{
  "tin": "123456789",
  "nid": "1234567890123",
  "dateOfBirth": "1985-06-15",
  "gender": "male",
  "taxpayerCategory": "general",
  "employeeType": "private",
  "isNewTaxpayer": false,
  "locationKind": "dhaka_ctg",
  "phone": "01700000000",
  "presentAddress": "Dhaka-1000"
}

Success Response (201):
{
  "success": true,
  "message": "Tax profile created",
  "data": { ...profile }
}

─────────────────────────────────────────────────────────────────────
GET  /api/v1/profile        → নিজের profile দেখো
PUT  /api/v1/profile        → profile আপডেট করো
```

## ৬.৩ Salary Income APIs

```
─────────────────────────────────────────────────────────────────────
POST /api/v1/income/salary
Auth: Required

Request Body:
{
  "taxYear": "2025-26",
  "basicSalary": 50000,
  "houseRentAllowance": 20000,
  "medicalAllowance": 5000,
  "transportAllowance": 3000,
  "festivalBonus": 100000,
  "vehiclePerquisiteCC": "upto1500",
  "rpfEmployeeContribution": 60000,
  "employerName": "ABC Company Ltd"
}

Success Response (201):
{
  "success": true,
  "data": {
    "taxYear": "2025-26",
    "grossSalary": 996000,       ← System গণনা করেছে
    "salaryExemption": 332000,   ← min(996000/3, 500000)
    "taxableSalary": 664000,     ← System গণনা করেছে
    ...
  }
}

─────────────────────────────────────────────────────────────────────
GET    /api/v1/income/salary            → সব salary record
GET    /api/v1/income/salary/:id        → একটি record
PUT    /api/v1/income/salary/:id        → আপডেট (re-calculate হবে)
DELETE /api/v1/income/salary/:id        → মুছো
```

## ৬.৪ Business Income APIs

```
POST   /api/v1/income/business
GET    /api/v1/income/business
GET    /api/v1/income/business/:id
PUT    /api/v1/income/business/:id
DELETE /api/v1/income/business/:id
```

## ৬.৫ Professional Income APIs

```
POST   /api/v1/income/professional
GET    /api/v1/income/professional
PUT    /api/v1/income/professional/:id
DELETE /api/v1/income/professional/:id
```

## ৬.৬ Rental Income APIs

```
POST   /api/v1/income/rental
GET    /api/v1/income/rental
PUT    /api/v1/income/rental/:id
DELETE /api/v1/income/rental/:id
```

## ৬.৭ TDS APIs

```
─────────────────────────────────────────────────────────────────────
POST /api/v1/tds
Request Body:
{
  "taxYear": "2025-26",
  "tdsEntries": [
    { "source": "salary",  "deductorName": "ABC Company", "amount": 15000 },
    { "source": "bank",    "deductorName": "Dutch Bangla", "amount": 5000  }
  ],
  "advanceTax": 10000
}

GET    /api/v1/tds
PUT    /api/v1/tds/:id
DELETE /api/v1/tds/:id
```

## ৬.৮ Investment APIs

```
─────────────────────────────────────────────────────────────────────
POST /api/v1/investment
Request Body:
{
  "taxYear": "2025-26",
  "dps": 60000,
  "lifeInsurancePremium": 30000,
  "lifeInsuranceSumAssured": 500000,
  "sanchayapatra": 200000
}

Success Response (201):
{
  "success": true,
  "data": {
    "totalEligibleInvestment": 90000,  ← System গণনা করেছে
    "investmentRebate": 13500,          ← 90000 × 15%
    "sanchayapatraRebate": 30000,       ← 200000 × 15%
    "totalRebate": 43500
  }
}

GET    /api/v1/investment
PUT    /api/v1/investment/:id
GET    /api/v1/investment/rebate-preview    ← Rebate এর preview
```

## ৬.৯ Tax Calculation APIs

```
─────────────────────────────────────────────────────────────────────
GET /api/v1/tax/calculate?taxYear=2025-26
Auth: Required

কী করে:
  1. User এর সব income fetch করে
  2. TaxRule থেকে বর্তমান slabs ও thresholds নেয়
  3. Step by step কর গণনা করে
  4. taxcalculations collection এ save করে

Success Response (200):
{
  "success": true,
  "data": {
    "taxYear": "2025-26",
    "incomeBreakdown": {
      "taxableSalary": 664000,
      "businessIncome": 0,
      "rentalIncome": 0,
      "totalIncome": 664000,
      "taxFreeThreshold": 375000,
      "taxableIncome": 289000
    },
    "taxCalculation": {
      "grossTax": 28900,
      "totalRebate": 43500,
      "taxAfterRebate": 0,
      "minimumTax": 5000,
      "minimumTaxApplied": true,
      "finalTaxBeforeTDS": 5000,
      "totalTdsPaid": 30000,
      "netTaxPayable": -25000,
      "isRefund": true,
      "refundAmount": 25000
    },
    "slabBreakdown": [
      { "label": "প্রথম ৳৩,০০,০০০", "from": 0, "to": 289000, "rate": 0.10, "taxAmount": 28900 }
    ]
  }
}

─────────────────────────────────────────────────────────────────────
GET /api/v1/tax/summary?taxYear=2025-26   → Simple summary
GET /api/v1/tax/slabs                     → বর্তমান slabs (Public)
```

## ৬.১০ Tax Return APIs

```
─────────────────────────────────────────────────────────────────────
POST /api/v1/return
Request Body: { "taxYear": "2025-26" }

কী করে:
  latest calculation নিয়ে draft return তৈরি করে

─────────────────────────────────────────────────────────────────────
GET    /api/v1/return                   → সব return
GET    /api/v1/return/:id               → একটি return (details)
PUT    /api/v1/return/:id               → draft edit করো
DELETE /api/v1/return/:id               → draft মুছো (submitted হলে মুছবে না)

POST /api/v1/return/:id/submit
কী করে:
  status: "draft" → "submitted"
  acknowledgementNo generate করে
  submittedAt set করে

GET /api/v1/return/:id/status           → শুধু status দেখো
```

## ৬.১১ Report APIs

```
GET /api/v1/report/income?taxYear=2025-26
  → Income source wise breakdown

GET /api/v1/report/tax?taxYear=2025-26
  → Tax calculation detail report

GET /api/v1/report/tds?taxYear=2025-26
  → TDS source wise report

GET /api/v1/report/annual?taxYear=2025-26
  → সম্পূর্ণ annual summary (print/PDF এর জন্য)
```

## ৬.১২ Admin APIs

```
GET    /api/v1/admin/users              → সব users (paginated)
GET    /api/v1/admin/users/:id          → একজন user
PUT    /api/v1/admin/users/:id/status   → activate/deactivate
DELETE /api/v1/admin/users/:id

GET    /api/v1/admin/returns            → সব returns
GET    /api/v1/admin/returns/:id        → একটি return
PUT    /api/v1/admin/returns/:id/status → approve/reject
  Request: { "status": "approved", "adminNotes": "Verified" }

GET    /api/v1/admin/rules              → সব tax rules
GET    /api/v1/admin/rules/active       → বর্তমান active rule
POST   /api/v1/admin/rules              → নতুন tax rule (নতুন বছরের জন্য)
PUT    /api/v1/admin/rules/:id          → rule update
```

---

# অধ্যায় ৭: Validation Rules

## ৭.১ Auth Validation

```
Field          Rule
─────────────  ─────────────────────────────────────────────────
name           required, string, 2-50 chars, no numbers
email          required, valid email format, unique
password       required, min 8 chars, must have uppercase + number
role           enum: ["user", "admin"], default "user"
```

## ৭.২ Tax Profile Validation

```
Field                Rule
───────────────────  ───────────────────────────────────────────
tin                  required, string, 10-12 digits
nid                  required, string, 10-17 digits
dateOfBirth          required, date, must be past, age 18-100
gender               enum: ["male","female","other"]
taxpayerCategory     enum: ["general","female","senior","disabled",
                            "thirdGender","freedomFighter","julyWarrior"]
employeeType         enum: ["private","govt"]
locationKind         enum: ["dhaka_ctg","other_city","other"]
```

## ৭.৩ Income Validation

```
Field          Rule
─────────────  ─────────────────────────────────────────────────
taxYear        required, pattern: /^\d{4}-\d{2}$/
All amounts    number, min: 0 (negative হবে না)
basicSalary    required for salary, min: 1
```

## ৭.৪ Business Rule Validation

```
Rule                              Validation
────────────────────────────────  ──────────────────────────────────────
Senior citizen check              dateOfBirth থেকে বয়স ৬৫+ হলে category "senior"
TaxYear format                    "2025-26" format, current year only
Duplicate record prevention       { userId, taxYear } unique constraint
Status transition                 draft→submitted only (not draft→approved)
Return edit restriction           submitted/approved return edit করা যাবে না
```

---

# অধ্যায় ৮: Complete Folder Structure

```
tax-return-system/
│
├── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
│
└── src/
    │
    ├── app.js                          ← Express setup
    │
    ├── config/
    │   ├── db.js                       ← MongoDB connect
    │   └── constants.js                ← Tax year, default values
    │
    ├── models/
    │   ├── User.js
    │   ├── TaxProfile.js
    │   ├── SalaryIncome.js
    │   ├── BusinessIncome.js
    │   ├── ProfessionalIncome.js
    │   ├── RentalIncome.js
    │   ├── TdsRecord.js
    │   ├── Investment.js
    │   ├── TaxCalculation.js
    │   ├── TaxReturn.js
    │   ├── TaxRule.js
    │   └── AuditLog.js
    │
    ├── controllers/
    │   ├── authController.js
    │   ├── profileController.js
    │   ├── salaryController.js
    │   ├── businessController.js
    │   ├── professionalController.js
    │   ├── rentalController.js
    │   ├── tdsController.js
    │   ├── investmentController.js
    │   ├── taxController.js
    │   ├── returnController.js
    │   ├── reportController.js
    │   └── adminController.js
    │
    ├── services/
    │   ├── authService.js              ← JWT, bcrypt
    │   ├── incomeService.js            ← income aggregate
    │   ├── salaryCalculationService.js ← exemption গণনা
    │   ├── taxCalculationService.js    ← মূল কর ইঞ্জিন ★
    │   ├── rebateService.js            ← Section 78
    │   ├── tdsService.js               ← TDS aggregate
    │   ├── returnService.js            ← return manage
    │   ├── reportService.js            ← aggregation
    │   └── auditService.js             ← log করা
    │
    ├── routes/
    │   ├── index.js                    ← সব route একত্র
    │   ├── authRoutes.js
    │   ├── profileRoutes.js
    │   ├── incomeRoutes.js             ← salary/business/pro/rental
    │   ├── tdsRoutes.js
    │   ├── investmentRoutes.js
    │   ├── taxRoutes.js
    │   ├── returnRoutes.js
    │   ├── reportRoutes.js
    │   └── adminRoutes.js
    │
    ├── middlewares/
    │   ├── asyncHandler.js
    │   ├── errorHandler.js
    │   ├── authenticate.js             ← JWT verify
    │   ├── authorize.js                ← role check
    │   ├── rateLimiter.js              ← request throttle
    │   └── validate.js                 ← input check
    │
    └── validators/
        ├── authValidator.js
        ├── profileValidator.js
        ├── incomeValidator.js
        └── returnValidator.js
```

---

# অধ্যায় ৯: Development Roadmap (Phase by Phase)

## Phase 1: Architecture & Planning ✅ (এখন সম্পন্ন)

```
Objective:   পুরো system এর blueprint তৈরি করা
Duration:    ১ সপ্তাহ
Status:      এই document ই Phase 1 এর output

Deliverables:
  ✅ System Architecture Design
  ✅ Database Schema Design (12 collections)
  ✅ API Endpoint Design
  ✅ Folder Structure
  ✅ Development Roadmap

Learning Objectives:
  → Software Architecture কী এবং কেন দরকার
  → Layered Architecture এর সুবিধা
  → Database Design এর নীতিমালা
  → API Design এর best practices
  → ERD কীভাবে পড়তে হয়
```

---

## Phase 2: Authentication (পরবর্তী কাজ)

```
Objective:   Secure login system তৈরি করা
Duration:    ১ সপ্তাহ

Features:
  → User Registration (name, email, password)
  → Password Hashing (bcrypt, salt rounds: 12)
  → Login (email + password → JWT token)
  → JWT Token: payload = { id, role, iat, exp }
  → Protected route middleware (authenticate.js)
  → Role-based middleware (authorize.js)
  → "Get Me" API (/auth/me)
  → Change Password API
  → Logout (client-side token remove)

Database Changes:
  → users collection তৈরি

New APIs:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  GET  /api/v1/auth/me        [Protected]
  PUT  /api/v1/auth/change-password [Protected]

Learning Objectives:
  → bcrypt কীভাবে কাজ করে (hash + salt)
  → JWT structure: Header.Payload.Signature
  → Stateless authentication কী
  → Middleware chain কীভাবে কাজ করে
  → Role-based access control (RBAC)
  → HTTP 401 vs 403 পার্থক্য
```

---

## Phase 3: Income Management

```
Objective:   বিভিন্ন ধরনের Income track করা
Duration:    ২ সপ্তাহ

Features:
  → Tax Profile CRUD
  → Salary Income CRUD + auto-calculation
      (grossSalary, salaryExemption, taxableSalary)
  → Business Income CRUD + net profit calculation
  → Professional Income CRUD
  → Rental Income CRUD + repair deduction calculation

Database Changes:
  → taxprofiles collection
  → salaryincomes collection
  → businessincomes collection
  → professionalincomes collection
  → rentalincomes collection

New APIs:
  POST/GET/PUT /api/v1/profile
  POST/GET/PUT/DELETE /api/v1/income/salary
  POST/GET/PUT/DELETE /api/v1/income/business
  POST/GET/PUT/DELETE /api/v1/income/professional
  POST/GET/PUT/DELETE /api/v1/income/rental

Learning Objectives:
  → Mongoose Schema Validation
  → Mongoose pre-save hooks (calculation এর জন্য)
  → Service Layer pattern
  → { userId, taxYear } composite index
  → Input Validation (express-validator)
  → One-to-One relationship (userId reference)
```

---

## Phase 4: TDS Management

```
Objective:   TDS record রাখা ও aggregate করা
Duration:    ১ সপ্তাহ

Features:
  → Multiple TDS sources
  → Advance Tax record
  → Final TDS (savings certificate, dividend)
  → Total TDS auto-calculation

Database Changes:
  → tdsrecords collection (Array of subdocuments)

New APIs:
  POST/GET/PUT/DELETE /api/v1/tds

Learning Objectives:
  → Mongoose Array of Subdocuments
  → Document এর ভেতরে Array কীভাবে manage করে
  → $push, $pull operators
```

---

## Phase 5: Investment & Rebate

```
Objective:   Investment track করা ও Section 78 Rebate গণনা
Duration:    ১ সপ্তাহ

Features:
  → 11 ধরনের investment input
  → Sanchayapatra (আলাদা নিয়মে)
  → Section 78 Rebate formula:
      eligible = min(rawInvestment, 3%×income, 10,00,000)
      rebate = eligible × 15%
  → Sanchayapatra rebate = amount × 15%
  → Rebate preview API

Database Changes:
  → investments collection

New APIs:
  POST/GET/PUT     /api/v1/investment
  GET              /api/v1/investment/rebate-preview

Learning Objectives:
  → Complex business logic কে Service এ isolate করা
  → min() logic এবং cap calculation
  → Dependent calculation (income দরকার rebate হিসাবে)
```

---

## Phase 6: Tax Calculation Engine ★

```
Objective:   সব income একত্র করে NBR নিয়মে কর গণনা
Duration:    ২ সপ্তাহ

Features:
  → সব income sources aggregate করা
  → TaxRule থেকে dynamic slabs ও thresholds পড়া
  → Progressive slab tax calculation
  → Investment rebate apply করা
  → Minimum tax floor apply করা
  → Wealth surcharge গণনা
  → TDS adjustment
  → Final payable tax বা Refund নির্ধারণ
  → Calculation cache (taxcalculations collection)
  → TaxRule management (Admin)
  → Seed initial tax rules (AY 2026-27)

Database Changes:
  → taxcalculations collection
  → taxrules collection (initial seed data)

New APIs:
  GET  /api/v1/tax/calculate?taxYear=2025-26
  GET  /api/v1/tax/summary?taxYear=2025-26
  GET  /api/v1/tax/slabs                     [Public]

Learning Objectives:
  → Complex calculation engine design
  → Mongoose populate (FK join)
  → Caching strategy (stale calculation)
  → Dynamic configuration (TaxRule থেকে পড়া)
  → Progressive tax algorithm
```

---

## Phase 7: Tax Return Management

```
Objective:   কর রিটার্ন তৈরি, সংরক্ষণ ও জমা দেওয়া
Duration:    ১.৫ সপ্তাহ

Features:
  → Draft Return তৈরি (calculation snapshot নেওয়া)
  → Return edit ও preview
  → Return submit
  → Acknowledgement number generate ("TR-2026-XXXXX")
  → Status tracking
  → Admin: approve/reject with notes

Database Changes:
  → taxreturns collection

New APIs:
  POST   /api/v1/return
  GET    /api/v1/return
  GET    /api/v1/return/:id
  PUT    /api/v1/return/:id
  DELETE /api/v1/return/:id
  POST   /api/v1/return/:id/submit
  GET    /api/v1/return/:id/status

Learning Objectives:
  → State Machine pattern (status transitions)
  → Snapshot pattern (data at a point in time)
  → Atomic operations
  → Business rule enforcement (submitted → cannot edit)
  → Unique ID generation
```

---

## Phase 8: Reports & Analytics

```
Objective:   Income, Tax ও TDS এর Report তৈরি করা
Duration:    ১.৫ সপ্তাহ

Features:
  → Income source wise breakdown report
  → Tax calculation detail report
  → TDS source wise report
  → Annual summary (printable format)

New APIs:
  GET /api/v1/report/income
  GET /api/v1/report/tax
  GET /api/v1/report/tds
  GET /api/v1/report/annual

Learning Objectives:
  → MongoDB Aggregation Pipeline
  → $group, $match, $project, $lookup operators
  → $sum, $avg aggregation expressions
  → Report structure design
  → Query optimization
```

---

## Phase 9: Admin Panel

```
Objective:   System পরিচালনার জন্য Admin API
Duration:    ১ সপ্তাহ

Features:
  → User list, activate/deactivate, delete
  → All tax returns list ও review
  → Approve/Reject returns
  → Tax Rule update (নতুন বছরের slabs)
  → System-wide statistics

Database Changes:
  → auditlogs collection

New APIs:
  GET/PUT/DELETE /api/v1/admin/users/*
  GET/PUT        /api/v1/admin/returns/*
  GET/POST/PUT   /api/v1/admin/rules/*

Learning Objectives:
  → Admin vs User data separation
  → Audit logging pattern
  → Pagination (skip, limit)
  → System statistics via aggregation
```

---

## Phase 10: Deployment

```
Objective:   Production এ deploy করা
Duration:    ১ সপ্তাহ

Features:
  → Environment separation (dev/staging/prod)
  → MongoDB Atlas (cloud database)
  → Railway / Render / VPS deployment
  → Environment variables management
  → Rate limiting (express-rate-limit)
  → Helmet.js (security headers)
  → CORS configuration
  → PM2 process management

Learning Objectives:
  → Production vs Development environment
  → MongoDB Atlas setup
  → Cloud deployment process
  → Security hardening
  → Process management (PM2)
  → HTTPS ও SSL
```

---

# অধ্যায় ১০: ভবিষ্যতে যা যোগ করা যেতে পারে

```
Module                  কারণ
──────────────────────  ────────────────────────────────────────────────
Email Notification      Return approved/rejected হলে email পাঠানো
                        (nodemailer + SendGrid)

PDF Generation          Annual summary PDF download
                        (puppeteer / pdfmake)

OTP Verification        Login এর সময় extra security
                        (phone OTP via SMS API)

Document Upload         TDS certificate, investment proof upload
                        (Multer + Cloudinary/S3)

Asset Module            সম্পত্তি ও নেট সম্পদ declaration
                        (Wealth Surcharge এর জন্য)

Corporate Tax Module    Company এর কর হিসাব (আলাদা নিয়ম)
                        (Flat rate, different slabs)

VAT Module              VAT return management
                        (Mushak 9.1, input rebate)

Multi-year Support      ৫ বছরের history দেখা
                        (taxYear parameter সব API তে আছে)

Tax Consultant Role     CA/Tax consultant access
                        (Third role: "consultant")

Refund Tracking         Refund claim ও status track
                        (New collection: refundClaims)

Notification System     In-app notification
                        (New collection: notifications)

Two-Factor Auth (2FA)   Extra security layer
                        (Google Authenticator / TOTP)
```

---

# অধ্যায় ১১: Key Design Decisions (কেন এভাবে করলাম)

```
Decision                        কারণ
──────────────────────────────  ────────────────────────────────────────
taxcalculations আলাদা collection  প্রতিবার সব data নতুন করে calculate
                                না করে cache করে রাখা হয়
                                Data change হলে isStale=true করা হয়

taxrules আলাদা collection       NBR প্রতি বছর slabs পরিবর্তন করে
                                Hard-code না করে dynamic রাখলে
                                শুধু Admin update করবে, code পরিবর্তন লাগবে না

{ userId, taxYear } unique index একজন user এর এক বছরে duplicate record
                                যাতে না হয়

Return এ snapshot নেওয়া         Return submit হওয়ার পর income edit হলেও
                                return এর calculation unchanged থাকবে

Service Layer আলাদা             Controller এ business logic না রেখে
                                test করা সহজ, reuse করা যায়

auditlogs collection            Security, debugging ও compliance এর জন্য
                                কে কখন কী করেছে track করা
```

---

*এই Design Document টি Phase 2 শুরু করার আগে review করো।*
*যেকোনো পরিবর্তন এখানে আগে করো, code এ পরে।*

**পরবর্তী কাজ → Phase 2: Authentication Module**
