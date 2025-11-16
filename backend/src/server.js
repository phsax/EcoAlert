const mysql = require('mysql2');
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require('path');
const fs = require('fs');
const http = require('http');
// const { Server } = require("socket.io");

const port = 3005;
const app = express();
// const server = http.createServer(app);
app.use('/uploads', express.static('uploads'));

// const io = new Server(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });

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
    password: 'root',
    database: 'ecoalertdb'
});

connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectou db');
    }
});

app.listen(port, () => console.log(`Servidor rodando na porta: ${port}`));


// io.on('connection', (socket) => {
//     console.log('Novo usuário conectado:', socket.id);

//     socket.on('join_denuncia_room', (denunciaId) => {
//         socket.join(denunciaId);
//         console.log(`Usuário ${socket.id} entrou na sala: ${denunciaId}`);
//     });

//     socket.on('send_message', async (data) => {

//         const query = `INSERT INTO comentarios (denuncia_id, user_id, conteudo) VALUES (?, ?, ?);`;
//         connection.query(query, [data.denunciaId, data.userId, data.conteudo], (err, results) => {
//             if (err) {
//                 console.error('Erro ao salvar comentário:', err);
//                 return;
//             }

//             const newComment = {
//                 ...data,
//                 created_at: new Date().toISOString(),
//                 id: results.insertId
//             };

//             socket.to(data.denunciaId).emit('receive_message', newComment);
//             console.log(`Comentário enviado na sala ${data.denunciaId}: ${data.conteudo}`);
//         });
//     });

//     socket.on('disconnect', () => {
//         console.log('Usuário desconectado:', socket.id);
//     });
// });

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

app.put('/user/perfil/:id', (request, response) => {
    const userId = request.params.id;
    const { nome, sobrenome, email, senha_atual, nova_senha } = request.body;

    if (email) {
        connection.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
            if (err) {
                console.error('Erro ao verificar email duplicado:', err);
                return response.status(500).json({ success: false, message: "Erro interno do servidor." });
            }
            if (results.length > 0) {
                return response.status(400).json({ success: false, message: "Este e-mail já está cadastrado em outra conta." });
            }
            if (email && updateFields.length === 0) { }
        });
    }

    let updateFields = [];
    let updateValues = [];

    if (nome) { updateFields.push('nome = ?'); updateValues.push(nome); }
    if (sobrenome) { updateFields.push('sobrenome = ?'); updateValues.push(sobrenome); }
    if (email) { updateFields.push('email = ?'); updateValues.push(email); }

    if (nova_senha) {
        connection.query('SELECT senha FROM users WHERE id = ?', [userId], (err, results) => {
            if (err || results.length === 0) {
                console.error('Erro ao buscar senha antiga:', err);
                return response.status(500).json({ success: false, message: "Erro ao buscar dados do usuário." });
            }
            const senhaAntigaSalva = results[0].senha;

            if (senha_atual !== senhaAntigaSalva) {
                return response.status(401).json({ success: false, message: "Senha atual incorreta." });
            }

            updateFields.push('senha = ?');
            updateValues.push(nova_senha);

            if (updateFields.length === 0) {
                return response.status(400).json({ success: false, message: "Nenhum campo para atualizar." });
            }

            const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            updateValues.push(userId);

            connection.query(updateQuery, updateValues, (err, updateResult) => {
                if (err) {
                    console.error('Erro ao atualizar perfil (com senha):', err);
                    return response.status(500).json({ success: false, message: "Erro interno ao atualizar perfil." });
                }

                response.status(200).json({
                    success: true,
                    message: "Perfil e senha atualizados com sucesso. Faça login novamente.",
                    relogin_required: true
                });
            });
        });
    } else {
        if (updateFields.length === 0) {
            return response.status(400).json({ success: false, message: "Nenhum campo para atualizar." });
        }

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(userId);

        connection.query(updateQuery, updateValues, (err, updateResult) => {
            if (err) {
                console.error('Erro ao atualizar perfil (sem senha):', err);
                return response.status(500).json({ success: false, message: "Erro interno ao atualizar perfil." });
            }

            connection.query('SELECT id, nome, sobrenome, email, role FROM users WHERE id = ?', [userId], (err, newUserData) => {
                if (err || newUserData.length === 0) {
                    return response.status(200).json({ success: true, message: "Perfil atualizado com sucesso (dados não carregados).", relogin_required: false });
                }

                response.status(200).json({
                    success: true,
                    message: "Perfil atualizado com sucesso!",
                    new_user_data: newUserData[0],
                    relogin_required: false
                });
            });
        });
    }
});

app.post('/denuncia/criar/adm', upload.single('imagem'), async (request, response) => {
    const { userId, titulo, descricao, tipo_conteudo, conteudo_link, conteudo_texto, localizacao_lat, localizacao_lon } = request.body;
    const caminho_imagem = request.file ? request.file.path : null;

    const status = 'aprovada';

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
                (user_id, titulo, descricao, tipo_conteudo, conteudo_link, conteudo_texto, localizacao_lat, localizacao_lon, caminho_imagem, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

    const values = [
        userId,
        titulo,
        descricao,
        tipo_conteudo,
        conteudo_link,
        conteudo_texto,
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

app.post('/denuncia/criar/user', upload.single('imagem'), async (request, response) => {
    const { userId, titulo, descricao, tipo_conteudo, conteudo_link, conteudo_texto, localizacao_lat, localizacao_lon } = request.body;
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
                (user_id, titulo, descricao, tipo_conteudo, conteudo_link, conteudo_texto, localizacao_lat, localizacao_lon, caminho_imagem, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

    const values = [
        userId,
        titulo,
        descricao,
        tipo_conteudo,
        conteudo_link,
        conteudo_texto,
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

    const query = `
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


// ---Buscar Todas as Notícias---
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

    const denunciaQuery = `
        SELECT 
            d.id, d.titulo, d.descricao, d.tipo_conteudo, d.conteudo_link, d.conteudo_texto, d.caminho_imagem, d.created_at, d.status, 
            u.nome as user_nome, u.sobrenome as user_sobrenome
        FROM denuncias d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ? AND d.status = 'aprovada';
    `;

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