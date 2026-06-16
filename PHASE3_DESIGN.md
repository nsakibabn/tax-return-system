# Phase 3: Income Management Module
# Architecture & Design Document

**Status:** Design Review  
**Author:** Senior Software Architect  
**Project:** Bangladesh Tax Return Management System

---

# সিদ্ধান্ত ১: Database Design Approach

## Option A — Separate Collections (আলাদা আলাদা)

```
salary_incomes      → শুধু বেতনের তথ্য
business_incomes    → শুধু ব্যবসার তথ্য
professional_incomes → শুধু Freelancer এর তথ্য
rental_incomes      → শুধু ভাড়ার তথ্য
```

### Pros ✅

```
১. Schema স্পষ্ট ও Type-Safe
   Salary schema তে শুধু salary fields
   কোনো "details" object নেই যেখানে যা খুশি দেওয়া যায়

২. Validation সহজ
   প্রতিটি collection এর নিজস্ব validation rules
   Salary এর basicSalary required → শুধু salary এ apply হয়
   Business এর businessName required → শুধু business এ apply হয়

৩. Query Performance ভালো
   "আমার বেতন দেখাও" → salary_incomes এ শুধু এক collection query
   Index শুধু সেই collection এর জন্য optimized

৪. Business Logic আলাদা
   SalaryCalculationService → শুধু salary logic
   BusinessCalculationService → শুধু business logic
   Mixed হয় না

৫. Scalability সহজ
   ভবিষ্যতে capital_gains collection যোগ করলে
   অন্য collections এ কোনো প্রভাব নেই

৬. Code পড়া সহজ
   User.findById → SalaryIncome.find({ userId })
   কোনো type filter লাগে না
```

### Cons ❌

```
১. "সব income" দেখাতে ৪টি collection query করতে হয়
   → কিন্তু: Tax Engine এ এটা lazily করা যায়

২. বেশি files
   → কিন্তু: প্রতিটি file ছোট ও focused
```

---

## Option B — Single Collection (একসাথে)

```javascript
{
  userId: ObjectId,
  incomeType: "salary" | "business" | "professional" | "rental",
  taxYear: "2025-26",
  details: {
    // salary হলে:   { basicSalary, houseRent, ... }
    // business হলে: { businessName, revenue, ... }
    // সব type এর field এখানে মিশে থাকে
  },
  totalIncome: Number
}
```

### Pros ✅

```
১. সব income এক query তে পাওয়া যায়
   Income.find({ userId }) → সব type একসাথে

২. কম files লিখতে হয়
```

### Cons ❌

```
১. Schema Validation দুর্বল ★★★ (সবচেয়ে বড় সমস্যা)
   details field Mixed type → Mongoose validation apply হয় না
   salary income এ businessName দিলেও error আসবে না
   কারণ details এর structure dynamic

২. Business Logic জটিল হয়
   type check সর্বত্র করতে হয়:
   if (income.type === 'salary') { ... }
   else if (income.type === 'business') { ... }
   Controller, Service, Validation সব জায়গায়

৩. Index Inefficiency
   incomeType field এ index দিলেও
   salary specific fields এ index দেওয়া যায় না

৪. API Design ঘোলাটে
   POST /api/incomes → body তে type পাঠাতে হয়
   Validation কীভাবে হবে? type দেখে?

৫. Future এ নতুন type যোগ কঠিন
   details এর structure বদলালে পুরনো data এ impact

৬. Tax Calculation কঠিন
   Engine কে সব time type check করতে হবে
   প্রতিটি type এর calculation আলাদা — mixed হলে messy
```

---

## ✅ আমার Recommendation: Option A (Separate Collections)

### কারণ — এই Tax System এর জন্য:

