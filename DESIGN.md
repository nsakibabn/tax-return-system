# Bangladesh Tax Return Management System
## সম্পূর্ণ Architecture, Database Design & Development Roadmap

---

# ১. System Overview — সিস্টেম কী করবে?

```
┌─────────────────────────────────────────────────────────────────────┐
│              Bangladesh Tax Return Management System                │
│                                                                     │
│  একজন Taxpayer এই System এ যা করতে পারবেন:                         │
│                                                                     │
│  ১. Register ও Login করবেন (JWT দিয়ে secure)                       │
│  ২. বিভিন্ন Income এর তথ্য দেবেন (Salary, Business, Rental...)     │
│  ৩. TDS তথ্য যোগ করবেন                                             │
│  ৪. Investment তথ্য দিয়ে Rebate পাবেন                              │
│  ৫. Tax Calculation Engine স্বয়ংক্রিয়ভাবে কর হিসাব করবে          │
│  ৬. Tax Return জমা দেবেন ও Status দেখবেন                          │
│  ৭. Report ডাউনলোড করবেন                                           │
│                                                                     │
│  Admin যা করতে পারবেন:                                              │
│  ১. সব Users দেখবেন ও Manage করবেন                                 │
│  ২. Tax Rules ও Slabs আপডেট করবেন (NBR পরিবর্তন হলে)              │
│  ৩. সব Tax Returns Review করবেন                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# ২. Architecture Design — কীভাবে তৈরি হবে?

## Architecture Pattern: Layered Architecture (MVC + Service Layer)

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Postman / Frontend)           │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP Request
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   ROUTE LAYER                           │
│  /api/v1/auth, /api/v1/income, /api/v1/tax...          │
│  কাজ: কোন URL কোন Controller এ যাবে তা ঠিক করে        │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  MIDDLEWARE LAYER                        │
│  • authenticate (JWT verify করে)                        │
│  • authorize (role check করে: user/admin)               │
│  • validate (input data ঠিক আছে কিনা দেখে)             │
│  • asyncHandler (try/catch ছাড়া error ধরে)             │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 CONTROLLER LAYER                         │
│  কাজ: Request নেয়, Service কে বলে, Response পাঠায়     │
│  • authController                                       │
│  • salaryController                                     │
│  • businessController                                   │
│  • taxController                                        │
│  • returnController                                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  SERVICE LAYER  ← সবচেয়ে গুরুত্বপূর্ণ  │
│  কাজ: আসল Business Logic এখানে থাকে                    │
│  • authService (register, login, token)                 │
│  • incomeService (income গণনা)                          │
│  • taxCalculationService (কর হিসাব ইঞ্জিন)             │
│  • rebateService (rebate গণনা)                          │
│  • returnService (return manage করা)                    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   MODEL LAYER                            │
│  কাজ: Database এর সাথে কথা বলে (Mongoose)              │
│  • User, TaxProfile, SalaryIncome, BusinessIncome       │
│  • RentalIncome, ProfessionalIncome, TdsRecord          │
│  • Investment, TaxReturn, TaxRule                       │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    MONGODB DATABASE                      │
│  Collections: users, taxprofiles, salaryincomes...      │
└─────────────────────────────────────────────────────────┘
```

### কেন Service Layer আলাদা করছি?

```
❌ Controller এ সব logic লিখলে:
   Controller → Database (সরাসরি — জগাখিচুড়ি)

✅ Service Layer দিয়ে:
   Controller → Service → Model → Database
   (পরিষ্কার, test করা সহজ, পুনর্ব্যবহারযোগ্য)
```

---

# ৩. Folder Structure — ফাইল কোথায় থাকবে?

