import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { useSocket } from '../contexts/SocketContext';

const ReportStatus = () => {
  const socket = useSocket();
  const [reportUUIDs, setReportUUIDs] = useState([]);
  const [selectedUUID, setSelectedUUID] = useState('');
  const [reportStatus, setReportStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('reportUUIDs', (uuids) => {
      setReportUUIDs(uuids);
    });

    socket.on('reportStatusResult', ({ submissionId, status }) => {
      setLoading(false);
      if (status.success) {
        setReportStatus(status.data);
        setError(null);
      } else {
        setError(status.error || 'Ошибка при получении статуса');
        setReportStatus(null);
      }
    });

    return () => {
      socket.off('reportUUIDs');
      socket.off('reportStatusResult');
    };
  }, [socket]);

  const handleGetStatus = () => {
    if (!selectedUUID) return;
    setLoading(true);
    setError(null);
    socket.emit('getReportStatus', selectedUUID);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Статус репортов
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Доступные UUID репортов:
        </Typography>
        <List>
          {reportUUIDs.map((uuid) => (
            <ListItem key={uuid}>
              <ListItemText 
                primary={uuid}
                secondary="Нажмите, чтобы выбрать"
                onClick={() => setSelectedUUID(uuid)}
                sx={{ cursor: 'pointer' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="UUID репорта"
          value={selectedUUID}
          onChange={(e) => setSelectedUUID(e.target.value)}
          fullWidth
        />
        <Button
          variant="contained"
          onClick={handleGetStatus}
          disabled={!selectedUUID || loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Получить статус'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {reportStatus && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Информация о репорте
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="UUID"
                secondary={reportStatus.uuid}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Дата отправки"
                secondary={formatDate(reportStatus.date)}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Статус"
                secondary={reportStatus.pending ? 'В обработке' : 'Обработан'}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Email отправителя"
                secondary={reportStatus.submitter?.email}
              />
            </ListItem>
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ReportStatus; 