```
কারণ ১: প্রতিটি Income Type সম্পূর্ণ আলাদা
─────────────────────────────────────────────
Salary:       basicSalary, houseRent, medicalAllowance...
Business:     revenue, COGS, depreciation, businessType...
Professional: serviceType, foreignRemittance...
Rental:       propertyType, repairDeduction (25%/30%)...

এগুলোর মধ্যে কোনো shared field নেই (শুধু userId ও taxYear ছাড়া)
তাই single collection এ রাখা মানে জোর করে একত্র করা

কারণ ২: Calculation Logic সম্পূর্ণ আলাদা
─────────────────────────────────────────────
Salary:       min(gross/3, 500000) exemption
Business:     revenue - COGS - expenses - depreciation
Professional: gross - professionalExpenses
Rental:       rent × (25% বা 30%) deduction

আলাদা collection → আলাদা service → পরিষ্কার code

কারণ ৩: Tax Engine পরে আলাদা collection aggregate করবে
─────────────────────────────────────────────
Tax Calculation Engine (Phase 6) সব collection থেকে
taxable income নিয়ে একত্র করবে।
এটা planned behaviour — problem নয়।

কারণ ৪: Validation সম্পূর্ণ Type-Safe হবে
─────────────────────────────────────────────
SalaryIncome schema তে basicSalary: { required: true }
Business Income schema তে businessName: { required: true }
Cross-contamination সম্ভব নয়

কারণ ৫: Bangladesh NBR Rule প্রতি Type এ আলাদা
─────────────────────────────────────────────
Salary:       6th Schedule Exemption
Business:     Revenue - Expenses (Accounts book rules)
Rental:       Municipal tax deduction
Professional: Foreign remittance exemption

আলাদা collection → আলাদা NBR rule → পরিষ্কার
```

---

# সিদ্ধান্ত ২: Architecture Pattern

## Repository Pattern ব্যবহার করব

```
Route → Controller → Service → Repository → Model → MongoDB

কেন Repository Layer?
─────────────────────────────────────────────────────────
Service:     Business Logic (calculation, validation rules)
Repository:  Database Operation (find, create, update, delete)

সুবিধা:
১. Service এ MongoDB query নেই → শুধু business logic
২. Database change হলে শুধু Repository বদলাবে
৩. Unit testing সহজ (Repository mock করা যায়)
৪. Code responsibility আরো স্পষ্ট
```

### Request Flow

```
POST /api/incomes/salary
        │
        ▼
[validateSalaryIncome] ← Validation Layer
        │
        ▼
[authenticate] ← JWT Check
        │
        ▼
[salaryController.create]
        │
        ▼
[salaryIncomeService.create]
  │  ← Business Logic: calculation, rules
  │
        ▼
[salaryIncomeRepository.create]
  │  ← Database Operation only
  │
        ▼
[SalaryIncome Model] → MongoDB
        │
        ▼
Response: { success, data }
```

---

# সিদ্ধান্ত ৩: Business Logic Design

## ৩.১ Salary Income Calculation

```
Input (User দেয়):
  basicSalary          → মাসিক মূল বেতন
  houseRentAllowance   → মাসিক বাড়িভাড়া ভাতা
  medicalAllowance     → মাসিক চিকিৎসা ভাতা
  transportAllowance   → মাসিক যাতায়াত ভাতা
  festivalBonus        → বার্ষিক উৎসব বোনাস
  otherAllowances      → বার্ষিক অন্যান্য (overtime, leave encashment...)
  designation          → পদবি (তথ্যের জন্য)
  employerName         → নিয়োগকর্তার নাম
  employeeType         → "private" | "govt"

Calculation (System করবে):
  annualBasic          = basicSalary × 12
  annualHRA            = houseRentAllowance × 12
  annualMedical        = medicalAllowance × 12
  annualTransport      = transportAllowance × 12

  grossEmploymentIncome = annualBasic + annualHRA + annualMedical
                        + annualTransport + festivalBonus + otherAllowances

  IF employeeType = "private":
    salaryExemption = min(grossEmploymentIncome / 3, 500000)

  IF employeeType = "govt" (SRO 225/2023):
    salaryExemption = grossEmploymentIncome - (annualBasic + festivalBonus)
    // শুধু Basic ও Festival Bonus করযোগ্য, বাকি সব করমুক্ত

  taxableSalary = grossEmploymentIncome - salaryExemption

Output (System save করবে):
  grossEmploymentIncome, salaryExemption, taxableSalary
```

## ৩.২ Business Income Calculation

```
Input:
  annualRevenue        → মোট বার্ষিক আয়
  costOfGoodsSold      → পণ্যের খরচ (COGS)
  operatingExpenses    → পরিচালন ব্যয়
  depreciation         → অবচয়
  businessType         → "trading" | "manufacturing" | "service"
  hasAccountsBook      → হিসাবের বই আছে?

  agricultureRevenue   → কৃষি আয় (optional)
  hasAgriBook          → কৃষি হিসাবের বই?

  capitalGainsShares   → শেয়ার বিক্রির মুনাফা
  bankInterest         → ব্যাংক সুদ

Calculation:
  IF business:
    grossProfit        = annualRevenue - costOfGoodsSold
    netBusinessProfit  = grossProfit - operatingExpenses - depreciation

  IF agriculture (no book):
    netAgriIncome      = agricultureRevenue × 0.40 (60% deemed expense)

  IF agriculture (with book):
    netAgriIncome      = agricultureRevenue - agriExpenses

  totalBusinessIncome  = netBusinessProfit + netAgriIncome
                       + capitalGainsShares + bankInterest
```