```
tax-return-system/
│
├── server.js                    ← প্রবেশদ্বার
├── .env                         ← গোপন তথ্য (git এ যাবে না)
├── .env.example                 ← অন্যদের জন্য template
├── .gitignore
├── package.json
│
└── src/
    │
    ├── config/
    │   ├── db.js                ← MongoDB connection
    │   └── constants.js         ← Tax slabs, thresholds (cache)
    │
    ├── models/
    │   ├── User.js              ← User account
    │   ├── TaxProfile.js        ← Taxpayer বিস্তারিত তথ্য
    │   ├── SalaryIncome.js      ← বেতন আয়
    │   ├── BusinessIncome.js    ← ব্যবসায়িক আয়
    │   ├── ProfessionalIncome.js← Freelancer আয়
    │   ├── RentalIncome.js      ← ভাড়া আয়
    │   ├── TdsRecord.js         ← TDS তথ্য
    │   ├── Investment.js        ← বিনিয়োগ তথ্য
    │   ├── TaxReturn.js         ← কর রিটার্ন
    │   └── TaxRule.js           ← Admin পরিচালিত কর নিয়ম
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
    │   ├── authService.js
    │   ├── incomeService.js
    │   ├── taxCalculationService.js  ← সবচেয়ে গুরুত্বপূর্ণ
    │   ├── rebateService.js
    │   ├── tdsService.js
    │   └── returnService.js
    │
    ├── routes/
    │   ├── index.js             ← সব route একত্র করে
    │   ├── authRoutes.js
    │   ├── profileRoutes.js
    │   ├── salaryRoutes.js
    │   ├── businessRoutes.js
    │   ├── professionalRoutes.js
    │   ├── rentalRoutes.js
    │   ├── tdsRoutes.js
    │   ├── investmentRoutes.js
    │   ├── taxRoutes.js
    │   ├── returnRoutes.js
    │   ├── reportRoutes.js
    │   └── adminRoutes.js
    │
    ├── middlewares/
    │   ├── asyncHandler.js      ← try/catch wrapper
    │   ├── errorHandler.js      ← global error handler
    │   ├── authenticate.js      ← JWT verify
    │   ├── authorize.js         ← role check
    │   └── validate.js          ← input validation
    │
    ├── validators/
    │   ├── authValidator.js
    │   ├── incomeValidator.js
    │   └── returnValidator.js
    │
    └── app.js                   ← Express app setup
```

---

# ৪. Database Schema Design — Data কীভাবে সংরক্ষিত হবে?

## Collection ১: users

