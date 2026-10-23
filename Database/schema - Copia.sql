CREATE DATABASE db_QuadraSync;
USE db_QuadraSync;

CREATE TABLE usuario (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('aluno', 'organizador', 'administrador') NOT NULL,
    curso VARCHAR(50) NOT NULL,
    turma VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE agenda_quadra (
    id_agenda INT PRIMARY KEY AUTO_INCREMENT,
    data_utilizacao DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    CHECK (hora_inicio < hora_fim),
    tipo ENUM('reserva', 'jogo', 'evento') NOT NULL,
    status ENUM('agendada', 'cancelada', 'concluida') NOT NULL
);

CREATE TABLE reserva (
    id_reserva INT PRIMARY KEY AUTO_INCREMENT,
    id_agenda INT NOT NULL,
    id_usuario INT NOT NULL,
    modalidade ENUM('futsal', 'volei', 'basquete') NOT NULL,
    quantidade_pessoas INT NOT NULL,
    finalidade VARCHAR(100) NOT NULL,
    observacao TEXT,
    FOREIGN KEY (id_agenda) REFERENCES agenda_quadra(id_agenda),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CHECK (quantidade_pessoas > 0)
);

CREATE TABLE evento (
    id_evento INT PRIMARY KEY AUTO_INCREMENT,
    id_agenda INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo_evento ENUM('reforma', 'manutencao', 'palestra', 'outro') NOT NULL,
    FOREIGN KEY (id_agenda) REFERENCES agenda_quadra(id_agenda)
);

CREATE TABLE campeonato (
    id_campeonato INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    modalidade ENUM('futsal', 'volei', 'basquete') NOT NULL,
    categoria ENUM('feminino', 'masculino', 'misto') NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    CHECK (
        data_fim IS NULL
        OR data_fim >= data_inicio
    ),
    status ENUM('planejado', 'andamento', 'encerrado') NOT NULL
);

CREATE TABLE equipe (
    id_equipe INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE campeonato_equipe (
    id_campeonato INT NOT NULL,
    id_equipe INT NOT NULL,
    PRIMARY KEY (id_campeonato, id_equipe),
    FOREIGN KEY (id_campeonato) REFERENCES campeonato(id_campeonato),
    FOREIGN KEY (id_equipe) REFERENCES equipe(id_equipe)
);

CREATE TABLE jogo (
    id_jogo INT PRIMARY KEY AUTO_INCREMENT,
    id_agenda INT NOT NULL,
    id_campeonato INT NOT NULL,
    id_equipe1 INT NOT NULL,
    id_equipe2 INT NOT NULL,
    fase VARCHAR(50) NOT NULL,
    placar_equipe1 INT,
    placar_equipe2 INT,
    status ENUM(
        'agendado',
        'adiado',
        'em_andamento',
        'finalizado',
        'cancelado'
    ) NOT NULL,
    CHECK (id_equipe1 <> id_equipe2),
    FOREIGN KEY (id_agenda) REFERENCES agenda_quadra(id_agenda),
    FOREIGN KEY (id_campeonato) REFERENCES campeonato(id_campeonato),
    FOREIGN KEY (id_equipe1) REFERENCES equipe(id_equipe),
    FOREIGN KEY (id_equipe2) REFERENCES equipe(id_equipe)
);

CREATE TABLE notificacao (
    id_notificacao INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    data_envio DATETIME NOT NULL,
    visualizada BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

SHOW TABLES;