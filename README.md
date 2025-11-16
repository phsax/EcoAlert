[Assista ao vídeo](https://drive.google.com/file/d/1UcB8H05wVpzmPVB30-0oQaTSVQbTf3OT/view?usp=sharing)

# Projeto EcoAlert

## Visão Geral do Projeto

O EcoAlert é uma aplicação web projetada para permitir que os usuários denunciem problemas ambientais. Ele possui um sistema de cadastro e login de usuários, um feed de denúncias e notícias, e um painel de administração para moderação de conteúdo. O projeto é dividido em frontend, backend e um banco de dados SQL.

## Estrutura de Pastas

```
.
├── .vscode
│   └── settings.json
├── backend
│   ├── package-lock.json
│   ├── package.json
│   ├── src
│   │   └── server.js
│   └── uploads
│       ├── imagem-1762638394662.jpeg
│       ├── imagem-1762641381954.jpeg
│       ├── imagem-1762885146731.jpg
│       ├── imagem-1762905293426.webp
│       ├── imagem-1762905431643.png
│       └── imagem-1762905963169.jpeg
├── db.sql
└── frontend
    ├── cadastro
    │   ├── cadastro.css
    │   ├── cadastro.html
    │   └── cadastro.js
    ├── fonts
    │   ├── Cocogoose-Pro-Darkmode-trial.ttf
    │   ├── Cocogoose-Pro-Light-trial.ttf
    │   └── Cocogoose-Pro-Thin-trial.ttf
    ├── home
    │   ├── home.css
    │   ├── home.html
    │   └── home.js
    ├── login
    │   ├── login.css
    │   ├── login.html
    │   └── login.js
    ├── novadenuncia
    │   ├── detalhedenuncia
    │   │   ├── detalhedenuncia.css
    │   │   ├── detalhedenuncia.html
    │   │   └── detalhedenuncia.js
    │   ├── novadenuncia.css
    │   ├── novadenuncia.html
    │   └── novadenuncia.js
    └── pics
        └── picex1.png
```

## Arquivos do Projeto

### `.vscode/settings.json`

Este arquivo de configuração define a porta para o Live Server, facilitando o desenvolvimento frontend.

```json
{
  "liveServer.settings.port": 5501
}
```

### `backend/package.json`

Este arquivo define as dependências e scripts do backend Node.js.

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "nodemon ./src/server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "multer": "^1.4.5-lts.2",
    "mysql2": "^3.14.0",
    "nodemon": "^3.1.10",
    "socket.io": "^4.8.1"
  }
}
```

### `db.sql`

Este arquivo contém o script SQL para criar o banco de dados e a tabela de usuários.

```sql
create database EcoAlertDB;

use EcoAlertDB;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    sobrenome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha varchar (255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

drop table users;

select * from users;
```

### `backend/src/server.js`

O coração do backend, este arquivo gerencia as rotas da API, a conexão com o banco de dados, o upload de arquivos e a lógica de chat em tempo real com Socket.IO.

```javascript
const mysql = require('mysql2');
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");

const port = 3005;
const app = express();
const server = http.createServer(app); // Cria o servidor HTTP
app.use('/uploads', express.static('uploads')); // Se você usa uma pasta 'uploads' para imagens

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Lucas@19',
    database: 'ecoalertdb'
});

connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectou db');
    }
});

server.listen(port, () => console.log(`Servidor rodando na porta: ${port} e Socket.io ativo`));

// NOVO: LÓGICA DO CHAT (SOCKET.IO)

io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    // Ao entrar em uma sala (baseada na Denuncia ID)
    socket.on('join_denuncia_room', (denunciaId) => {
        socket.join(denunciaId);
        console.log(`Usuário ${socket.id} entrou na sala: ${denunciaId}`);
    });

    // Ao receber uma mensagem (novo comentário)
    socket.on('send_message', async (data) => {
        // data deve conter: { denunciaId, userId, userName, userSobrenome, conteudo }

        // 1. Salvar no Banco de Dados
        const query = `INSERT INTO comentarios (denuncia_id, user_id, conteudo) VALUES (?, ?, ?);`;
        connection.query(query, [data.denunciaId, data.userId, data.conteudo], (err, results) => {
            if (err) {
                console.error('Erro ao salvar comentário:', err);
                return;
            }

            // 2. Transmitir para todos na sala (incluindo o remetente)
            // Adiciona a hora e o nome/sobrenome para envio
            const newComment = {
                ...data,
                created_at: new Date().toISOString(),
                id: results.insertId
            };

            // Emite a mensagem para todos na sala da denúncia
            socket.to(data.denunciaId).emit('receive_message', newComment);
            console.log(`Comentário enviado na sala ${data.denunciaId}: ${data.conteudo}`);
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
    });
});

// --- Rota de Cadastro ---
app.post("/usuario/cadastrar", async (request, response) => {
    const { nome, sobrenome, email, senha } = request.body;
    const role = 'user';

    let query = "INSERT INTO users(nome, sobrenome, email, senha, role) VALUES (?, ?, ?, ?, ?);"

    connection.query(query, [nome, sobrenome, email, senha, role], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return response.status(409).json({
                    success: false,
                    message: "E-mail já cadastrado."
                });
            }
            return response.status(400).json({
                success: false,
                message: "Erro ao cadastrar usuário",
                erro: err.sqlMessage
            });
        }
        response.status(201).json({
            success: true,
            message: "Usuário cadastrado com sucesso",
            data: results
        });
    });
});

// --- Rota de Login ---
app.post('/usuario/logar', async (request, response) => {
    const { email, senha } = request.body;

    let query = "SELECT id, nome, sobrenome, email, role FROM users WHERE email = ? AND senha = ?";

    connection.query(query, [email, senha], (err, results) => {
        if (err) {
            return response.status(500).json({
                success: false,
                message: "Erro interno no servidor",
                erro: err
            });
        }

        if (results.length === 0) {
            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos"
            });
        }

        const user = results[0];

        return response.status(200).json({
            success: true,
            message: "Login realizado com sucesso",
            user: user
        });
    });
});