```javascript
{
  _id: ObjectId,
  name: String,              // "মোহাম্মদ আলী"
  email: String,             // unique, lowercase
  password: String,          // bcrypt hash (কখনো plain text নয়)
  role: String,              // "user" | "admin"
  isActive: Boolean,         // account active আছে কিনা
  isEmailVerified: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Collection ২: taxprofiles

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // → users._id (FK)

  // Taxpayer পরিচয়
  tin: String,               // Tax Identification Number (unique)
  nid: String,               // National ID
  dateOfBirth: Date,
  gender: String,            // "male" | "female" | "other"

  // Taxpayer শ্রেণী (কর সীমা নির্ধারণ করে)
  taxpayerCategory: String,  // "general" | "female" | "senior" |
                             // "disabled" | "freedomFighter" |
                             // "thirdGender" | "julyWarrior"

  employeeType: String,      // "private" | "govt"
  isNewTaxpayer: Boolean,    // প্রথমবার রিটার্ন দিচ্ছেন?

  // ঠিকানা (Minimum Tax নির্ধারণে লাগে)
  circleNo: String,          // কর সার্কেল
  zoneName: String,          // কর অঞ্চল
  locationKind: String,      // "dhaka_ctg" | "other_city" | "other"

  phone: String,
  address: {
    present: String,
    permanent: String
  },

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৩: salaryincomes

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // → users._id
  taxYear: String,           // "2025-26" (আয়বর্ষ)

  // বেতনের উপাদান
  basicSalary: Number,       // মূল বেতন (মাসিক)
  houseRentAllowance: Number,// বাড়িভাড়া ভাতা
  medicalAllowance: Number,  // চিকিৎসা ভাতা
  transportAllowance: Number,// যাতায়াত ভাতা
  festivalBonus: Number,     // উৎসব বোনাস (বার্ষিক)
  otherAllowances: Number,   // অন্যান্য ভাতা
  overtime: Number,

  // Perquisites (সুযোগ-সুবিধা)
  vehiclePerquisite: Number, // গাড়ির সুবিধা
  accommodationPerk: Number, // বাসস্থান সুবিধা

  // RPF (Recognized Provident Fund)
  rpfContribution: Number,   // কর্মীর চাঁদা

  // হিসাবকৃত মান (Service এ গণনা হবে)
  grossSalary: Number,       // মোট বেতন
  salaryExemption: Number,   // ছাড় (min(gross/3, 5L))
  taxableSalary: Number,     // করযোগ্য বেতন

  employerName: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৪: businessincomes

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  taxYear: String,

  businessName: String,
  businessType: String,      // "sole" | "partnership" | "company"

  revenue: Number,           // মোট আয়
  expenses: Number,          // মোট খরচ
  depreciation: Number,      // অবচয়

  netProfit: Number,         // রাজস্ব − খরচ (হিসাবকৃত)
  taxableBusinessIncome: Number,

  hasAccountsBook: Boolean,  // হিসাবের বই আছে কিনা

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৫: professionalincomes

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  taxYear: String,

  // Freelancer / Consultant
  serviceType: String,       // "IT" | "consulting" | "medical" | "legal" | "other"
  grossIncome: Number,       // মোট আয়
  professionalExpenses: Number, // পেশাদার খরচ
  netIncome: Number,         // নিট আয় (হিসাবকৃত)

  // বৈদেশিক আয়
  foreignRemittance: Number, // আইনি বৈদেশিক রেমিট্যান্স (করমুক্ত)

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৬: rentalincomes

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  taxYear: String,

  properties: [              // একাধিক সম্পত্তি
    {
      propertyAddress: String,
      propertyType: String,  // "residential" | "commercial"
      annualRent: Number,    // বার্ষিক ভাড়া

      // ছাড়
      repairDeduction: Number,     // হিসাবকৃত (residential: 25%, commercial: 30%)
      municipalTax: Number,        // পৌর কর
      mortgageInterest: Number,    // বন্ধকী সুদ

      netRentalIncome: Number      // হিসাবকৃত
    }
  ],

  totalNetRentalIncome: Number,    // হিসাবকৃত

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৭: tdsrecords

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  taxYear: String,

  tdsEntries: [
    {
      source: String,        // "salary" | "bank" | "rent" | "other"
      deductorName: String,  // কে কেটেছে
      amount: Number,        // কত কেটেছে
      month: String,         // কোন মাসে
      certificateNo: String  // TDS সনদ নম্বর
    }
  ],

  advanceTax: Number,        // অগ্রিম কর
  totalTdsPaid: Number,      // হিসাবকৃত

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৮: investments

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  taxYear: String,

  // Section 78 যোগ্য বিনিয়োগ
  dps: Number,               // DPS (সর্বোচ্চ ১.২ লক্ষ)
  fdr: Number,               // Fixed Deposit
  lifeInsurance: Number,     // জীবন বিমা (sum assured এর ১০% পর্যন্ত)
  providentFund: Number,     // Provident Fund
  pensionScheme: Number,     // পেনশন স্কিম
  govtSecurities: Number,    // সরকারি সিকিউরিটি (সর্বোচ্চ ৫ লক্ষ)
  mutualFund: Number,        // মিউচুয়াল ফান্ড (সর্বোচ্চ ৫ লক্ষ)
  zakat: Number,             // যাকাত
  donation: Number,          // দান
  newShares: Number,         // নতুন শেয়ার (IPO)
  otherInvestments: Number,

  // Sanchayapatra (আলাদা — ১৫% rebate)
  sanchayapatra: Number,

  // হিসাবকৃত মান
  totalEligibleInvestment: Number,
  rebateAmount: Number,      // (eligible × 15%)
  sanchayapatraRebate: Number,

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ৯: taxreturns ← সবচেয়ে গুরুত্বপূর্ণ

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  taxYear: String,           // "2025-26"
  assessmentYear: String,    // "2026-27"
  returnNo: String,          // "TR-2026-00001" (unique)

  // ─── আয়ের সারসংক্ষেপ ───
  incomeBreakdown: {
    salaryIncome: Number,    // করযোগ্য বেতন
    businessIncome: Number,
    professionalIncome: Number,
    rentalIncome: Number,
    capitalGains: Number,
    bankInterest: Number,
    otherIncome: Number,
    totalIncome: Number,     // যোগফল
    taxableIncome: Number    // threshold বাদ দিয়ে
  },

  // ─── কর হিসাব ───
  taxCalculation: {
    taxFreeThreshold: Number,     // করদাতার শ্রেণী অনুযায়ী
    grossTax: Number,             // স্ল্যাব অনুযায়ী কর

    // Rebate
    investmentRebate: Number,     // Section 78
    sanchayapatraRebate: Number,
    totalRebate: Number,

    taxAfterRebate: Number,

    // Minimum Tax
    minimumTax: Number,
    minimumTaxApplied: Boolean,

    // Surcharge
    wealthSurcharge: Number,
    vehicleAdvanceTax: Number,

    // Final
    totalTaxPayable: Number,

    // TDS Adjustment
    totalTdsPaid: Number,
    netTaxPayable: Number,        // ← এটাই শেষ প্রদেয় কর (বা Refund)
    isRefund: Boolean
  },

  // ─── স্ল্যাব ভাঙন ───
  slabBreakdown: [
    {
      slabLabel: String,   // "প্রথম ৩,০০,০০০"
      from: Number,
      to: Number,
      rate: Number,        // 0.10
      taxAmount: Number
    }
  ],

  // ─── Return Status ───
  status: String,          // "draft" | "submitted" | "processing" | "approved" | "rejected"
  submittedAt: Date,
  acknowledgementNo: String,

  // ─── Admin Notes ───
  adminNotes: String,
  reviewedBy: ObjectId,    // → users._id (admin)
  reviewedAt: Date,

  createdAt: Date,
  updatedAt: Date
}
```

