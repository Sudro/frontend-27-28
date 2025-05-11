import React, { useState, useEffect } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Box,
  useTheme,
  alpha,
  ThemeProvider,
  createTheme
} from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';
import SecurityIcon from '@mui/icons-material/Security';
import ReportForm from './components/ReportForm';
import ReportStatus from './components/ReportStatus';
import { SocketProvider, useSocket } from './contexts/SocketContext';

// Создаем тему с красной цветовой схемой
const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f', // Яркий красный
      light: '#ff6659',
      dark: '#9a0007',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#ff1744', // Акцентный красный
      light: '#ff616f',
      dark: '#c4001d',
      contrastText: '#ffffff'
    },
    error: {
      main: '#d32f2f',
      light: '#ff6659',
      dark: '#9a0007'
    },
    warning: {
      main: '#ff9800',
      light: '#ffc947',
      dark: '#c66900'
    },
    success: {
      main: '#2e7d32',
      light: '#60ad5e',
      dark: '#005005'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(211, 47, 47, 0.3)'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    }
  }
});

function AppContent() {
  const theme = useTheme();
  const socket = useSocket();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');

  useEffect(() => {
    socket.on('urlResult', (result) => {
      setLoading(false);
      setResults(prev => [result, ...prev]);
    });

    return () => {
      socket.off('urlResult');
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) {
      setError('Пожалуйста, введите URL');
      return;
    }
    setLoading(true);
    setError(null);
    socket.emit('checkUrl', url);
  };

  const handleReportClick = (url) => {
    setSelectedUrl(url);
    setReportFormOpen(true);
  };

  const handleReportClose = (success) => {
    setReportFormOpen(false);
    if (success) {
      setResults(prev => prev.map(result => 
        result.url === selectedUrl 
          ? { ...result, reportStatus: { success: true } }
          : result
      ));
    }
  };

  const UrlListItem = ({ item, onReportClick }) => {
    const getScoreColor = (score) => {
      if (score >= 0.8) return theme.palette.success.main;
      if (score >= 0.5) return theme.palette.warning.main;
      return theme.palette.error.main;
    };

    const getScoreText = (score) => {
      if (score >= 0.8) return 'Безопасно';
      if (score >= 0.5) return 'Подозрительно';
      return 'Опасно';
    };

    const isTestUrl = item.url.includes('malware.testing.google.test') || 
                     item.url.includes('phishing.testing.google.test');

    return (
      <Paper 
        elevation={2}
        sx={{ 
          mb: 2,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4]
          }
        }}
      >
        <ListItem
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            p: 2
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                wordBreak: 'break-all'
              }}
            >
              {item.url}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: getScoreColor(item.totalScore),
                  fontWeight: 'medium'
                }}
              >
                {isTestUrl ? 'Тестовый URL' : getScoreText(item.totalScore)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                VirusTotal: {isTestUrl ? 'Тестовый URL' : (item.reputation.virusTotal.score === 1 ? 'Безопасно' : 'Опасно')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Urlscan: {isTestUrl ? 'Тестовый URL' : (item.reputation.urlscan.score === 1 ? 'Безопасно' : 'Опасно')}
              </Typography>
              {item.reportStatus && (
                <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                  Репорт отправлен
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton 
            onClick={() => onReportClick(item.url)}
            color={item.reportStatus ? 'success' : 'primary'}
            sx={{
              bgcolor: item.reportStatus 
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                bgcolor: item.reportStatus 
                  ? alpha(theme.palette.success.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.2)
              }
            }}
          >
            <ReportIcon />
          </IconButton>
        </ListItem>
      </Paper>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box 
        sx={{ 
          textAlign: 'center', 
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <SecurityIcon sx={{ 
          fontSize: 48, 
          color: 'primary.main',
          filter: 'drop-shadow(0px 2px 4px rgba(211, 47, 47, 0.3))'
        }} />
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0px 2px 4px rgba(211, 47, 47, 0.1)'
          }}
        >
          АнтиФиш
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{
            maxWidth: '600px',
            mx: 'auto'
          }}
        >
          Проверьте безопасность URL и отправьте репорт о подозрительных сайтах
        </Typography>
      </Box>

      <Paper 
        elevation={3}
        sx={{ 
          p: 3, 
          mb: 4,
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.7)})`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}
      >
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Введите URL для проверки"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            margin="normal"
            error={!!error}
            helperText={error}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main
                }
              }
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ 
              mt: 2,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Проверить URL'}
          </Button>
        </form>
      </Paper>

      <Typography 
        variant="h6" 
        gutterBottom
        sx={{ 
          fontWeight: 'bold',
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: theme.palette.primary.main
        }}
      >
        История проверок
      </Typography>

      <List sx={{ p: 0 }}>
        {results.map((result, index) => (
          <UrlListItem 
            key={index} 
            item={result}
            onReportClick={handleReportClick}
          />
        ))}
      </List>

      <ReportStatus />

      <ReportForm 
        open={reportFormOpen}
        onClose={handleReportClose}
        url={selectedUrl}
      />
    </Container>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App; 