// --- Rota de Criação de Denúncia ---
app.post('/denuncia/criar', upload.single('imagem'), async (request, response) => {
    const { userId, titulo, descricao, localizacao_lat, localizacao_lon } = request.body;
    const caminho_imagem = request.file ? request.file.path : null;

    const status = 'pendente';

    if (!userId || !titulo || !descricao || !caminho_imagem) {
        if (caminho_imagem) {
            fs.unlinkSync(caminho_imagem);
        }
        return response.status(400).json({
            success: false,
            message: "Dados incompletos para a denúncia."
        });
    }

    let query = `INSERT INTO denuncias 
                (user_id, titulo, descricao, localizacao_lat, localizacao_lon, caminho_imagem, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?);`;

    const values = [
        userId,
        titulo,
        descricao,
        localizacao_lat || null,
        localizacao_lon || null,
        caminho_imagem,
        status
    ];

    connection.query(query, values, (err, results) => {
        if (err) {
            if (caminho_imagem) {
                fs.unlinkSync(caminho_imagem);
            }
            return response.status(500).json({
                success: false,
                message: "Erro ao registrar denúncia no banco de dados.",
                erro: err.sqlMessage
            });
        }

        response.status(201).json({
            success: true,
            message: "Denúncia registrada com sucesso! Aguardando aprovação.",
            denunciaId: results.insertId
        });
    });
});

// Buscar Denúncias Aprovadas
app.get('/denuncia/aprovadas', async (request, response) => {
    let query = `
        SELECT 
            d.id, d.titulo, d.descricao, d.caminho_imagem, d.created_at,
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM denuncias d
        JOIN users u ON d.user_id = u.id
        WHERE d.status = 'aprovada'
        ORDER BY d.created_at DESC;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar denúncias aprovadas:', err);
            return response.status(500).json({
                success: false,
                message: "Erro interno ao buscar denúncias."
            });
        }
        response.status(200).json({
            success: true,
            denuncias: results
        });
    });
});


//Buscar Denúncias Pendentes
app.get('/denuncia/pendentes', async (request, response) => {
    let query = `
        SELECT 
            d.id, d.titulo, d.descricao, d.caminho_imagem, d.created_at,
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM denuncias d
        JOIN users u ON d.user_id = u.id
        WHERE d.status = 'pendente'
        ORDER BY d.created_at ASC;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar denúncias pendentes:', err);
            return response.status(500).json({
                success: false,
                message: "Erro interno ao buscar denúncias pendentes."
            });
        }
        response.status(200).json({
            success: true,
            denuncias: results
        });
    });
});

// Moderação de Denúncia (para Admin)
app.put('/denuncia/moderacao/:id', async (request, response) => {
    const denunciaId = request.params.id;
    const { status } = request.body;

    if (status !== 'aprovada' && status !== 'rejeitada') {
        return response.status(400).json({
            success: false,
            message: "Status inválido. Use 'aprovada' ou 'rejeitada'."
        });
    }

    let query = `UPDATE denuncias SET status = ? WHERE id = ? AND status = 'pendente';`;

    connection.query(query, [status, denunciaId], (err, results) => {
        if (err) {
            console.error('Erro ao moderar denúncia:', err);
            return response.status(500).json({
                success: false,
                message: "Erro interno ao atualizar denúncia."
            });
        }

        if (results.affectedRows === 0) {
            return response.status(404).json({
                success: false,
                message: "Denúncia não encontrada ou já moderada."
            });
        }

        response.status(200).json({
            success: true,
            message: `Denúncia ID ${denunciaId} ${status} com sucesso.`,
            status: status
        });
    });
});

//Criar Notícia Admin
app.post('/noticia/criar', upload.single('imagem'), async (request, response) => {
    const { userId, titulo, descricao, tipo_conteudo, conteudo_link, conteudo_texto } = request.body;
    const caminho_imagem = request.file ? request.file.path : null;

    if (!userId || !titulo || !descricao || !caminho_imagem || !tipo_conteudo) {
        if (caminho_imagem) { fs.unlinkSync(caminho_imagem); }
        return response.status(400).json({
            success: false,
            message: "Dados incompletos para a notícia. Título, descrição, imagem e tipo de conteúdo são obrigatórios."
        });
    }

    let query = `
        INSERT INTO noticias 
        (user_id, titulo, descricao, caminho_imagem, tipo_conteudo, conteudo_link, conteudo_texto) 
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    const values = [
        userId,
        titulo,
        descricao,
        caminho_imagem,
        tipo_conteudo,
        tipo_conteudo === 'link' ? conteudo_link : null,
        tipo_conteudo === 'texto' ? conteudo_texto : null
    ];

    connection.query(query, values, (err, results) => {
        if (err) {
            if (caminho_imagem) { fs.unlinkSync(caminho_imagem); }
            console.error('Erro ao registrar notícia:', err);
            return response.status(500).json({
                success: false,
                message: "Erro ao registrar notícia no banco de dados.",
                erro: err.sqlMessage
            });
        }

        response.status(201).json({
            success: true,
            message: "Notícia publicada com sucesso!",
            noticiaId: results.insertId
        });
    });
});


// --- Rota 5: Buscar Todas as Notícias (para exibição na Home) ---
app.get('/noticia/todas', async (request, response) => {
    let query = `
        SELECT 
            n.id, n.titulo, n.descricao, n.caminho_imagem, n.created_at, n.tipo_conteudo,
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM noticias n
        JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar notícias:', err);
            return response.status(500).json({
                success: false,
                message: "Erro interno ao buscar notícias."
            });
        }
        response.status(200).json({
            success: true,
            noticias: results
        });
    });
});

app.get('/denuncia/detalhe/:id', async (request, response) => {
    const denunciaId = request.params.id;

    // Consulta para Denúncia
    const denunciaQuery = `
        SELECT 
            d.id, d.titulo, d.descricao, d.caminho_imagem, d.created_at, d.status,
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM denuncias d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ? AND d.status = 'aprovada';
    `;

    // Consulta para Comentários
    const comentariosQuery = `
        SELECT 
            c.id, c.conteudo, c.created_at,
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM comentarios c
        JOIN users u ON c.user_id = u.id
        WHERE c.denuncia_id = ?
        ORDER BY c.created_at ASC;
    `;

    connection.query(denunciaQuery, [denunciaId], (err, denunciaResults) => {
        if (err) {
            console.error('Erro ao buscar denúncia:', err);
            return response.status(500).json({ success: false, message: "Erro interno ao buscar denúncia." });
        }

        if (denunciaResults.length === 0) {
            return response.status(404).json({ success: false, message: "Denúncia não encontrada ou não aprovada." });
        }

        // Se a denúncia for encontrada, buscar os comentários
        connection.query(comentariosQuery, [denunciaId], (errComentarios, comentariosResults) => {
            if (errComentarios) {
                console.error('Erro ao buscar comentários:', errComentarios);
                return response.status(500).json({ success: false, message: "Erro interno ao buscar comentários." });
            }

            response.status(200).json({
                success: true,
                denuncia: denunciaResults[0],
                comentarios: comentariosResults
            });
        });
    });
});


