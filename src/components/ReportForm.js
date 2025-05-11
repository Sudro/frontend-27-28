import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import { useSocket } from '../contexts/SocketContext';
import ReportIcon from '@mui/icons-material/Report';

const ReportForm = ({ open, onClose, url }) => {
  const theme = useTheme();
  const socket = useSocket();
  const [formData, setFormData] = useState({
    email: '',
    reason: 'phishing',
    details: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Отправка формы репорта:');
    console.log('URL:', url);
    console.log('Данные формы:', {
      email: formData.email,
      reason: formData.reason,
      details: formData.details
    });

    setLoading(true);
    setError(null);

    try {
      socket.emit('submitReport', {
        url,
        reportData: {
          email: formData.email,
          reason: formData.reason,
          details: formData.details
        }
      });

      socket.once('reportResult', (result) => {
        console.log('Ответ сервера:', result);
        if (result.reportStatus.netcraft.success) {
          setTimeout(() => onClose(true), 1000);
        } else {
          setError('Ошибка отправки репорта: ' + (result.reportStatus.netcraft.error || 'Неизвестная ошибка'));
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Ошибка при отправке репорта:');
      console.error('Тип ошибки:', error.name);
      console.error('Сообщение ошибки:', error.message);
      setError('Ошибка отправки репорта: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onClose(false)} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.7)})`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}>
        <ReportIcon sx={{ 
          color: theme.palette.primary.main,
          filter: 'drop-shadow(0px 2px 4px rgba(211, 47, 47, 0.3))'
        }} />
        <Typography variant="h6" component="div" sx={{ 
          fontWeight: 'bold',
          color: theme.palette.primary.main
        }}>
          Отправить репорт о фишинге
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="URL"
              value={url}
              disabled
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.background.paper, 0.5),
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main
                  }
                }
              }}
            />
            <TextField
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
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
            <FormControl fullWidth>
              <InputLabel>Причина</InputLabel>
              <Select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                label="Причина"
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderRadius: 2
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main
                  }
                }}
              >
                <MenuItem value="phishing">Фишинг</MenuItem>
                <MenuItem value="malware">Вредоносное ПО</MenuItem>
                <MenuItem value="scam">Мошенничество</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Дополнительные детали"
              multiline
              rows={4}
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              fullWidth
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
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`
                }}
              >
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          pb: 3,
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}>
          <Button 
            onClick={() => onClose(false)} 
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              color: theme.palette.primary.main,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1)
              }
            }}
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Отправить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ReportForm; 