## Collection ১০: taxrules ← Admin পরিচালিত

```javascript
{
  _id: ObjectId,
  taxYear: String,           // "2025-26"
  assessmentYear: String,    // "2026-27"
  isActive: Boolean,

  // করমুক্ত সীমা
  taxFreeThresholds: {
    general: Number,         // 375000
    female: Number,          // 425000
    senior: Number,          // 425000
    disabled: Number,        // 500000
    thirdGender: Number,     // 500000
    freedomFighter: Number,  // 525000
    julyWarrior: Number      // 525000
  },

  // ট্যাক্স স্ল্যাব
  taxSlabs: [
    { upTo: 300000,  rate: 0.10, label: "প্রথম ৳৩,০০,০০০" },
    { upTo: 400000,  rate: 0.15, label: "পরবর্তী ৳৪,০০,০০০" },
    { upTo: 500000,  rate: 0.20, label: "পরবর্তী ৳৫,০০,০০০" },
    { upTo: 2000000, rate: 0.25, label: "পরবর্তী ৳২০,০০,০০০" },
    { upTo: null,    rate: 0.30, label: "অবশিষ্ট" }
  ],

  // বেতন ছাড়
  salaryExemption: {
    divisor: 3,              // gross / 3
    maxAmount: 500000        // সর্বোচ্চ ৫ লক্ষ
  },

  // বিনিয়োগ রিবেট (Section 78)
  investmentRebate: {
    incomeRate: 0.03,        // আয়ের ৩%
    investmentRate: 0.15,    // বিনিয়োগের ১৫%
    maxRebate: 1000000       // সর্বোচ্চ ১০ লক্ষ
  },

  // Sanchayapatra
  sanchayapatraRebateRate: 0.15,

  // ন্যূনতম কর
  minimumTax: {
    dhakaCTG: 5000,
    otherCity: 4000,
    other: 3000,
    newTaxpayer: 1000
  },

  // সম্পদ সারচার্জ
  wealthSurcharge: [
    { from: 40000000,  to: 100000000, rate: 0.10 },
    { from: 100000000, to: 200000000, rate: 0.20 },
    { from: 200000000, to: 500000000, rate: 0.30 },
    { from: 500000000, to: null,      rate: 0.35 }
  ],

  createdAt: Date,
  updatedAt: Date
}
```

---

# ৫. API Endpoints Design — কোন URL কী করবে?

