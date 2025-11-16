use ecoalertdb;

CREATE TABLE
    users (
        id int NOT NULL AUTO_INCREMENT,
        nome varchar(255) NOT NULL,
        sobrenome varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        senha varchar(255) NOT NULL,
        role enum ('user', 'admin') NOT NULL DEFAULT 'user',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY email (email)
    );

CREATE TABLE
    noticias (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL,
        titulo varchar(255) NOT NULL,
        descricao text NOT NULL,
        caminho_imagem varchar(255) NOT NULL,
        status enum ('pendente', 'aprovada', 'rejeitada') NOT NULL DEFAULT 'aprovada',
        tipo_conteudo enum ('link', 'texto') NOT NULL,
        conteudo_link varchar(2048) DEFAULT NULL,
        conteudo_texto longtext,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY idx_titulo_noticia (titulo),
        CONSTRAINT noticias_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

CREATE TABLE
    denuncias (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL,
        titulo varchar(255) NOT NULL,
        descricao text NOT NULL,
        tipo_conteudo enum ('link', 'texto') NOT NULL,
        conteudo_link varchar(2048) DEFAULT NULL,
        conteudo_texto longtext,
        localizacao_lat decimal(10, 8) DEFAULT NULL,
        localizacao_lon decimal(11, 8) DEFAULT NULL,
        caminho_imagem varchar(255) DEFAULT NULL,
        status enum ('pendente', 'aprovada', 'rejeitada') NOT NULL DEFAULT 'pendente',
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        CONSTRAINT denuncias_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
