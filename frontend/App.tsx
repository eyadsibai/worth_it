import {
  CssBaseline,
  ThemeProvider
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Language,
  LanguageContext,
  isRTL,
} from './components/LanguageContext';
import { translations } from './components/translations';
import { initialFormData } from './data/initialFormData';
import { theme } from './styles/theme';
import type { CalculationResults, FormData } from './types/types';

// Use the proxy path for API calls
const API_BASE_PATH = '/api';

function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calculator');

  const t = (key: keyof (typeof translations)['en']) => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
  }, [language]);

  const fetchCalculations = useCallback(async (data: FormData) => {
    if (activeTab !== 'calculator') return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_PATH}/calculate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          rsu_params: data.rsu,
          options_params: data.options,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Calculation failed');
      }

      const apiResults: CalculationResults = await response.json();
      setResults(apiResults);
    } catch (err: any) {
      console.error("Failed to fetch calculations:", err);
      setError(err.message || 'An unexpected error occurred.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCalculations(formData);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [formData, fetchCalculations]);

  const handleFormChange = (newFormData: FormData) => {
    setFormData(newFormData);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
        {/* Your existing JSX remains the same here */}
      </LanguageContext.Provider>
    </ThemeProvider>
  );
}

export default App;