## ৩.৩ Professional Income Calculation

```
Input:
  serviceType          → "it" | "consulting" | "medical" | "legal" | "other"
  grossServiceIncome   → মোট service আয়
  professionalExpenses → পেশাদার খরচ
  legalForeignRemittance → আইনি বৈদেশিক রেমিট্যান্স (করমুক্ত)
  otherForeignIncome   → অন্যান্য বৈদেশিক আয় (করযোগ্য)
  royalties            → রয়্যালটি আয়

Calculation:
  netProfessionalIncome = grossServiceIncome - professionalExpenses
                        + otherForeignIncome + royalties
  // legalForeignRemittance যোগ হয় না (করমুক্ত)

  taxableProfessionalIncome = netProfessionalIncome
```

## ৩.৪ Rental Income Calculation

```
Input:
  propertyType         → "residential" | "commercial"
  annualRent           → বার্ষিক ভাড়া
  maintenanceExpense   → রক্ষণাবেক্ষণ খরচ
  propertyTax          → পৌর কর / সিটি কর্পোরেশন কর
  mortgageInterest     → বন্ধকী সুদ (যদি থাকে)

Calculation:
  IF residential:
    repairDeduction    = annualRent × 0.25 (২৫% স্বয়ংক্রিয় ছাড়)
  IF commercial:
    repairDeduction    = annualRent × 0.30 (৩০% স্বয়ংক্রিয় ছাড়)

  netRentalIncome      = annualRent
                       - repairDeduction
                       - maintenanceExpense
                       - propertyTax
                       - mortgageInterest
```

---

# সিদ্ধান্ত ৪: Database Schema Design

## Schema ১: SalaryIncome

```javascript
{
  _id:          ObjectId   [auto]
  userId:       ObjectId   [required] → users._id
  taxYear:      String     [required] "2025-26"

  // User Input
  employerName:          String  [required]
  designation:           String  [optional]
  employeeType:          String  [required] "private"|"govt"
  basicSalary:           Number  [required] min:0  (মাসিক)
  houseRentAllowance:    Number  [default:0]       (মাসিক)
  medicalAllowance:      Number  [default:0]       (মাসিক)
  transportAllowance:    Number  [default:0]       (মাসিক)
  festivalBonus:         Number  [default:0]       (বার্ষিক)
  otherAllowances:       Number  [default:0]       (বার্ষিক)

  // System Calculated
  grossEmploymentIncome: Number  [default:0]
  salaryExemption:       Number  [default:0]
  taxableSalary:         Number  [default:0]

  timestamps: true
  Unique Index: { userId, taxYear } — এক বছরে এক salary record
}
```

## Schema ২: BusinessIncome

```javascript
{
  _id:          ObjectId
  userId:       ObjectId   [required] → users._id
  taxYear:      String     [required]

  // ব্যবসায়িক আয়
  businessName:       String  [optional]
  businessType:       String  "trading"|"manufacturing"|"service"|"other"
  annualRevenue:      Number  [default:0]
  costOfGoodsSold:    Number  [default:0]
  operatingExpenses:  Number  [default:0]
  depreciation:       Number  [default:0]

  // কৃষি আয়
  agricultureRevenue: Number  [default:0]
  hasAgriBook:        Boolean [default:false]
  agriExpenses:       Number  [default:0]  (only if hasAgriBook: true)

  // অন্যান্য
  capitalGainsShares: Number  [default:0]
  bankInterest:       Number  [default:0]
  savingsCertIncome:  Number  [default:0]  (final tax: 10%)
  dividendIncome:     Number  [default:0]  (final tax: 10%)

  // System Calculated
  netBusinessProfit:  Number  [default:0]
  netAgriIncome:      Number  [default:0]
  totalBusinessIncome: Number [default:0]

  timestamps: true
  Unique Index: { userId, taxYear }
}
```

## Schema ৩: ProfessionalIncome