app.get('/noticia/detalhe/:id', async (request, response) => {
    const noticiaId = request.params.id;

    const query = `
        SELECT 
            n.id, n.titulo, n.descricao, n.caminho_imagem, n.created_at, n.tipo_conteudo,
            n.conteudo_link, n.conteudo_texto,
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM noticias n
        JOIN users u ON n.user_id = u.id
        WHERE n.id = ?;
    `;

    connection.query(query, [noticiaId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar notícia:', err);
            return response.status(500).json({ success: false, message: "Erro interno ao buscar notícia." });
        }

        if (results.length === 0) {
            return response.status(404).json({ success: false, message: "Notícia não encontrada." });
        }

        response.status(200).json({
            success: true,
            noticia: results[0]
        });
    });
});
```

### `frontend/login/login.html`

Página de login da aplicação.

```html
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoAlert</title>
    <link rel="stylesheet" href="login.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
</head>

<body>
    <header>
        <h1>EcoAlert</h1>
    </header>
    <main>
        <div class="card">
            <h2>Login</h2>
            <div class="form">
                <div class="group">
                    <input id="email" required="" type="text" class="input">
                    <span class="highlight"></span>
                    <span class="bar"></span>
                    <label>E-mail:</label>
                </div>
                <div class="group">
                    <input id="senha" required="" type="text" class="input">
                    <span class="highlight"></span>
                    <span class="bar"></span>
                    <label>Senha:</label>
                </div>
                <button onclick="logar(event)" class="button-log">
                    <span class="button_top"> Logar </span>
                </button>
            </div>
            <!-- <h3>Ou entre com o Google:</h3>
            <button class="google-button">
                <p>Entrar com o Google</p>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
            </button> -->
            <div class="link">
                <p>Ainda sem conta?</p>
                <a href="../cadastro/cadastro.html">Faça seu cadastro</a>
            </div>
        </div>
    </main>

    <script src="login.js"></script>
</body>

