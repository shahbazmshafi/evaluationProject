
# 🧮 Evaluation Score Calculation - Developer Guide

This document explains how **Raw Score** and **Normalized Score** are calculated for each employee evaluation in the system. These formulas align with the official performance increment policy.

---

## ✅ Step 1: Raw Score Calculation

**Formula**:
```
Raw Score = Σ (KPI Rating × KPI Weightage in Decimal)
```

Each KPI rating is multiplied by its weightage (percentage ÷ 100), and then all weighted scores are summed up.

### 🔍 Example:

| KPI Name         | Weight (%) | Rating | Weighted Score |
|------------------|------------|--------|----------------|
| Job Knowledge    | 30%        | 4.7    | 1.41           |
| Productivity     | 25%        | 4.5    | 1.125          |
| Teamwork         | 20%        | 4.2    | 0.84           |
| Innovation       | 15%        | 4.0    | 0.60           |
| Company Values   | 10%        | 4.8    | 0.48           |

**Raw Score = 1.41 + 1.125 + 0.84 + 0.60 + 0.48 = 4.455**

---

## ✅ Step 2: Normalized Score

**Formula**:
```
Normalized Score = ((Raw Score - Min Raw) / (Max Raw - Min Raw)) × (High - Low) + Low
```

- Min Raw = 1.00  → All KPIs rated at 1.0
- Max Raw = 5.00  → All KPIs rated at 5.0
- Low = 1.00 (minimum normalized score allowed)
- High = 5.00 (maximum normalized score)

### 📌 Note:
In the original draft, a minimum base of 3.00 was suggested — **this is no longer enforced**. Employees can receive a normalized score **below 3.00** depending on their actual performance ratings.

---

### 💡 Example:

```
Raw Score = 4.455
Normalized Score = ((4.455 - 1.00) / 4.00) × 4.00 + 1.00
                = (3.455 / 4.00) × 4.00 + 1.00
                = 3.455 + 1.00 = 4.455
```

In this case, raw score and normalized score are the same because the range is already 1.00–5.00.

---

## 🚫 Increment Visibility

- Increment percentage **will be calculated internally**.
- **It will not be shown to any user** in the application.
- Only Admins will eventually use this value in a future phase.

---

## ✅ What to Implement Now

1. Use the real ratings per KPI to calculate the **Raw Score**.
2. Apply the normalization formula (if needed).
3. Store the increment internally but do **not expose it** in the UI.

---