```javascript
{
  _id:          ObjectId
  userId:       ObjectId   [required] → users._id
  taxYear:      String     [required]

  serviceType:            String  "it"|"consulting"|"medical"|"legal"|"other"
  grossServiceIncome:     Number  [default:0]
  professionalExpenses:   Number  [default:0]
  legalForeignRemittance: Number  [default:0]  (করমুক্ত)
  otherForeignIncome:     Number  [default:0]
  royalties:              Number  [default:0]

  // System Calculated
  netProfessionalIncome:      Number  [default:0]
  taxableProfessionalIncome:  Number  [default:0]

  timestamps: true
  Unique Index: { userId, taxYear }
}
```

## Schema ৪: RentalIncome

```javascript
{
  _id:          ObjectId
  userId:       ObjectId   [required] → users._id
  taxYear:      String     [required]

  // Multiple Properties (Array)
  properties: [
    {
      propertyName:       String  [required]
      propertyType:       String  [required] "residential"|"commercial"
      annualRent:         Number  [required] min:0
      maintenanceExpense: Number  [default:0]
      propertyTax:        Number  [default:0]
      mortgageInterest:   Number  [default:0]

      // System Calculated (per property)
      repairDeduction:    Number  [default:0]
      netRentalIncome:    Number  [default:0]
    }
  ]

  // System Calculated (total)
  totalNetRentalIncome: Number  [default:0]

  timestamps: true
  Unique Index: { userId, taxYear }
}
```

---

# সিদ্ধান্ত ৫: ER Diagram (Text Format)

```
┌──────────────────────────────────────────────────────────────┐
│                          users                               │
│  _id (PK) | name | email | password | role | isActive       │
└─────────────────────────────┬────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────────┐
          │                   │                        │
          │ (1:1 per year)    │ (1:1 per year)         │ (1:1 per year)
          ▼                   ▼                        ▼
┌──────────────────┐ ┌──────────────────┐  ┌──────────────────────┐
│  salary_incomes  │ │ business_incomes  │  │ professional_incomes  │
│──────────────────│ │──────────────────│  │──────────────────────│
│ userId (FK) ●────┤ │ userId (FK) ●────┤  │ userId (FK) ●────    │
│ taxYear          │ │ taxYear          │  │ taxYear              │
│ basicSalary      │ │ annualRevenue    │  │ grossServiceIncome   │
│ grossIncome ✦    │ │ netProfit ✦      │  │ netIncome ✦          │
│ taxableSalary ✦  │ │ totalBusiness ✦  │  │ taxableIncome ✦      │
└──────────────────┘ └──────────────────┘  └──────────────────────┘

          │ (1:1 per year)
          ▼
┌────────────────────────┐
│    rental_incomes      │
│────────────────────────│
│ userId (FK) ●──────    │
│ taxYear                │
│ properties [ ]         │  ← Array of subdocuments
│   .propertyName        │
│   .annualRent          │
│   .netRentalIncome ✦   │
│ totalNetRental ✦       │
└────────────────────────┘

          │ (সব income একত্র — Phase 6 তে)
          ▼
┌──────────────────────────────────────────────────────────┐
│                  tax_calculations                        │  Phase 6
│  totalSalary + totalBusiness + totalProfessional         │
│  + totalRental = totalIncome → Tax Engine                │
└──────────────────────────────────────────────────────────┘

          │                     │                    │
          ▼ (Phase 4)           ▼ (Phase 5)          ▼ (Phase 7)
    tds_records            investments           tax_returns

● = Foreign Key (userId → users._id)
✦ = System calculated (not user input)
1:1 per year = একজন user এর এক বছরে একটিই record (unique index)
```

---

# সিদ্ধান্ত ৬: API Contract

## Salary APIs

