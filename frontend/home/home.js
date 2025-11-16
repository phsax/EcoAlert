document.addEventListener('DOMContentLoaded', () => {

    const userNameElement = document.querySelector('.perfil p');
    const newDenunciaBtn = document.querySelector('.new-denuncia-btn');
    const adminModeracaoBtn = document.querySelector('.admin-moderacao-btn');
    const denunciasContainer = document.getElementById('denuncias-container');
    const sectionTitle = document.getElementById('section-title');

    const moderacaoModal = document.getElementById('moderacao-modal');
    const modalCloseBtn = document.querySelector('.modal-content .close-btn');
    const denunciasPendentesContainer = document.getElementById('denuncias-pendentes-container');

    const btnNoticias = document.querySelector('.btn-bar:nth-child(1)');
    const btnDenuncias = document.querySelector('.btn-bar:nth-child(2)');

    let userRole = 'guest';

    function loadUserContext() {
        const userStored = localStorage.getItem('user');
        if (userStored) {
            try {
                const user = JSON.parse(userStored);
                userRole = user.role;
                const fullName = `${user.nome || ''} ${user.sobrenome || ''}`.trim();

                if (userNameElement && fullName) {
                    userNameElement.textContent = fullName;
                }

                if (userRole === 'admin') {
                    adminModeracaoBtn.style.display = 'flex'; 
                    newDenunciaBtn.style.display = 'flex';
                }
            } catch (e) {
                console.error("Erro ao analisar o objeto do usuário do localStorage:", e);
                localStorage.removeItem('user');
                userRole = 'guest';
            }
        }
    }

    function createCardHTML(item, isNoticia) {
        const imagePath = item.caminho_imagem ? `http://localhost:3005/${item.caminho_imagem}` : '';
        
        const cardType = isNoticia ? 'noticia' : 'denuncia';
        const cardClass = isNoticia ? 'noticia-card' : 'denuncia-card';
        const titleText = item.titulo || 'Sem Título';
        
        const denunciaElements = isNoticia ? '' : `
        `;
        
        return `
        <div class="denuncia-box">
        <div class="${cardClass}" data-${cardType}-id="${item.id}" style="cursor: pointer;">
        <img src="${imagePath}" alt="${titleText}">
        <b></b>
        <div class="content">
        <p class="title">Mais detalhes ${isNoticia}</p>
        <ul class="sci">
        ${denunciaElements}
        </ul>
        </div>
        </div>
        <div class="card-title-container">
        <p class="card-title">${titleText}</p>
        </div>
        </div>
        `;
    }
    
    async function loadContent(contentType) {
        let apiUrl = '';
        let title = '';
        
        if (contentType === 'noticias') {
            apiUrl = 'http://localhost:3005/noticia/todas';
            title = 'Notícias Recentes';
            // createCardHTML(item, true)
        } else if (contentType === 'denuncias') {
            apiUrl = 'http://localhost:3005/denuncia/aprovadas';
            title = 'Denúncias Recentes';
        } else {
            return;
        }

        denunciasContainer.innerHTML = ''; 
        sectionTitle.textContent = title;
        toggleNavButton(contentType); 


        const isNoticia = '';

        try {
            const response = await fetch(apiUrl);
            const result = await response.json();

            if (response.ok && result.success) {
                if (contentType === 'denuncias') {
                    if (result.denuncias.length > 0) {
                        result.denuncias.forEach(item => {
                            const isNoticia = contentType === 'noticias';
                            denunciasContainer.innerHTML += createCardHTML(item, isNoticia);
                        });
                        if (isNoticia) {
                            attachNoticiaListeners();
                        } else {
                            attachDenunciaListeners();
                        }
                    } else {
                        denunciasContainer.innerHTML = `<p style="text-align: center; width: 100%; color: var(--cor-verde-cinza); margin-top: 50px;">Nenhum conteúdo ${title.toLowerCase()} encontrado no momento.</p>`;
                    }
                } else {
                    if (result.noticias.length > 0) {
                        result.noticias.forEach(item => {
                            // const isNoticia = true;
                            const isNoticia = contentType === 'noticias';
                            denunciasContainer.innerHTML += createCardHTML(item, isNoticia);
                        });
                        const isNoticia = contentType === 'noticias';
                        console.log(isNoticia)
                        if (isNoticia) {
                            attachNoticiaListeners();
                            console.log("carregando noticias")
                        } else {
                            attachDenunciaListeners();
                        }
                    } else {
                        denunciasContainer.innerHTML = `<p style="text-align: center; width: 100%; color: var(--cor-verde-cinza); margin-top: 50px;">Nenhum conteúdo ${title.toLowerCase()} encontrado no momento.</p>`;
                    }

                }
            } else {
                denunciasContainer.innerHTML = `<p style="text-align: center; width: 100%; color: red; margin-top: 50px;">Erro ao carregar o conteúdo: ${result.message || 'Erro desconhecido'}</p>`;
            }
        } catch (error) {
            console.error(`Erro ao carregar ${contentType}:`, error);
            denunciasContainer.innerHTML = `<p style="text-align: center; width: 100%; color: red; margin-top: 50px;">Erro de conexão com o servidor.</p>`;
        }
    }


    function toggleNavButton(contentType) {

        const userStored = localStorage.getItem('user');
        const user = JSON.parse(userStored);


        if (contentType === 'noticias') {
            btnNoticias.classList.add('selecionado');
            btnDenuncias.classList.remove('selecionado');
            if (user.role === 'user') {
                newDenunciaBtn.style.display = 'none'; 
            }

            } else if (contentType === 'denuncias') {
                btnDenuncias.classList.add('selecionado');
                btnNoticias.classList.remove('selecionado');
                if (user.role === 'user') {
                    newDenunciaBtn.style.display = 'flex';
                }
            }
        }

        btnNoticias.addEventListener('click', () => {
            loadContent('noticias');
        });

        btnDenuncias.addEventListener('click', () => {
            loadContent('denuncias');
        });

        newDenunciaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (userRole === 'admin') {
                const choice = prompt("O que você deseja publicar? Digite 'denuncia' ou 'noticia':").toLowerCase();
                if (choice === 'denuncia' || choice === 'noticia') {
                    window.location.href = `/frontend/novadenuncia/novadenuncia.html?type=${choice}`;
                } else {
                    alert("Opção inválida.");
                }
            } else {
                window.location.href = `/frontend/novadenuncia/novadenuncia.html?type=denuncia`;
            }
        });

        function attachNoticiaListeners() {
            document.querySelectorAll('.noticia-card').forEach(card => {
                console.log("noticia")
                card.addEventListener('click', (e) => {
                    const itemId = card.dataset.noticiaId;

                    if (e.target.closest('.btn-comentario')) {
                        alert(`Notícias não possuem comentários. Por favor, clique no card para ver o conteúdo.`);
                        return;
                    }

                    window.location.href = `/frontend/novadenuncia/detalhedenuncia/detalhedenuncia.html?id=${itemId}&type=noticia`;
                });
            });
        }

        function attachDenunciaListeners() {
            document.querySelectorAll('.denuncia-card').forEach(card => {
                console.log("denunciaaa")
                card.addEventListener('click', (e) => {
                    const denunciaId = card.dataset.denunciaId;

                    if (e.target.closest('.btn-comentario')) {
                        alert(`Abrindo comentários da denúncia ID: ${denunciaId}.`);
                        return;
                    }

                    window.location.href = `/frontend/novadenuncia/detalhedenuncia/detalhedenuncia.html?id=${denunciaId}&type=denuncia`;
                });
            });
        }

        adminModeracaoBtn.addEventListener('click', async () => {
            await loadDenunciasPendentes();
            moderacaoModal.style.display = 'block';
        });

        modalCloseBtn.addEventListener('click', () => {
            moderacaoModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target == moderacaoModal) {
                moderacaoModal.style.display = 'none';
            }
        });

        async function loadDenunciasPendentes() {
            denunciasPendentesContainer.innerHTML = 'Carregando denúncias pendentes...';

            try {
                const response = await fetch('http://localhost:3005/denuncia/pendentes');
                const result = await response.json();

                // console.log(result.denuncias.length)

                if (response.ok && result.success) {
                    if (result.denuncias.length > 0) {
                        denunciasPendentesContainer.innerHTML = ''; 

                        result.denuncias.forEach(denuncia => {
                            const itemHtml = `
                            <div class="moderacao-item" data-denuncia-id="${denuncia.id}" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                                <h4>${denuncia.titulo}</h4>
                                <p style="font-size: 0.9em;">**Autor:** ${denuncia.user_nome} ${denuncia.user_sobrenome}</p>
                                <p style="font-size: 0.9em; margin-bottom: 10px;">**Data:** ${new Date(denuncia.created_at).toLocaleDateString('pt-BR')}</p>
                                <button class="btn-moderar btn-aprovar" data-id="${denuncia.id}" style="background-color: #618b68; color: white; border: none; padding: 5px 10px; margin-right: 10px; cursor: pointer; border-radius: 3px;">Aprovar</button>
                                <button class="btn-moderar btn-rejeitar" data-id="${denuncia.id}" style="background-color: #d9534f; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;">Rejeitar</button>
                            </div>
                        `;
                            denunciasPendentesContainer.innerHTML += itemHtml;
                        });
                        attachModeracaoListeners();
                    } else {
                        denunciasPendentesContainer.innerHTML = '<p>Não há denúncias pendentes de moderação.</p>';
                    }
                } else {
                    denunciasPendentesContainer.innerHTML = `<p style="color: red;">Erro ao carregar denúncias: ${result.message || 'Erro desconhecido'}</p>`;
                }
            } catch (error) {
                console.error('Erro ao buscar denúncias pendentes:', error);
                denunciasPendentesContainer.innerHTML = '<p style="color: red;">Erro de conexão com o servidor.</p>';
            }
        }

        function attachModeracaoListeners() {
            document.querySelectorAll('.btn-moderar').forEach(button => {
                button.addEventListener('click', (e) => {
                    const denunciaId = e.target.dataset.id;
                    const status = e.target.classList.contains('btn-aprovar') ? 'aprovada' : 'rejeitada';
                    handleModeration(denunciaId, status);
                });
            });
        }

        async function handleModeration(denunciaId, status) {
            const payload = {
                status: status
            };

            try {
                const response = await fetch(`http://localhost:3005/denuncia/moderacao/${denunciaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(`Denúncia ID ${denunciaId} ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} com sucesso.`);
                    await loadDenunciasPendentes();
                    loadContent('denuncias');

                    if (denunciasPendentesContainer.children.length === 0) {
                        moderacaoModal.style.display = 'none';
                    }

                } else {
                    alert(`Erro ao moderar denúncia: ${result.message}`);
                }

            } catch (error) {
                console.error('Erro de conexão ao moderar:', error);
                alert('Erro ao tentar conectar com o servidor para moderação.');
            }
        }

        loadUserContext();
        loadContent('noticias');
    });