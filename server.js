const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const fileStorage = new Map();

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Roblox Studio Mobile - Export Server</title>
            <style>
                body { font-family: Arial; padding: 40px; background: #1a1a1a; color: white; }
                h1 { color: #00b0ff; }
                .stats { background: #2a2a2a; padding: 20px; border-radius: 10px; }
            </style>
        </head>
        <body>
            <h1>📦 Roblox Studio Mobile - Export Server</h1>
            <div class="stats">
                <h2>✅ Servidor Online!</h2>
                <p>Arquivos armazenados: ${fileStorage.size}</p>
                <p>Endpoint: POST /api/export</p>
                <p>Download: GET /download/:fileId</p>
            </div>
        </body>
        </html>
    `);
});

app.post('/api/export', (req, res) => {
    try {
        const { filename, type, content, timestamp, platform } = req.body;
        
        if (!filename || !content) {
            return res.status(400).json({
                success: false,
                error: 'Filename e content são obrigatórios'
            });
        }
        
        const fileId = crypto.randomBytes(16).toString('hex');
        
        fileStorage.set(fileId, {
            filename,
            type,
            content,
            timestamp: timestamp || Date.now(),
            platform: platform || 'unknown',
            downloads: 0
        });
        
        const downloadUrl = `${req.protocol}://${req.get('host')}/download/${fileId}`;
        
        console.log(`✅ Arquivo recebido: ${filename} (${type}) - ID: ${fileId}`);
        
        res.json({
            success: true,
            fileId,
            downloadUrl,
            message: 'Arquivo pronto para download!'
        });
        
        setTimeout(() => {
            if (fileStorage.has(fileId)) {
                fileStorage.delete(fileId);
                console.log(`🗑️ Arquivo ${fileId} deletado após 24h`);
            }
        }, 24 * 60 * 60 * 1000);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/download/:fileId', (req, res) => {
    const { fileId } = req.params;
    
    if (!fileStorage.has(fileId)) {
        return res.status(404).send(`
            <html>
            <body style="font-family: Arial; padding: 40px; background: #1a1a1a; color: white;">
                <h1>❌ Arquivo não encontrado</h1>
                <p>O arquivo pode ter expirado ou o ID está incorreto.</p>
            </body>
            </html>
        `);
    }
    
    const file = fileStorage.get(fileId);
    file.downloads++;
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log(`📥 Download: ${file.filename} - Total: ${file.downloads}x`);
    
    res.send(file.content);
});

app.get('/api/stats', (req, res) => {
    res.json({
        total: fileStorage.size,
        files: Array.from(fileStorage.values()).map(f => ({
            filename: f.filename,
            type: f.type,
            platform: f.platform,
            downloads: f.downloads
        }))
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

module.exports = app;