```
─────────────────────────────────────────────────────────────
POST /api/incomes/salary
Purpose: নতুন বেতন আয়ের তথ্য যোগ করো
Auth: Required (JWT)
Ownership: নিজের data নিজে create

Request Body:
{
  "taxYear": "2025-26",
  "employerName": "ABC Company Ltd",
  "designation": "Software Engineer",
  "employeeType": "private",
  "basicSalary": 60000,
  "houseRentAllowance": 30000,
  "medicalAllowance": 5000,
  "transportAllowance": 3000,
  "festivalBonus": 120000,
  "otherAllowances": 0
}

Success Response (201):
{
  "success": true,
  "message": "Salary income added successfully",
  "data": {
    "_id": "...",
    "userId": "...",
    "taxYear": "2025-26",
    "employerName": "ABC Company Ltd",
    "basicSalary": 60000,
    ...
    "grossEmploymentIncome": 1356000,  ← System calculated
    "salaryExemption": 452000,          ← min(1356000/3, 500000)
    "taxableSalary": 904000            ← System calculated
  }
}

Error Responses:
  400 → Validation failed (required fields missing)
  409 → Salary income already exists for this tax year
        (unique index: userId + taxYear)
  401 → Not authenticated
─────────────────────────────────────────────────────────────

GET /api/incomes/salary
Purpose: নিজের সব salary records দেখো
Auth: Required
Query: ?taxYear=2025-26 (optional filter)

Success Response (200):
{
  "success": true,
  "count": 1,
  "data": [ { ...salaryRecord } ]
}

─────────────────────────────────────────────────────────────

GET /api/incomes/salary/:id
Purpose: একটি নির্দিষ্ট salary record দেখো
Auth: Required
Ownership: শুধু নিজেরটা দেখা যাবে

Error: 403 → অন্যের record access করলে
Error: 404 → Record পাওয়া যায়নি

─────────────────────────────────────────────────────────────

PUT /api/incomes/salary/:id
Purpose: Salary record আপডেট করো
Auth: Required + Ownership
Body: Same as POST (partial update supported)

Note: Update এর পর calculation আবার হবে

─────────────────────────────────────────────────────────────

DELETE /api/incomes/salary/:id
Purpose: Salary record মুছো
Auth: Required + Ownership
Note: Submitted tax return আছে কিনা check করতে হবে (Phase 7)

Success Response (200):
{
  "success": true,
  "message": "Salary income deleted successfully"
}
```

## Business, Professional, Rental APIs

```
(Same CRUD pattern — শুধু URL ও fields আলাদা)

POST   /api/incomes/business
GET    /api/incomes/business
GET    /api/incomes/business/:id
PUT    /api/incomes/business/:id
DELETE /api/incomes/business/:id

POST   /api/incomes/professional
GET    /api/incomes/professional
...

POST   /api/incomes/rental
GET    /api/incomes/rental
...
```

## Bonus API: Income Summary

```
GET /api/incomes/summary?taxYear=2025-26
Purpose: সব income type একসাথে সংক্ষেপে দেখো
Auth: Required

Response:
{
  "success": true,
  "data": {
    "taxYear": "2025-26",
    "salary": { "taxableSalary": 904000 },
    "business": { "totalBusinessIncome": 0 },
    "professional": { "netProfessionalIncome": 0 },
    "rental": { "totalNetRentalIncome": 0 },
    "grandTotalIncome": 904000
  }
}
```

---

# সিদ্ধান্ত ৭: Validation Rules

## Salary Validation

```
taxYear:              required, pattern /^\d{4}-\d{2}$/
employerName:         required, string, 2-100 chars
employeeType:         required, enum ["private", "govt"]
basicSalary:          required, number, min: 1
houseRentAllowance:   optional, number, min: 0
medicalAllowance:     optional, number, min: 0
transportAllowance:   optional, number, min: 0
festivalBonus:        optional, number, min: 0
otherAllowances:      optional, number, min: 0
```

## Business Validation

```
taxYear:              required
businessType:         optional, enum ["trading","manufacturing","service","other"]
annualRevenue:        optional, number, min: 0
costOfGoodsSold:      optional, number, min: 0
operatingExpenses:    optional, number, min: 0
agriExpenses:         optional (required if hasAgriBook: true)
```

## Professional Validation

```
taxYear:              required
serviceType:          required, enum ["it","consulting","medical","legal","other"]
grossServiceIncome:   optional, number, min: 0
professionalExpenses: optional, number, min: 0
```

## Rental Validation

```
taxYear:              required
properties:           required, array, min 1 item
  .propertyName:      required, string
  .propertyType:      required, enum ["residential","commercial"]
  .annualRent:        required, number, min: 1
  .maintenanceExpense: optional, number, min: 0
  .propertyTax:       optional, number, min: 0
```

---

# সিদ্ধান্ত ৮: Security Design

## ৮.১ Ownership Verification

```
সমস্যা:
  User A → GET /api/incomes/salary/ID_of_User_B → তথ্য দেখতে পাবে?

সমাধান: checkOwnership Middleware
  ১. URL থেকে :id নিয়ে DB তে খোঁজো
  ২. record.userId === req.user._id কিনা check
  ৩. না হলে 403 Forbidden
  ৪. হলে next()

Middleware Structure:
  checkOwnership(Model) → reusable factory function
  একই middleware সব income type এ কাজ করবে
```

## ৮.২ Admin Override

```
Admin সব users এর data দেখতে পারবে
checkOwnership এ:
  IF req.user.role === "admin" → skip ownership check
  ELSE → normal ownership check
```

