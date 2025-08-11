// Define the interface for all translation keys
export interface Translations {
    title: string;
    calculator: string;
    assumptions: string;
    about: string;
    loading: string;
    enterDataPrompt: string;
    error: string;
    // Add ALL other keys from your form, output, etc. here
    // Example from CalculatorForm
    'current_job_monthly_salary': string;
    'startup_monthly_salary': string;
    'current_job_salary_growth_rate': string;
    'annual_roi': string;
    'investment_frequency': string;
    'equity_type': string;
    'rsu': string;
    'options': string;
    // ... continue for all fields
}

// English Translations
const en: Translations = {
    title: "Financial Offer Calculator",
    calculator: "Calculator",
    assumptions: "Assumptions",
    about: "About",
    loading: "Calculating...",
    enterDataPrompt: "Enter your data to see the analysis.",
    error: "Error",
    'current_job_monthly_salary': "Current Job Monthly Salary ($)",
    'startup_monthly_salary': "Startup Monthly Salary ($)",
    'current_job_salary_growth_rate': "Current Job Salary Growth Rate (%)",
    'annual_roi': "Annual ROI on Investments (%)",
    'investment_frequency': "Investment Frequency",
    'equity_type': "Equity Type",
    'rsu': "RSU",
    'options': "Options",
};

// Arabic Translations
const ar: Translations = {
    title: "حاسبة العرض المالي",
    calculator: "الحاسبة",
    assumptions: "الافتراضات",
    about: "حول",
    loading: "جارٍ الحساب...",
    enterDataPrompt: "أدخل بياناتك لرؤية التحليل",
    error: "خطأ",
    'current_job_monthly_salary': "الراتب الشهري للوظيفة الحالية ($)",
    'startup_monthly_salary': "الراتب الشهري في الشركة الناشئة ($)",
    'current_job_salary_growth_rate': "معدل نمو راتب الوظيفة الحالية (%)",
    'annual_roi': "العائد السنوي على الاستثمارات (%)",
    'investment_frequency': "تكرار الاستثمار",
    'equity_type': "نوع الأسهم",
    'rsu': "وحدات أسهم مقيدة",
    'options': "خيارات أسهم",
};

export const translations = { en, ar };