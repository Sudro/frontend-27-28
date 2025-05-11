const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const cache = new Map();

const reportUUIDs = new Set();

async function checkVirusTotal(url) {
  try {
    const response = await axios.get(`https://www.virustotal.com/vtapi/v2/url/report`, {
      params: {
        apikey: process.env.VIRUSTOTAL_API_KEY,
        resource: url
      }
    });
    
    const isTestUrl = url.includes('malware.testing.google.test') || 
                     url.includes('phishing.testing.google.test');
    
    return {
      service: 'VirusTotal',
      data: response.data,
      score: isTestUrl ? 0 : (response.data.positives > 0 ? 0 : 1)
    };
  } catch (error) {
    console.error('VirusTotal API Error:', error);
    return {
      service: 'VirusTotal',
      data: null,
      score: 0,
      error: error.message
    };
  }
}

async function checkUrlscan(url) {
  try {
    const isTestUrl = url.includes('malware.testing.google.test') || 
                     url.includes('phishing.testing.google.test');
    
    if (isTestUrl) {
      return {
        service: 'Urlscan',
        data: null,
        score: 0,
        isTestUrl: true
      };
    }

    const response = await axios.get(`https://urlscan.io/api/v1/search/`, {
      params: {
        q: `page.url:"${url}"`
      },
      headers: {
        'API-Key': process.env.URLSCAN_API_KEY
      }
    });
    return {
      service: 'Urlscan',
      data: response.data,
      score: response.data.results?.length > 0 ? 1 : 0
    };
  } catch (error) {
    console.error('Urlscan API Error:', error);
    return {
      service: 'Urlscan',
      data: null,
      score: 0,
      error: error.message
    };
  }
}

async function getNetcraftReportStatus(submissionId) {
  try {
    console.log('Получение статуса репорта:', submissionId);
    const response = await axios.get(`https://report.netcraft.com/api/v3/submission/${submissionId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Статус репорта:', response.data);
    return {
      service: 'Netcraft',
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Ошибка при получении статуса репорта:');
    console.error('Тип ошибки:', error.name);
    console.error('Сообщение ошибки:', error.message);
    if (error.response) {
      console.error('Статус ответа:', error.response.status);
      console.error('Данные ответа:', error.response.data);
    }
    return {
      service: 'Netcraft',
      success: false,
      error: error.message
    };
  }
}

async function submitNetcraftReport(url, reportData) {
  console.log('Начало отправки репорта:');
  console.log('URL:', url);
  console.log('Данные репорта:', reportData);

  try {
    const isTestUrl = url.includes('malware.testing.google.test') || 
                     url.includes('phishing.testing.google.test');
    
    if (isTestUrl) {
      console.log('Обнаружен тестовый URL, симулируем отправку');
      return {
        service: 'Netcraft',
        success: true,
        data: { message: 'Test URL report simulated' }
      };
    }

    console.log('Подготовка данных для отправки...');
    const requestData = {
      email: reportData.email,
      urls: [
        {
          country: "RU",
          reason: reportData.reason,
          tags: [reportData.reason],
          url: url
        }
      ]
    };

    console.log('Отправка запроса к Netcraft...');
    console.log('URL запроса:', 'https://report.netcraft.com/api/v3/report/urls');
    console.log('Данные запроса:', requestData);
    
    const response = await axios.post('https://report.netcraft.com/api/v3/report/urls', 
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Ответ от Netcraft:', response.data);

    const submissionId = response.data.uuid;
    console.log('Получен UUID репорта:', submissionId);
    
    if (submissionId) {
      const reportStatus = await getNetcraftReportStatus(submissionId);
      return {
        service: 'Netcraft',
        success: true,
        data: {
          submissionId,
          status: reportStatus.data
        }
      };
    } else {
      throw new Error('Не получен UUID репорта');
    }
  } catch (error) {
    console.error('Ошибка при отправке репорта:');
    console.error('Тип ошибки:', error.name);
    console.error('Сообщение ошибки:', error.message);
    if (error.response) {
      console.error('Статус ответа:', error.response.status);
      console.error('Данные ответа:', error.response.data);
      console.error('Заголовки ответа:', error.response.headers);
    }
    return {
      service: 'Netcraft',
      success: false,
      error: error.message
    };
  }
}

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.emit('reportUUIDs', Array.from(reportUUIDs));

  socket.on('checkUrl', async (url) => {
    console.log('Получен запрос на проверку URL:', url);
    const cachedResult = cache.get(url);
    if (cachedResult && Date.now() - cachedResult.timestamp < 12 * 60 * 60 * 1000) {
      socket.emit('urlResult', cachedResult.data);
      return;
    }

    const [vtResult, urlscanResult] = await Promise.all([
      checkVirusTotal(url),
      checkUrlscan(url)
    ]);

    const totalScore = (vtResult.score + urlscanResult.score) / 2;
    const result = {
      url,
      reputation: {
        virusTotal: vtResult,
        urlscan: urlscanResult
      },
      totalScore: totalScore,
      reportStatus: null
    };

    cache.set(url, {
      data: result,
      timestamp: Date.now()
    });

    socket.emit('urlResult', result);
  });

  socket.on('submitReport', async ({ url, reportData }) => {
    console.log('Получен запрос на отправку репорта:');
    console.log('URL:', url);
    console.log('Данные репорта:', reportData);

    const netcraftResult = await submitNetcraftReport(url, reportData);
    console.log('Результат отправки репорта:', netcraftResult);

    if (netcraftResult.success && netcraftResult.data.submissionId) {
      reportUUIDs.add(netcraftResult.data.submissionId);
      io.emit('reportUUIDs', Array.from(reportUUIDs));
    }

    const reportStatus = {
      netcraft: netcraftResult
    };

    const cachedResult = cache.get(url);
    if (cachedResult) {
      cachedResult.data.reportStatus = reportStatus;
      cache.set(url, cachedResult);
    }

    socket.emit('reportResult', { url, reportStatus });
  });

  socket.on('getReportStatus', async (submissionId) => {
    console.log('Получен запрос на получение статуса репорта:', submissionId);
    const status = await getNetcraftReportStatus(submissionId);
    socket.emit('reportStatusResult', { submissionId, status });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 