</html>
```

### `frontend/login/login.js`

Este arquivo contém a lógica para o formulário de login, enviando as credenciais do usuário para o backend e redirecionando para a página principal em caso de sucesso.

```javascript
// ---funcao logar---
async function logar(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    const data = { email, senha };
    try {
        const response = await fetch('http://localhost:3005/usuario/logar', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem("user", JSON.stringify(result.user));
            window.location.href = "/frontend/home/home.html";

            alert(result.message);
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error("Erro no login:", error);
        alert("Erro ao realizar login.");
    }
}

// ---funcao logar---
```

### `frontend/home/home.html`

Página principal da aplicação, onde são exibidas as denúncias e notícias.

```html
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoAlert</title>
    <link rel="stylesheet" href="home.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
</head>

<body>
    <header>
        <h1>EcoAlert</h1>
        <div class="perfil">
            <div class="admin-moderacao-btn" style="display:none; margin-right: 15px; cursor: pointer;">
                <i class="bi bi-bell-fill" style="font-size: 1.5rem; color: #E5F4E7;"></i>
            </div>
            <p></p>
            <i class="bi bi-person-circle"></i>
        </div>
    </header>

    <a href="../novadenuncia/novadenuncia.html" class="new-denuncia-btn" style="display: none;">
        <i class="bi bi-plus"></i>
    </a>
    <main>
        <a href="../cadastro/cadastro.html">
            <div class="back-button">
                <button class="btn-back">
                    <p>Voltar</p>
                    <i class="bi bi-arrow-left-short"></i>
                </button>
            </div>
        </a>
        <h3>Denuncie, preserve e faça a diferença!</h3>
        <div class="nav">
            <div class="container-bar">
                <div class="btn-bar">Notícias</div>
                <div class="btn-bar">Denúncias</div>
                <svg class="outline" overflow="visible" width="400" height="60" viewBox="0 0 400 60"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect class="rect" pathLength="100" x="0" y="0" width="400" height="60" fill="transparent"
                        stroke-width="5"></rect>
                </svg>
            </div>
        </div>


        <div class="denuncias-rec">
            <h2 id="section-title">Denúncias recentes</h2>

            <div class="denuncias-line" id="denuncias-container">
            </div>

        </div>
    </main>

    <div id="moderacao-modal" class="modal" style="display:none;">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Denúncias Pendentes de Moderação</h2>
            <div id="denuncias-pendentes-container">
                <p>Nenhuma denúncia pendente.</p>
            </div>
        </div>
    </div>

    <script src="home.js"></script>
</body>

</html>
```

### `frontend/home/home.js`

Este arquivo gerencia a lógica da página principal, incluindo a exibição de denúncias e notícias, a moderação de conteúdo para administradores e a navegação do usuário.

```javascript
// home.js (REESCRITO com a nova lógica)

document.addEventListener('DOMContentLoaded', () => {

    const userNameElement = document.querySelector('.perfil p');
    // Referências aos elementos visuais e de conteúdo
    const newDenunciaBtn = document.querySelector('.new-denuncia-btn');
    const adminModeracaoBtn = document.querySelector('.admin-moderacao-btn');
    const denunciasContainer = document.getElementById('denuncias-container');
    const sectionTitle = document.getElementById('section-title');

    // Elementos do Modal de Moderação
    const moderacaoModal = document.getElementById('moderacao-modal');
    const modalCloseBtn = document.querySelector('.modal-content .close-btn');
    const denunciasPendentesContainer = document.getElementById('denuncias-pendentes-container');

    // Botões do Nav
    const btnNoticias = document.querySelector('.btn-bar:nth-child(1)');
    const btnDenuncias = document.querySelector('.btn-bar:nth-child(2)');

    let userRole = 'guest';

    // --- 1. LÓGICA DE PERFIL, ROLE E VISIBILIDADE DE BOTÕES ---
    function loadUserContext() {
        const userStored = localStorage.getItem('user');
        if (userStored) {
            try {
                const user = JSON.parse(userStored);
                userRole = user.role;
                const fullName = `${user.nome || ''} ${user.sobrenome || ''}`.trim();

                if (fullName) {
                    userNameElement.textContent = fullName;
                }

                // Usuário logado: Mostra botão de Nova Denúncia
                if (newDenunciaBtn) newDenunciaBtn.style.display = 'flex';

                // Admin: Mostra botão de Moderação
                if (userRole === 'admin') {
                    if (adminModeracaoBtn) adminModeracaoBtn.style.display = 'flex';
                }

            } catch (e) {
                console.error("Erro ao analisar o objeto do usuário:", e);
                localStorage.removeItem('user');
            }
        }
    }


    function createDenunciaCard(denuncia, isModerationView = false) {
        const urlBase = 'http://localhost:3005/';

        const imagePath = denuncia.caminho_imagem ? `${urlBase}${denuncia.caminho_imagem}` : '../pics/placeholder.png';

        const cardHtml = `
            <div class="denuncia-box">
                <div class="denuncia-card" data-denuncia-id="${denuncia.id}">
                    <img src="${imagePath}" alt="${denuncia.titulo}">
                    <b></b>
                    <div class="content">
                        <p class="title">Mais detalhes</p>
                        <ul class="sci">
                            <li class="btn-comentario"><i class="bi bi-chat-fill"></i></li>
                            </ul>
                    </div>
                </div>
                <div class="card-title-container">
                    <p class="card-title">${denuncia.titulo}</p>
                    <p class="card-subtitle">Por: ${denuncia.user_nome} ${denuncia.user_sobrenome}</p>
                    ${isModerationView ? `
                        <div class="moderacao-actions" data-id="${denuncia.id}">
                            <button class="btn-aprovar">Aprovar</button>
                            <button class="btn-rejeitar">Rejeitar</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        return cardHtml;
    }


    // --- 3. CARREGAR DENÚNCIAS APROVADAS (HOME) ---
    async function fetchApprovedDenuncias() {
        denunciasContainer.innerHTML = '<p style="margin: 20px;">Carregando denúncias...</p>';
        try {
            const response = await fetch('http://localhost:3005/denuncia/aprovadas');
            const result = await response.json();

            if (response.ok && result.success) {
                denunciasContainer.innerHTML = '';
                if (result.denuncias.length === 0) {
                    denunciasContainer.innerHTML = '<p style="margin: 20px;">Nenhuma denúncia aprovada ainda. Poste a sua!</p>';
                    return;
                }

                result.denuncias.forEach(denuncia => {
                    denunciasContainer.innerHTML += createDenunciaCard(denuncia, false);
                });

                attachDenunciaListeners(); // Adiciona ouvintes para os cliques nos cards

            } else {
                denunciasContainer.innerHTML = '<p style="margin: 20px; color: red;">Erro ao carregar denúncias.</p>';
            }
        } catch (error) {
            console.error("Erro ao buscar denúncias aprovadas:", error);
            denunciasContainer.innerHTML = '<p style="margin: 20px; color: red;">Erro de conexão com o servidor.</p>';
        }
    }

    // --- 4. LÓGICA DE MODERAÇÃO (ADMIN) ---

    // Função para atualizar o status da denúncia
    async function updateDenunciaStatus(denunciaId, status) {
        try {
            const response = await fetch(`http://localhost:3005/denuncia/moderacao/${denunciaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert(`Denúncia ${denunciaId} ${status} com sucesso!`);
                fetchPendingDenuncias(); // Recarrega a lista
            } else {
                alert(`Erro ao moderar denúncia: ${result.message}`);
            }
        } catch (error) {
            console.error("Erro na moderação:", error);
            alert("Erro de comunicação ao moderar denúncia.");
        }
    }

    // Função para carregar denúncias pendentes e mostrar no modal
    async function fetchPendingDenuncias() {
        if (userRole !== 'admin') return; // Segurança básica no front

        denunciasPendentesContainer.innerHTML = '<p>Carregando...</p>';
        try {
            const response = await fetch('http://localhost:3005/denuncia/pendentes');
            const result = await response.json();

            if (response.ok && result.success) {
                denunciasPendentesContainer.innerHTML = '';
                if (result.denuncias.length === 0) {
                    denunciasPendentesContainer.innerHTML = '<p style="margin: 20px;">Nenhuma denúncia pendente no momento.</p>';
                    return;
                }

                result.denuncias.forEach(denuncia => {
                    denunciasPendentesContainer.innerHTML += createDenunciaCard(denuncia, true);
                });

                // Adicionar Listeners de Aprovar/Rejeitar
                document.querySelectorAll('#denuncias-pendentes-container .moderacao-actions button').forEach(button => {
                    button.addEventListener('click', (e) => {
                        // Encontra o ID da denúncia
                        const denunciaId = e.target.closest('.moderacao-actions').dataset.id;
                        // Define o status baseado no botão clicado
                        const status = e.target.classList.contains('btn-aprovar') ? 'aprovada' : 'rejeitada';
                        updateDenunciaStatus(denunciaId, status);
                    });
                });

            } else {
                denunciasPendentesContainer.innerHTML = '<p style="margin: 20px; color: red;">Erro ao carregar denúncias pendentes.</p>';
            }
        } catch (error) {
            console.error("Erro ao buscar denúncias pendentes:", error);
            denunciasPendentesContainer.innerHTML = '<p style="margin: 20px; color: red;">Erro de conexão ao buscar pendentes.</p>';
        }
    }


    // --- 5. LISTENERS GERAIS E INICIALIZAÇÃO ---

    // Listener para o botão de Moderação (Admin)
    if (adminModeracaoBtn) {
        adminModeracaoBtn.addEventListener('click', () => {
            fetchPendingDenuncias(); // Carrega as pendentes
            moderacaoModal.style.display = 'block'; // Abre o modal
        });
    }

    // Fechar modal
    if (modalCloseBtn) {
        modalCloseBtn.onclick = function () {
            moderacaoModal.style.display = 'none';
        }
    }
    window.onclick = function (event) {
        if (event.target == moderacaoModal) {
            moderacaoModal.style.display = "none";
        }
    }

    const floatingAddButton = document.querySelector('.new-denuncia-btn');

    function updateFloatingButton(contentType) {
        if (!floatingAddButton) return;

        // Lê o role do usuário para decidir a visibilidade
        const userRole = JSON.parse(localStorage.getItem('user'))?.role;

        if (contentType === 'denuncias') {
            // Denúncias: Visível para todos (User e Admin)
            floatingAddButton.style.display = 'flex';
            // Link para a página de criação de denúncia
            floatingAddButton.href = '../novadenuncia/novadenuncia.html?type=denuncia';
            floatingAddButton.title = 'Adicionar Denúncia';
        } else if (contentType === 'noticias') {
            if (userRole === 'admin') {
                // Notícias: Visível APENAS para Admin
                floatingAddButton.style.display = 'flex';
                // Link para a página de criação de notícia
                floatingAddButton.href = '../novadenuncia/novadenuncia.html?type=noticia';
                floatingAddButton.title = 'Adicionar Notícia';
            } else {
                // User: Não aparece
                floatingAddButton.style.display = 'none';
            }
        } else {
            floatingAddButton.style.display = 'none';
        }
    }

    async function fetchNewsContent() {
        denunciasContainer.innerHTML = '<p style="margin: 20px;">Carregando notícias...</p>';
        try {
            const response = await fetch('http://localhost:3005/noticia/todas');
            const result = await response.json();

            if (response.ok && result.success) {
                denunciasContainer.innerHTML = '';
                if (result.noticias.length === 0) {
                    denunciasContainer.innerHTML = '<p style="margin: 20px;">Nenhuma notícia publicada ainda.</p>';
                    return;
                }

                // Reutilizando a estrutura do Card para Notícias (por enquanto)
                result.noticias.forEach(noticia => {
                    // Crie uma função específica se o layout da Notícia for muito diferente.
                    // Por enquanto, adaptamos a função de Denúncia
                    denunciasContainer.innerHTML += createDenunciaCard(noticia, false);
                });

                attachNewsListeners(); // Novo listener para Notícias

            } else {
                denunciasContainer.innerHTML = '<p style="margin: 20px; color: red;">Erro ao carregar notícias.</p>';
            }
        } catch (error) {
            console.error("Erro ao buscar notícias:", error);
            denunciasContainer.innerHTML = '<p style="margin: 20px; color: red;">Erro de conexão com o servidor ao buscar notícias.</p>';
        }
    }

    // fetchApprovedDenuncias();

    if (sectionTitle) {
        sectionTitle.textContent = 'Denúncias recentes';
        if (btnDenuncias) btnDenuncias.classList.add('selecionado');
        fetchApprovedDenuncias();
        updateFloatingButton('denuncias');
    }

    if (btnDenuncias) {
        btnDenuncias.addEventListener('click', () => {
            sectionTitle.textContent = 'Denúncias recentes';
            fetchApprovedDenuncias();
            updateFloatingButton('denuncias');
            btnNoticias.classList.remove('selecionado');
        });
    }

    if (btnNoticias) {
        btnNoticias.addEventListener('click', () => {
            sectionTitle.textContent = 'Notícias de Ecologia';
            fetchNewsContent();
            updateFloatingButton('noticias');
            btnNoticias.classList.add('selecionado');
            btnDenuncias.classList.remove('selecionado');
        });
    }

    function attachNewsListeners() {
        document.querySelectorAll('.denuncia-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Verifica se é uma Notícia (você precisará diferenciar isso se o card for o mesmo)
                // Por agora, vamos simular que qualquer card clicado na aba de notícias é uma Notícia
                const itemId = card.dataset.denunciaId;

                if (e.target.closest('.btn-comentario')) {
                    alert(`Notícias não possuem comentários. Por favor, clique no card para ver o conteúdo.`);
                    return;
                }

                // alert(`Redirecionando para Detalhes da Notícia ID: ${itemId} (Etapa 3)`);
                window.location.href = `/frontend/novadenuncia/detalhedenuncia/detalhedenuncia.html?id=${itemId}`;
            });
        });
    }

    // --- FUNÇÃO PARA PRÓXIMA ETAPA (Detalhes/Comentários) ---
    function attachDenunciaListeners() {
        document.querySelectorAll('.denuncia-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const denunciaId = card.dataset.denunciaId;

                // Se o clique for no ícone de comentário
                if (e.target.closest('.btn-comentario')) {
                    // Lógica para abrir comentários (Etapa 3)
                    alert(`Abrindo comentários da denúncia ID: ${denunciaId}. (Próxima Etapa: Detalhes/Comentários)`);
                    return;
                }

                // Clicou no card (detalhes)
                // Redireciona para a página de detalhes (que criaremos na próxima etapa)
                alert(`Redirecionando para Detalhes da Denúncia ID: ${denunciaId} (Próxima Etapa)`);
                window.location.href = `/frontend/novadenuncia/detalhedenuncia/detalhedenuncia.html?id=${denunciaId}`;
            });
        });
    }

    // Inicialização
    loadUserContext();

});
```

### `frontend/cadastro/cadastro.html`

Página de cadastro de novos usuários.

```html
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoAlert</title>
    <link rel="stylesheet" href="cadastro.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
</head>

<body>
    <header>
        <h1>EcoAlert</h1>
    </header>
    <main>
        <div class="card">
            <h2>Registrar-se</h2>
            <div class="form">
                <div class="name-div">
                    <div class="group">
                        <input id="nome" required="" type="text" class="input">
                        <span class="highlight"></span>
                        <span class="bar"></span>
                        <label>Nome:</label>
                    </div>
                    <div class="group">
                        <input id="sobrenome" required="" type="text" class="input">
                        <span class="highlight"></span>
                        <span class="bar"></span>
                        <label>Sobrenome:</label>
                    </div>
                </div>
                <div class="group">
                    <input id="email" required="" type="email" class="input">
                        <span class="highlight"></span>
                        <span class="bar"></span>
                        <label>E-mail:</label>
                </div>
                <div class="group">
                    <input id="senha" required="" type="text" class="input">
                    <span class="highlight"></span>
                    <span class="bar"></span>
                    <label>Senha:</label>
                </div>
                <div class="group">
                    <input id="confSenha" required="" type="text" class="input">
                    <span class="highlight"></span>
                    <span class="bar"></span>
                    <label>Confirmar senha:</label>
                </div>
                <button onclick="cadastrar(event)" class="button-cad">
                    <span class="button_top"> Cadastrar </span>
                </button>
            </div>
            <!-- <h3>Ou entre com o Google:</h3>
            <button class="google-button">
                <p>Entrar com o Google</p>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
            </button> -->
            <div class="link">
                <p>Já tem conta?</p>
                <a href="../login/login.html">Faça login</a>
            </div>
        </div>
    </main>

    <script src="cadastro.js"></script>
</body>

</html>
```

### `frontend/cadastro/cadastro.js`

Este arquivo contém a lógica para o formulário de cadastro, enviando os dados do novo usuário para o backend.

```javascript
async function cadastrar(event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const sobrenome = document.getElementById('sobrenome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (!nome || !sobrenome || !email || !senha) {
        alert("Todos os campos devem ser preenchidos!")
        return;
    }

    const data = {
        nome: nome,
        sobrenome: sobrenome,
        email: email,
        senha: senha
    };

    if (!confirmarSenha()) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3005/usuario/cadastrar', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            window.location.href = "/frontend/login/login.html"
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (error) {
        console.error('Erro durante o cadastro:', error);
        alert("Ocorreu um erro ao tentar realizar o cadastro.")
    }
}

function confirmarSenha() {
    const senha = document.getElementById('senha').value;
    const confSenha = document.getElementById('confSenha').value;

    if (senha === confSenha) {
        return true;
    } else {
        alert("As senhas não são compatíveis. Por favor, verifique e tente novamente.");
        return false;
    }
}
```

### `frontend/novadenuncia/novadenuncia.html`

Página para a criação de uma nova denúncia ou notícia.

```html
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoAlert</title>
    <link rel="stylesheet" href="novadenuncia.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
</head>

<body>
    <header>
        <h1>EcoAlert</h1>
        <div class="perfil">
            <p></p>
            <i class="bi bi-person-circle"></i>
        </div>
    </header>
    <main>
        <a href="../home/home.html">
            <div class="back-button">
                <button class="Btn">
                    <p>Voltar</p>
                    <i class="bi bi-arrow-left-short"></i>
                </button>
            </div>
        </a>

        <h2 id="page-title">Nova denúncia</h2>
        <div class="card">
            <div class="form">
                <div class="textInputWrapper titulo">
                    <input id="titulo" placeholder="Insira aqui o título" type="text" class="textInput">
                </div>
                <div class="textInputWrapper descricao">
                    <textarea id="descricao" placeholder="Descreva o que está acontecendo..."
                        class="textInput"></textarea>
                </div>

                <form class="file-upload-form">
                    <label for="imagem" class="file-upload-label">
                        <div class="file-upload-design">
                            <svg viewBox="0 0 640 512" height="1em">
                                <path
                                    d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2c9.4-1.7 19.2-2.2 29.2-2.2c77.3 0 139.9 61.9 140.4 139C610.2 368.8 559.9 417.3 502.3 431c.4 2.1 .7 4.1 .7 6c0 26.5-21.5 48-48 48H144z" />
                            </svg>
                            <p>Arraste e solte ou clique para selecionar uma imagem</p>
                        </div>
                        <input id="imagem" type="file" accept="image/*">
                    </label>
                </form>

                <div id="noticia-fields" style="width: 100%;">
                    <h3>Conteúdo da Notícia</h3>

                    <div class="tipo-conteudo-selector">
                        <label>Tipo de Conteúdo:</label>
                        <!-- <input type="radio" id="type-link" name="content-type" value="link" checked>
                        <label for="type-link">Link Externo</label>
                        <input type="radio" id="type-text" name="content-type" value="texto">
                        <label for="type-text">Conteúdo Próprio (Texto)</label> -->

                        <!-- From Uiverse.io by xbeat_5120 -->
                        <div class="uiverse-pixel-radio-group">
                            <label class="uiverse-pixel-radio">
                                <input type="radio" id="type-text" name="content-type" value="texto" checked="" />
                                <label for="type-text" class="label-text">Conteúdo Próprio (Texto)</label>
                            </label>
                            <label class="uiverse-pixel-radio">
                                <input type="radio" id="type-link" name="content-type" value="link" checked>
                                <label for="type-link" class="label-text">Link Externo</label>
                            </label>

                        </div>

                    </div>

                    <div class="textInputWrapper link-input">
                        <input id="conteudo-link" placeholder="URL da notícia (Ex: https://...)" type="url"
                            class="textInput">
                    </div>

                    <div class="textInputWrapper texto-input" style="display: none;">
                        <textarea id="conteudo-texto" placeholder="Cole ou digite o texto completo aqui..."
                            class="textInput"></textarea>
                    </div>
                </div>
                <div id="denuncia-fields" style="width: 100%;">
                    <div class="map-container">
                    </div>
                </div>

            </div>
            <button onclick="publishContent(event)" class="button-post"> <span id="publish-text" class="button_top">
                    Publicar Denúncia </span>
            </button>
        </div>
    </main>
    <script src="novadenuncia.js"></script>
</body>

</html>
```

### `frontend/novadenuncia/novadenuncia.js`

Este arquivo gerencia a lógica da página de criação de denúncias e notícias, adaptando a interface com base no tipo de conteúdo a ser criado.

```javascript
// novadenuncia.js (REESCRITO)

document.addEventListener('DOMContentLoaded', () => {

    const urlParams = new URLSearchParams(window.location.search);
    const contentType = urlParams.get('type'); // 'denuncia' ou 'noticia'

    // Elementos comuns
    const pageTitle = document.getElementById('page-title');
    const publishText = document.getElementById('publish-text');

    // Elementos de campos
    const noticiaFields = document.getElementById('noticia-fields');
    const denunciaFields = document.getElementById('denuncia-fields');
    const linkInput = document.getElementById('conteudo-link');
    const textInput = document.getElementById('conteudo-texto');
    const linkWrapper = document.querySelector('.link-input');
    const textWrapper = document.querySelector('.texto-input');

    // Carregar Contexto do Usuário (mantido)
    const userStored = localStorage.getItem('user');
    let userId = null;
    let userRole = 'guest';

    if (userStored) {
        try {
            const user = JSON.parse(userStored);
            userId = user.id;
            userRole = user.role;

            const fullName = `${user.nome || ''} ${user.sobrenome || ''}`.trim();
            const userNameElement = document.querySelector('.perfil p');
            if (userNameElement && fullName) {
                userNameElement.textContent = fullName;
            }
        } catch (e) {
            console.error("Erro ao analisar o objeto do usuário:", e);
            localStorage.removeItem('user');
            window.location.href = "/frontend/login/login.html";
        }
    } else {
        window.location.href = "/frontend/login/login.html";
    }

    // --- LÓGICA DE INTERFACE DINÂMICA ---
    if (contentType === 'noticia') {
        if (userRole !== 'admin') {
            alert('Acesso negado. Apenas administradores podem adicionar notícias.');
            window.location.href = "/frontend/home/home.html";
            return;
        }
        pageTitle.textContent = 'Nova Notícia';
        publishText.textContent = 'Publicar Notícia';
        denunciaFields.style.display = 'none';
        noticiaFields.style.display = 'block';

        // Listeners para alternar campos de Notícia
        document.querySelectorAll('input[name="content-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'link') {
                    linkWrapper.style.display = 'block';
                    textWrapper.style.display = 'none';
                    textInput.required = false;
                    linkInput.required = true;
                } else {
                    linkWrapper.style.display = 'none';
                    textWrapper.style.display = 'block';
                    linkInput.required = false;
                    textInput.required = true;
                }
            });
        });
        // Inicializa o campo link como requerido
        linkInput.required = true;

    } else if (contentType === 'denuncia') {
        pageTitle.textContent = 'Nova Denúncia';
        publishText.textContent = 'Publicar Denúncia';
        denunciaFields.style.display = 'block';
        noticiaFields.style.display = 'none';

    } else {
        alert('Tipo de conteúdo inválido. Redirecionando para Home.');
        window.location.href = "/frontend/home/home.html";
    }
});

// --- FUNÇÃO DE PUBLICAÇÃO CENTRALIZADA ---
async function publishContent(event) {
    event.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const contentType = urlParams.get('type');
    const userId = JSON.parse(localStorage.getItem('user'))?.id;

    if (!userId) {
        alert("Usuário não logado.");
        return;
    }

    // 1. Coleta de Dados Comuns
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const imagemFile = document.getElementById('imagem').files[0];

    if (!titulo || !descricao || !imagemFile) {
        alert("Título, descrição e imagem são obrigatórios!");
        return;
    }

    // Usaremos FormData para enviar arquivos e dados de texto juntos
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('titulo', titulo);
    formData.append('descricao', descricao);
    formData.append('imagem', imagemFile);

    let apiUrl = '';
    let successMessage = '';

    if (contentType === 'denuncia') {
        // Campos de Denúncia
        // Assumindo que você pegará lat/lon do mapa aqui
        // formData.append('localizacao_lat', localizacao_lat); 
        // formData.append('localizacao_lon', localizacao_lon);

        apiUrl = 'http://localhost:3005/denuncia/criar';
        successMessage = "Denúncia enviada! Aguarde a moderação.";
    }

    else if (contentType === 'noticia') {
        // Campos de Notícia
        const tipoConteudo = document.querySelector('input[name="content-type"]:checked').value;
        const conteudoLink = document.getElementById('conteudo-link').value;
        const conteudoTexto = document.getElementById('conteudo-texto').value;

        if (tipoConteudo === 'link' && !conteudoLink) {
            alert("A URL da notícia é obrigatória!");
            return;
        }
        if (tipoConteudo === 'texto' && !conteudoTexto) {
            alert("O conteúdo de texto próprio é obrigatório!");
            return;
        }

        formData.append('tipo_conteudo', tipoConteudo);
        formData.append('conteudo_link', tipoConteudo === 'link' ? conteudoLink : '');
        formData.append('conteudo_texto', tipoConteudo === 'texto' ? conteudoTexto : '');

        apiUrl = 'http://localhost:3005/noticia/criar';
        successMessage = "Notícia publicada com sucesso!";

    } else {
        alert("Erro: Tipo de conteúdo desconhecido.");
        return;
    }

    // 3. Envio da Requisição
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            // Não defina Content-Type para FormData, o browser faz isso corretamente
            body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(successMessage);
            window.location.href = "/frontend/home/home.html"; // Volta para a home
        } else {
            alert(`Erro ao publicar: ${result.message}`);
        }
    } catch (error) {
        console.error("Erro na comunicação:", error);
        alert("Erro ao tentar conectar com o servidor.");
    }
}
```
}
```
```
```
```
```


### `frontend/novadenuncia/detalhedenuncia/detalhedenuncia.html`

Página para exibir os detalhes de uma denúncia ou notícia específica.

```html
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">Detalhes da Notícia</title>
    <!-- <link rel="stylesheet" href="../home/home.css">  -->
    <link rel="stylesheet" href="detalhedenuncia.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
</head>

<body>
    <header>
        <h1>EcoAlert</h1>
        <div class="perfil">
            <p></p>
            <i class="bi bi-person-circle"></i>
        </div>
    </header>
    <main>
        <a href="../../home/home.html">
            <div class="back-button">
                <button class="Btn">
                    <p>Voltar</p>
                    <i class="bi bi-arrow-left-short"></i>
                </button>
            </div>
        </a>

        <section id="noticia-detalhes" class="card" >
            <h2 id="noticia-titulo">Carregando...</h2>
            <p id="noticia-autor"></p>
            <p id="noticia-data"></p>

            <img id="noticia-imagem"  alt="Imagem da notícia" style="width: 100%; max-width: 600px; height: auto; margin: 20px 0;">

            <p id="noticia-descricao-curta" style="font-style: italic; margin-bottom: 30px;"></p>

            <div id="noticia-conteudo-principal">
            </div>

        </section>

    </main>

    <script src="detalhedenuncia.js"></script>
</body>

</html>
```

## Arquivos CSS

O projeto utiliza arquivos CSS para estilizar as páginas do frontend. Cada página possui seu próprio arquivo CSS correspondente:

- **`frontend/login/login.css`**: Estilos da página de login
- **`frontend/cadastro/cadastro.css`**: Estilos da página de cadastro
- **`frontend/home/home.css`**: Estilos da página principal
- **`frontend/novadenuncia/novadenuncia.css`**: Estilos da página de criação de denúncias/notícias
- **`frontend/novadenuncia/detalhedenuncia/detalhedenuncia.css`**: Estilos da página de detalhes

## Fontes Customizadas

O projeto inclui fontes customizadas da família **Cocogoose Pro** na pasta `frontend/fonts/`:

- `Cocogoose-Pro-Darkmode-trial.ttf`
- `Cocogoose-Pro-Light-trial.ttf`
- `Cocogoose-Pro-Thin-trial.ttf`

## Pasta de Uploads

A pasta `backend/uploads/` armazena as imagens enviadas pelos usuários ao criar denúncias e notícias. As imagens são salvas com um timestamp único para evitar conflitos de nomes.

## Tecnologias Utilizadas

### Backend

- **Node.js** com **Express.js**: Framework para criação do servidor e rotas da API
- **MySQL2**: Biblioteca para conexão e consultas ao banco de dados MySQL
- **Multer**: Middleware para upload de arquivos (imagens)
- **CORS**: Middleware para permitir requisições de diferentes origens
- **Socket.IO**: Biblioteca para comunicação em tempo real (chat de comentários)
- **Nodemon**: Ferramenta para reiniciar automaticamente o servidor durante o desenvolvimento

### Frontend

- **HTML5**: Estrutura das páginas
- **CSS3**: Estilização e layout responsivo
- **JavaScript (ES6+)**: Lógica de interação do usuário
- **Bootstrap Icons**: Biblioteca de ícones
- **Fetch API**: Para requisições HTTP ao backend

### Banco de Dados

- **MySQL**: Sistema de gerenciamento de banco de dados relacional

## Funcionalidades Principais

### Sistema de Autenticação

O projeto possui um sistema completo de cadastro e login de usuários, com armazenamento de credenciais no banco de dados MySQL. As senhas são armazenadas em texto plano (recomenda-se implementar hash de senha em produção).

### Gerenciamento de Denúncias

Os usuários podem criar denúncias ambientais com título, descrição e imagem. As denúncias passam por um processo de moderação antes de serem exibidas publicamente. Administradores podem aprovar ou rejeitar denúncias pendentes através de um painel de moderação.

### Sistema de Notícias

Administradores podem criar notícias relacionadas à ecologia, com opção de incluir um link externo ou conteúdo de texto próprio. As notícias são exibidas na página principal junto com as denúncias.

### Chat em Tempo Real

O projeto utiliza Socket.IO para implementar um sistema de comentários em tempo real nas denúncias, permitindo que os usuários discutam e compartilhem informações sobre os problemas ambientais reportados.

### Moderação de Conteúdo

Usuários com perfil de administrador têm acesso a um painel de moderação onde podem visualizar denúncias pendentes e decidir se devem ser aprovadas ou rejeitadas.

## Estrutura do Banco de Dados

O banco de dados `EcoAlertDB` contém as seguintes tabelas principais:

### Tabela `users`

Armazena informações dos usuários cadastrados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK, AUTO_INCREMENT) | Identificador único do usuário |
| `nome` | VARCHAR(255) | Nome do usuário |
| `sobrenome` | VARCHAR(255) | Sobrenome do usuário |
| `email` | VARCHAR(255) UNIQUE | E-mail do usuário (único) |
| `senha` | VARCHAR(255) | Senha do usuário |
| `role` | VARCHAR(50) | Papel do usuário (user/admin) |
| `created_at` | TIMESTAMP | Data de criação do registro |

### Tabela `denuncias`

Armazena as denúncias criadas pelos usuários.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK, AUTO_INCREMENT) | Identificador único da denúncia |
| `user_id` | INT (FK) | ID do usuário que criou a denúncia |
| `titulo` | VARCHAR(255) | Título da denúncia |
| `descricao` | TEXT | Descrição detalhada da denúncia |
| `caminho_imagem` | VARCHAR(500) | Caminho da imagem anexada |
| `localizacao_lat` | DECIMAL | Latitude da localização (opcional) |
| `localizacao_lon` | DECIMAL | Longitude da localização (opcional) |
| `status` | VARCHAR(50) | Status da denúncia (pendente/aprovada/rejeitada) |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela `noticias`

Armazena as notícias criadas por administradores.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK, AUTO_INCREMENT) | Identificador único da notícia |
| `user_id` | INT (FK) | ID do administrador que criou a notícia |
| `titulo` | VARCHAR(255) | Título da notícia |
| `descricao` | TEXT | Descrição breve da notícia |
| `caminho_imagem` | VARCHAR(500) | Caminho da imagem de capa |
| `tipo_conteudo` | VARCHAR(50) | Tipo de conteúdo (link/texto) |
| `conteudo_link` | VARCHAR(500) | URL externa (se tipo_conteudo = link) |
| `conteudo_texto` | TEXT | Conteúdo completo (se tipo_conteudo = texto) |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela `comentarios`

Armazena os comentários feitos nas denúncias.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT (PK, AUTO_INCREMENT) | Identificador único do comentário |
| `denuncia_id` | INT (FK) | ID da denúncia comentada |
| `user_id` | INT (FK) | ID do usuário que comentou |
| `conteudo` | TEXT | Conteúdo do comentário |
| `created_at` | TIMESTAMP | Data de criação |

## Rotas da API

### Autenticação

- **POST** `/usuario/cadastrar`: Cadastra um novo usuário
- **POST** `/usuario/logar`: Realiza login de um usuário

### Denúncias

- **POST** `/denuncia/criar`: Cria uma nova denúncia (requer autenticação)
- **GET** `/denuncia/aprovadas`: Lista todas as denúncias aprovadas
- **GET** `/denuncia/pendentes`: Lista denúncias pendentes de moderação (admin)
- **GET** `/denuncia/detalhe/:id`: Busca detalhes de uma denúncia específica
- **PUT** `/denuncia/moderacao/:id`: Aprova ou rejeita uma denúncia (admin)

### Notícias

- **POST** `/noticia/criar`: Cria uma nova notícia (admin)
- **GET** `/noticia/todas`: Lista todas as notícias publicadas
- **GET** `/noticia/detalhe/:id`: Busca detalhes de uma notícia específica

## Como Executar o Projeto

### Pré-requisitos

- **Node.js** (versão 14 ou superior)
- **MySQL** (versão 5.7 ou superior)
- **npm** ou **yarn**

### Configuração do Banco de Dados

Execute o script SQL localizado em `db.sql` para criar o banco de dados e as tabelas necessárias. Certifique-se de atualizar as credenciais de conexão no arquivo `backend/src/server.js`:

```javascript
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'seu_usuario',
    password: 'sua_senha',
    database: 'ecoalertdb'
});
```

### Instalação das Dependências

Navegue até a pasta `backend` e instale as dependências do Node.js:

```bash
cd backend
npm install
```

### Execução do Backend

Inicie o servidor backend com o comando:

```bash
npm start
```

O servidor estará rodando na porta **3005**.

### Execução do Frontend

Abra o arquivo `frontend/login/login.html` em um navegador web ou utilize o **Live Server** do VS Code para servir os arquivos estáticos. Certifique-se de que a porta configurada no `.vscode/settings.json` (5501) esteja disponível.

## Melhorias Futuras

- Implementar **hash de senhas** utilizando bcrypt para maior segurança
- Adicionar **validação de e-mail** durante o cadastro
- Implementar **recuperação de senha**
- Adicionar **geolocalização** real nas denúncias usando APIs de mapas
- Implementar **paginação** nas listagens de denúncias e notícias
- Adicionar **filtros e busca** para facilitar a navegação
- Implementar **notificações em tempo real** para novos comentários
- Adicionar **testes automatizados** para backend e frontend
- Implementar **CI/CD** para deploy automatizado
- Adicionar **sistema de curtidas** e **compartilhamento** de denúncias

## Licença

Este projeto é de código aberto e está disponível sob a licença especificada pelo autor.