## Auth APIs

```
POST   /api/v1/auth/register        ← নতুন account খোলো
POST   /api/v1/auth/login           ← login করো (JWT পাবে)
GET    /api/v1/auth/me              ← নিজের তথ্য দেখো [Auth]
POST   /api/v1/auth/logout          ← logout করো [Auth]
PUT    /api/v1/auth/change-password ← password পরিবর্তন [Auth]
```

## Tax Profile APIs

```
POST   /api/v1/profile              ← Tax Profile তৈরি করো [Auth]
GET    /api/v1/profile              ← নিজের profile দেখো [Auth]
PUT    /api/v1/profile              ← profile আপডেট করো [Auth]
```

## Salary Income APIs

```
POST   /api/v1/salary               ← বেতনের তথ্য যোগ করো [Auth]
GET    /api/v1/salary               ← সব বেতন রেকর্ড দেখো [Auth]
GET    /api/v1/salary/:id           ← একটি রেকর্ড দেখো [Auth]
PUT    /api/v1/salary/:id           ← আপডেট করো [Auth]
DELETE /api/v1/salary/:id           ← মুছো [Auth]
```

## Business Income APIs

```
POST   /api/v1/business             ← ব্যবসায়িক আয় যোগ করো [Auth]
GET    /api/v1/business             ← সব রেকর্ড দেখো [Auth]
GET    /api/v1/business/:id         ← একটি রেকর্ড [Auth]
PUT    /api/v1/business/:id         ← আপডেট [Auth]
DELETE /api/v1/business/:id         ← মুছো [Auth]
```

## Professional Income APIs

```
POST   /api/v1/professional         ← Freelancer আয় যোগ করো [Auth]
GET    /api/v1/professional
GET    /api/v1/professional/:id
PUT    /api/v1/professional/:id
DELETE /api/v1/professional/:id
```

## Rental Income APIs

```
POST   /api/v1/rental               ← ভাড়া আয় যোগ করো [Auth]
GET    /api/v1/rental
GET    /api/v1/rental/:id
PUT    /api/v1/rental/:id
DELETE /api/v1/rental/:id
```

## TDS APIs

```
POST   /api/v1/tds                  ← TDS তথ্য যোগ করো [Auth]
GET    /api/v1/tds                  ← সব TDS দেখো [Auth]
PUT    /api/v1/tds/:id              ← আপডেট [Auth]
DELETE /api/v1/tds/:id
```

## Investment APIs

```
POST   /api/v1/investment           ← বিনিয়োগ তথ্য যোগ করো [Auth]
GET    /api/v1/investment           ← বিনিয়োগ দেখো [Auth]
PUT    /api/v1/investment/:id       ← আপডেট [Auth]
GET    /api/v1/investment/rebate    ← Rebate হিসাব দেখো [Auth]
```

## Tax Calculation APIs

```
GET    /api/v1/tax/calculate        ← সব income মিলিয়ে কর হিসাব করো [Auth]
GET    /api/v1/tax/summary          ← Tax Summary দেখো [Auth]
GET    /api/v1/tax/slabs            ← বর্তমান Tax Slabs দেখো [Public]
```

## Tax Return APIs

```
POST   /api/v1/return               ← Return তৈরি করো (Draft) [Auth]
GET    /api/v1/return               ← সব Return দেখো [Auth]
GET    /api/v1/return/:id           ← একটি Return দেখো [Auth]
PUT    /api/v1/return/:id           ← Draft আপডেট করো [Auth]
POST   /api/v1/return/:id/submit    ← Return জমা দাও [Auth]
GET    /api/v1/return/:id/status    ← Status দেখো [Auth]
```

## Report APIs

```
GET    /api/v1/report/income        ← Income Report [Auth]
GET    /api/v1/report/tax           ← Tax Report [Auth]
GET    /api/v1/report/tds           ← TDS Report [Auth]
GET    /api/v1/report/annual        ← Annual Summary [Auth]
```

## Admin APIs

