import {
  AppBar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { About } from './components/About';
import { Assumptions } from './components/Assumptions';
import { CalculatorForm } from './components/CalculatorForm';
import { Language, LanguageContext, isRTL } from './components/LanguageContext';
import { OutputSection } from './components/OutputSection';
import { translations } from './components/translations';
import { initialFormData } from './data/initialFormData';
import { theme } from './styles/theme';
import type { CalculationResults, FormData } from './types/types';

// Use the proxy path for all API calls
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
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {t('title')}
            </Typography>
            <FormControl size="small">
              <InputLabel id="language-select-label">Language</InputLabel>
              <Select
                labelId="language-select-label"
                value={language}
                label="Language"
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ar">العربية</MenuItem>
              </Select>
            </FormControl>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label={t('calculator')} value="calculator" />
              <Tab label={t('assumptions')} value="assumptions" />
              <Tab label={t('about')} value="about" />
            </Tabs>
          </Box>

          {activeTab === 'calculator' && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <CalculatorForm
                      formData={formData}
                      onFormChange={handleFormChange}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent sx={{ minHeight: '500px' }}>
                    {isLoading && (
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="100%"
                      >
                        <CircularProgress />
                      </Box>
                    )}
                    {error && !isLoading && (
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="100%"
                      >
                        <Typography color="error">
                          {t('error')}: {error}
                        </Typography>
                      </Box>
                    )}
                    {!isLoading && !error && results && (
                      <OutputSection results={results} formData={formData} />
                    )}
                    {!isLoading && !error && !results && (
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="100%"
                      >
                        <Typography variant="h6" color="text.secondary">
                          {t('enterDataPrompt')}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeTab === 'assumptions' && <Assumptions />}
          {activeTab === 'about' && <About />}
        </Container>
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: 'auto',
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800],
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {'Copyright © '}
            <Link color="inherit" href="https://github.com/your-repo">
              Bilingual Financial Calculator
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
          </Typography>
        </Box>
      </LanguageContext.Provider>
    </ThemeProvider>
  );
}

export default App;