## ৮.৩ MongoDB Injection Protection

```
mongoose.sanitizeFilter() → auto enabled
Input হিসেবে { "$gt": "" } type দিলে sanitize হবে
```

## ৮.৪ Data Isolation

```
সব query তে userId filter:
  Model.find({ userId: req.user._id })   → নিজের data
  Model.find({ userId: req.params.userId }) → Admin only

কখনো Model.find({}) করা যাবে না (Admin ছাড়া)
```

---

# সিদ্ধান্ত ৯: Final Folder Structure

```
src/
│
├── config/
│   └── db.js
│
├── constants/                     ← NEW
│   └── incomeConstants.js         ← Tax rates, deduction rates, enums
│
├── models/
│   ├── User.js                    ← আগে তৈরি
│   ├── SalaryIncome.js            ← NEW
│   ├── BusinessIncome.js          ← NEW
│   ├── ProfessionalIncome.js      ← NEW
│   └── RentalIncome.js            ← NEW
│
├── repositories/                  ← NEW (Database operations only)
│   ├── salaryRepository.js
│   ├── businessRepository.js
│   ├── professionalRepository.js
│   └── rentalRepository.js
│
├── services/
│   ├── authService.js             ← আগে তৈরি
│   ├── salaryIncomeService.js     ← NEW (Business logic + calculation)
│   ├── businessIncomeService.js   ← NEW
│   ├── professionalIncomeService.js ← NEW
│   ├── rentalIncomeService.js     ← NEW
│   └── incomeSummaryService.js    ← NEW (সব income একত্র করা)
│
├── controllers/
│   ├── authController.js          ← আগে তৈরি
│   ├── userController.js          ← আগে তৈরি
│   ├── salaryController.js        ← NEW
│   ├── businessController.js      ← NEW
│   ├── professionalController.js  ← NEW
│   └── rentalController.js        ← NEW
│
├── routes/
│   ├── index.js
│   ├── authRoutes.js              ← আগে তৈরি
│   ├── userRoutes.js              ← আগে তৈরি
│   └── incomeRoutes.js            ← NEW (সব income route একসাথে)
│
├── middlewares/
│   ├── asyncHandler.js
│   ├── errorHandler.js
│   ├── authenticate.js
│   ├── authorize.js
│   └── checkOwnership.js          ← NEW (resource ownership check)
│
└── validators/
    ├── authValidator.js           ← আগে তৈরি
    ├── salaryValidator.js         ← NEW
    ├── businessValidator.js       ← NEW
    ├── professionalValidator.js   ← NEW
    └── rentalValidator.js         ← NEW
```

---

# সিদ্ধান্ত ১০: Service Layer Design

## প্রতিটি Income Service যা করবে:

```
salaryIncomeService.create(userId, data):
  ১. taxYear এ already record আছে কিনা check
     → আছে: 409 error ("Salary already exists for 2025-26")
  ২. calculation করো:
     grossEmploymentIncome, salaryExemption, taxableSalary
  ৩. salaryRepository.create() কে data পাঠাও
  ৪. created record return করো

salaryIncomeService.update(id, userId, data):
  ১. ownership check (repository তে)
  ২. নতুন data দিয়ে calculation আবার করো (re-calculate)
  ৩. salaryRepository.update() call করো
  ৪. updated record return করো

salaryIncomeService.delete(id, userId):
  ১. ownership check
  ২. (Phase 7) submitted return check করো
  ৩. salaryRepository.delete() call করো
```

## Constants File (incomeConstants.js):

```javascript
SALARY_EXEMPTION_DIVISOR = 3
SALARY_EXEMPTION_MAX = 500000
RESIDENTIAL_REPAIR_RATE = 0.25
COMMERCIAL_REPAIR_RATE = 0.30
AGRI_DEEMED_EXPENSE_RATE = 0.60  // বই ছাড়া ৬০% খরচ ধরা হয়
```

---

# Implementation Plan

```
Step 1: constants/incomeConstants.js
Step 2: Models (SalaryIncome, BusinessIncome, Professional, Rental)
Step 3: checkOwnership Middleware
Step 4: Validators (salary, business, professional, rental)
Step 5: Repositories (4টি)
Step 6: Services (4টি + incomeSummary)
Step 7: Controllers (4টি)
Step 8: incomeRoutes.js + index.js update
Step 9: Test (Postman)
Step 10: Income Summary API
```

---

**Design Status: READY FOR REVIEW**

এই Design Approve হলে Implementation শুরু হবে।