```
GET    /api/v1/admin/users          ← সব Users [Admin]
GET    /api/v1/admin/users/:id      ← একজন User [Admin]
PUT    /api/v1/admin/users/:id      ← User আপডেট [Admin]
DELETE /api/v1/admin/users/:id      ← User মুছো [Admin]

GET    /api/v1/admin/returns        ← সব Returns [Admin]
PUT    /api/v1/admin/returns/:id/status ← Status পরিবর্তন [Admin]

GET    /api/v1/admin/rules          ← Tax Rules দেখো [Admin]
POST   /api/v1/admin/rules          ← নতুন Tax Rule যোগ করো [Admin]
PUT    /api/v1/admin/rules/:id      ← Tax Rule আপডেট [Admin]
```

---

# ৬. Module Dependency Diagram — কে কার উপর নির্ভর করে?

```
                    ┌─────────────┐
                    │  TaxRule    │ ← Admin এটা manage করে
                    │  (Database) │
                    └──────┬──────┘
                           │ Tax slabs, thresholds পড়ে
                           ▼
              ┌────────────────────────┐
              │  taxCalculationService │ ← কর হিসাবের মূল ইঞ্জিন
              └────────────┬───────────┘
                           │ এই inputs নেয়:
          ┌────────────────┼──────────────────────┐
          │                │                      │
          ▼                ▼                      ▼
  ┌──────────────┐ ┌──────────────┐    ┌──────────────────┐
  │ SalaryIncome │ │ Business/    │    │   Investment     │
  │ Service      │ │ Professional/│    │   (rebateService)│
  │              │ │ Rental       │    │                  │
  └──────┬───────┘ └──────┬───────┘    └────────┬─────────┘
         │                │                     │
         │         ┌──────┴──────┐              │
         │         │  TdsRecord  │              │
         │         │  (tdsService│              │
         │         └─────────────┘              │
         │                                      │
         └──────────────────┬───────────────────┘
                            │ সব মিলিয়ে
                            ▼
                  ┌──────────────────┐
                  │   TaxReturn      │
                  │   (returnService)│
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │    Report        │
                  │  (reportService) │
                  └──────────────────┘
```

---

# ৭. Tax Calculation Engine — কীভাবে কর হিসাব হবে?

```
মোট আয় হিসাব (Total Income)
│
├── করযোগ্য বেতন (taxableSalary)
│   = মোট বেতন − বেতন ছাড় [min(gross/3, ৫ লক্ষ)]
│
├── ব্যবসায়িক আয় (netBusinessIncome)
│   = রাজস্ব − খরচ − অবচয়
│
├── ফ্রিল্যান্সার আয় (netProfessionalIncome)
│   = মোট আয় − পেশাদার খরচ
│
├── ভাড়া আয় (totalNetRentalIncome)
│   = ভাড়া − মেরামত ছাড় − পৌর কর
│
└── অন্যান্য (bank interest, capital gains, etc.)
         │
         ▼
মোট করযোগ্য আয় = যোগফল − করমুক্ত সীমা
         │
         ▼
স্ল্যাব অনুযায়ী কর (Progressive Tax)
├── প্রথম ৩ লক্ষ → ১০%
├── পরের ৪ লক্ষ  → ১৫%
├── পরের ৫ লক্ষ  → ২০%
├── পরের ২০ লক্ষ → ২৫%
└── বাকি সব      → ৩০%
         │
         ▼
Gross Tax
         │
         − বিনিয়োগ রিবেট [min(3%×income, 15%×investment, ১০ লক্ষ)]
         − Sanchayapatra রিবেট [amount × 15%]
         │
         ▼
Tax After Rebate
         │
         max(Tax After Rebate, Minimum Tax)
         │
         + Wealth Surcharge (যদি সম্পদ ৪ কোটি+)
         + Vehicle Advance Tax
         │
         ▼
মোট প্রদেয় কর
         │
         − মোট TDS (বেতন TDS + ব্যাংক TDS + অন্যান্য)
         − অগ্রিম কর
         │
         ▼
নেট প্রদেয় কর (বা Refund যদি ঋণাত্মক হয়)
```

---

# ৮. Development Roadmap — Phase by Phase

```
Phase 1 (সপ্তাহ ১-২): Foundation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Project Setup (Node + Express + MongoDB)
✦ User Registration & Login (bcrypt + JWT)
✦ JWT Middleware (authenticate)
✦ Role-based Authorization (authorize)
✦ Global Error Handler
✦ Tax Profile Management

শেখার লক্ষ্য:
→ Express middleware chain কীভাবে কাজ করে
→ JWT token কীভাবে generate ও verify হয়
→ bcrypt দিয়ে password hash কীভাবে করে
→ Role-based access control (RBAC) কী

Phase 2 (সপ্তাহ ৩-৪): Income Modules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Salary Income CRUD (+ automatic exemption calculation)
✦ Business Income CRUD (+ net profit calculation)
✦ Professional Income CRUD
✦ Rental Income CRUD (+ repair deduction calculation)

শেখার লক্ষ্য:
→ Mongoose Schema validation
→ Service layer pattern
→ Mongoose virtual fields ও pre-save hooks
→ একাধিক related collection এ data কীভাবে রাখে

Phase 3 (সপ্তাহ ৫-৬): TDS & Investment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ TDS Record Management
✦ Investment Module
✦ Rebate Calculation Engine (Section 78)
✦ Sanchayapatra Rebate

শেখার লক্ষ্য:
→ Complex business logic কে Service এ রাখা
→ Mongoose array of subdocuments
→ Mathematical calculation এর unit testing

Phase 4 (সপ্তাহ ৭-৮): Tax Engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Tax Calculation Engine (মূল ইঞ্জিন)
  - Total income aggregation
  - Progressive slab calculation
  - Rebate adjustment
  - TDS adjustment
  - Minimum tax floor
  - Wealth surcharge
✦ Tax Rule Management (Admin)

শেখার লক্ষ্য:
→ Complex calculation engine তৈরি
→ Mongoose populate (join equivalent)
→ Admin-managed configuration pattern

Phase 5 (সপ্তাহ ৯-১০): Tax Return
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Tax Return Creation (Draft)
✦ Return Submission
✦ Status Management (draft → submitted → approved)
✦ Acknowledgement Number Generation

শেখার লক্ষ্য:
→ State machine pattern (status transitions)
→ Atomic operations in MongoDB
→ Document generation pattern

Phase 6 (সপ্তাহ ১১-১২): Reports & Admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Income Report API
✦ Tax Summary Report
✦ TDS Report
✦ Annual Summary
✦ Admin Dashboard APIs

শেখার লক্ষ্য:
→ MongoDB Aggregation Pipeline
→ $group, $match, $project operators
→ Admin vs User data separation
```

---

# ৯. HTTP Status Code Guide

```
200 OK            ← সফল GET/PUT
201 Created       ← সফল POST (নতুন তৈরি)
204 No Content    ← সফল DELETE
400 Bad Request   ← ভুল input data
401 Unauthorized  ← Login করনি / token নেই
403 Forbidden     ← Login করেছ কিন্তু permission নেই
404 Not Found     ← খুঁজে পাওয়া যায়নি
409 Conflict      ← Duplicate (TIN/email already exists)
500 Server Error  ← Server এ সমস্যা
```

---

# ১০. Environment Variables (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://127.0.0.1:27017/tax-return-system

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# App
APP_NAME=BD Tax Return System
TAX_YEAR=2025-26
ASSESSMENT_YEAR=2026-27
```

---

# ১১. Phase 1 শুরু করার Checklist

```
□ Project folder তৈরি করো
□ npm init করো
□ Dependencies install করো:
  - express, mongoose, dotenv, cors
  - bcryptjs, jsonwebtoken
  - express-validator (input validation)
  - nodemon (dev)
□ Folder structure তৈরি করো
□ server.js লিখো
□ MongoDB connect করো
□ User model তৈরি করো
□ Registration API তৈরি করো
□ Login API তৈরি করো
□ JWT Middleware তৈরি করো
□ Postman দিয়ে test করো
```

---

*এই Design Document টি Phase 1 শুরু করার আগে পুরো team এর সাথে review করো।*
*NBR নিয়ম পরিবর্তন হলে শুধু taxrules collection আপডেট করলেই হবে।*
